import type { Ref } from "vue";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { $emit } from "@/stores/events/index";
import {
  calculateNextExecutionTime,
  formatTimeDifference,
  matchesCronExpression,
} from "@/utils/batch";
import type { BatchLogEntry, BatchSettings } from "@/utils/batch/types";

interface ScheduledTask extends Record<string, any> {
  cronExpression?: string;
  enabled: boolean;
  id: string;
  name: string;
  runTime?: string;
  runType?: string;
}

interface SchedulerOptions {
  addLog: (entry: BatchLogEntry) => void;
  batchSettings: BatchSettings;
  executeScheduledTask: (task: ScheduledTask) => Promise<void> | void;
  isRunning: Ref<boolean>;
  scheduledTasks: Ref<ScheduledTask[]>;
}

export const useBatchScheduler = ({
  addLog,
  batchSettings,
  executeScheduledTask,
  isRunning,
  scheduledTasks,
}: SchedulerOptions) => {
  const taskCountdowns = ref<Record<string, {
    formatted: string;
    isNearExecution: boolean;
    remainingTime: number;
  }>>({});
  const nextExecutionTimes = ref<Record<string, number>>({});
  const intervalId = ref<ReturnType<typeof setInterval> | null>(null);
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  let lastTaskExecution: number | null = null;
  const pageLoadTime = Date.now();

  const updateCountdowns = () => {
    const now = Date.now();

    scheduledTasks.value.forEach((task) => {
      if (!task.enabled) {
        delete taskCountdowns.value[task.id];
        return;
      }

      if (
        !nextExecutionTimes.value[task.id]
        || nextExecutionTimes.value[task.id] <= now
      ) {
        nextExecutionTimes.value[task.id] = calculateNextExecutionTime(task);
      }

      if (nextExecutionTimes.value[task.id]) {
        const timeDiff = nextExecutionTimes.value[task.id] - now;
        const remainingTime = Math.max(0, timeDiff);
        taskCountdowns.value[task.id] = {
          remainingTime,
          formatted: formatTimeDifference(remainingTime),
          isNearExecution: timeDiff < 5 * 60 * 1000,
        };
      }
    });
  };

  const startCountdown = () => {
    if (countdownInterval)
      clearInterval(countdownInterval);
    updateCountdowns();
    countdownInterval = setInterval(updateCountdowns, 1000);
  };

  const startScheduler = () => {
    if (intervalId.value)
      clearInterval(intervalId.value);

    intervalId.value = setInterval(() => {
      try {
        const now = new Date();
        const currentTime = now.toLocaleTimeString("zh-CN", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const tasksToRun = scheduledTasks.value.filter((task) => task.enabled);

        tasksToRun.forEach((task) => {
          let shouldRun = false;
          if (task.runType === "daily") {
            const nowTime = now.toLocaleTimeString("zh-CN", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            });
            shouldRun = nowTime === task.runTime;
          } else if (task.runType === "cron") {
            try {
              shouldRun = matchesCronExpression(task.cronExpression, now);
            } catch (error) {
              const reason = error instanceof Error ? error.message : String(error);
              console.error(
                `[${new Date().toISOString()}] Error parsing cron expression ${task.cronExpression}:`,
                error,
              );
              addLog({
                time: currentTime,
                message: `=== 解析定时任务 ${task.name} 的Cron表达式失败: ${reason} ===`,
                type: "error",
              });
              return;
            }
          }

          if (!shouldRun)
            return;

          const taskExecutionKey = `${task.id}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;
          const storageKey = `lastTaskExecution_${task.id}`;
          if (localStorage.getItem(storageKey) === taskExecutionKey)
            return;

          localStorage.setItem(storageKey, taskExecutionKey);
          lastTaskExecution = Date.now();
          void executeScheduledTask(task);
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error(`[${new Date().toISOString()}] Error in task scheduler:`, error);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 定时任务调度服务发生错误: ${reason} ===`,
          type: "error",
        });
      }
    }, 10000);
  };

  const healthCheck = () => {
    if (!intervalId.value) {
      console.error(
        `[${new Date().toISOString()}] Task scheduler interval is not running, restarting...`,
      );
      startScheduler();
    }

    if (isRunning.value) {
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      if (lastTaskExecution && lastTaskExecution < tenMinutesAgo) {
        console.error(
          `[${new Date().toISOString()}] isRunning has been true for more than 10 minutes, resetting to false`,
        );
        isRunning.value = false;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "=== 检测到任务执行超时，已重置isRunning状态 ===",
          type: "warning",
        });
      }
    }

    if (batchSettings.enableRefresh && batchSettings.refreshInterval > 0) {
      const elapsedMinutes = (Date.now() - pageLoadTime) / 1000 / 60;
      if (elapsedMinutes >= batchSettings.refreshInterval) {
        if (!isRunning.value) {
          window.location.reload();
        } else {
          console.log(
            `[${new Date().toISOString()}] Scheduled refresh postponed due to running task`,
          );
        }
      }
    }
  };

  const start = () => {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "=== 定时任务调度服务已启动 ===",
      type: "info",
    });
    startScheduler();
    healthCheckInterval = setInterval(healthCheck, 5 * 60 * 1000);
    healthCheck();
  };

  const stop = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    if (intervalId.value) {
      clearInterval(intervalId.value);
      intervalId.value = null;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "=== 定时任务调度服务已停止 ===",
        type: "info",
      });
    }
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
  };

  watch(
    scheduledTasks,
    () => {
      nextExecutionTimes.value = {};
      taskCountdowns.value = {};
      updateCountdowns();
    },
    { deep: true },
  );

  const handleTokenRefreshWaiting = (data: { queueSize: number; waitSeconds: number }) => {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `Token刷新限流等待中，预计等待 ${data.waitSeconds} 秒（队列: ${data.queueSize}）`,
      type: "warning",
    });
  };

  onMounted(() => {
    start();
    startCountdown();
    $emit.on("token:refresh:waiting", handleTokenRefreshWaiting);
  });

  onBeforeUnmount(() => {
    $emit.off("token:refresh:waiting", handleTokenRefreshWaiting);
    stop();
  });

  return { taskCountdowns };
};
