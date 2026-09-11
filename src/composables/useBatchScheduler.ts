import { createSchedulerTick } from "@/utils/schedulerTick.js";
import type { Ref } from "vue";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { $emit } from "@/stores/events/index";
import {
  calculateNextScheduledRun,
  formatTimeDifference,
  matchesScheduledTask,
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
    nextExecutionAt: number;
    plannedAt: number;
  }>>({});
  const nextExecutionTimes = ref<Record<string, { executeAt: number; plannedAt: number }>>({});
  const intervalId = ref<ReturnType<typeof setInterval> | null>(null);
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let healthCheckInterval: ReturnType<typeof setInterval> | null = null;
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
        || nextExecutionTimes.value[task.id].executeAt <= now
      ) {
        const next = calculateNextScheduledRun(task, new Date(now));
        if (!next) {
          delete nextExecutionTimes.value[task.id];
          delete taskCountdowns.value[task.id];
          return;
        }
        nextExecutionTimes.value[task.id] = { executeAt: next.executeAt.getTime(), plannedAt: next.plannedAt.getTime() };
      }

      if (nextExecutionTimes.value[task.id]) {
        const next = nextExecutionTimes.value[task.id];
        const timeDiff = next.executeAt - now;
        const remainingTime = Math.max(0, timeDiff);
        taskCountdowns.value[task.id] = {
          remainingTime,
          nextExecutionAt: next.executeAt,
          plannedAt: next.plannedAt,
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

  const tick = createSchedulerTick({
    tasks: () => scheduledTasks.value,
    storage: localStorage,
    busy: () => isRunning.value,
    matches: matchesScheduledTask,
    execute: executeScheduledTask,
    onError: (error, task) => addLog({
      time: new Date().toLocaleTimeString(),
      message: `定时任务 ${task.name} 调度失败: ${String(error)}`,
      type: "error",
    }),
  });

  const startScheduler = () => {
    if (intervalId.value)
      clearInterval(intervalId.value);
    intervalId.value = setInterval(() => {
      void tick();
    }, 10000);
  };

  const healthCheck = () => {
    if (!intervalId.value) {
      console.error(
        `[${new Date().toISOString()}] Task scheduler interval is not running, restarting...`,
      );
      startScheduler();
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
