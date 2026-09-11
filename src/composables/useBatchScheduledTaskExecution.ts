import type { Ref } from "vue";
import { ref } from "vue";
import { createScheduledTaskParameters, readLegacyScheduledParameters, validateScheduledTaskParameters } from "@/utils/scheduledTaskParameters";
import { availableTasks, isInTaskBlackout } from "@/utils/batch";
import type {
  BatchLogEntry,
  BatchMessageApi,
  BatchToken,
  BatchTokenStore,
} from "@/utils/batch/types";

interface ScheduledTask extends Record<string, any> {
  connectedTokens?: string[];
  id: string;
  name: string;
  selectedTasks: string[];
  selectedTokens: string[];
}

interface ScheduledTaskExecutionOptions {
  addLog: (entry: BatchLogEntry) => void;
  arenaActivityOpen: Ref<boolean>;
  dreamActivityOpen: Ref<boolean>;
  getTaskFunction: (taskName: string) => ((...args: any[]) => any) | undefined;
  isRunning: Ref<boolean>;
  scheduledRunning?: Ref<boolean>;
  message: BatchMessageApi;
  selectedTokens: Ref<string[]>;
  shouldStop: Ref<boolean>;
  tokenStore: BatchTokenStore & { gameTokens: BatchToken[] };
  tokens: Ref<BatchToken[]>;
  weirdTowerActivityOpen: Ref<boolean>;
}

const scheduledArgumentTasks = new Set([
  "batchOpenBox",
  "batchOpenBoxByPoints",
  "batchFish",
  "batchRecruit",
  "batchLegacyGiftSendEnhanced",
]);

export const useBatchScheduledTaskExecution = ({
  addLog,
  arenaActivityOpen,
  dreamActivityOpen,
  getTaskFunction,
  isRunning,
  scheduledRunning = ref(false),
  message,
  selectedTokens,
  shouldStop,
  tokenStore,
  tokens,
  weirdTowerActivityOpen,
}: ScheduledTaskExecutionOptions) => {
  const executingTaskIds = ref<string[]>([]);

  const taskLabel = (taskName: string) =>
    availableTasks.find((task) => task.value === taskName)?.label || taskName;

  const verifyTaskDependencies = (task: ScheduledTask) => {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 开始验证定时任务 ${task.name} 的依赖 ===`,
      type: "info",
    });

    try {
      localStorage.setItem("test", "test");
      localStorage.removeItem("test");
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "✅ localStorage可用",
        type: "info",
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `❌ localStorage不可用: ${reason}`,
        type: "error",
      });
      return false;
    }

    if (!tokenStore.gameTokens) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "❌ Token存储不可用",
        type: "error",
      });
      return false;
    }

    for (const taskName of task.selectedTasks) {
      if (typeof getTaskFunction(taskName) !== "function") {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `❌ 任务函数不存在: ${taskName}`,
          type: "error",
        });
        return false;
      }
    }

    const connectedTokens = task.selectedTokens.map((tokenId) => ({
      id: tokenId,
      name: tokenStore.gameTokens.find((token) => token.id === tokenId)?.name || tokenId,
    }));
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `✅ 将使用 ${connectedTokens.length} 个账号执行任务`,
      type: "info",
    });
    task.connectedTokens = connectedTokens.map((token) => token.id);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 的依赖验证通过，将执行 ${connectedTokens.length} 个账号 ===`,
      type: "success",
    });
    return true;
  };

  const executeScheduledTask = async (task: ScheduledTask) => {
    if (scheduledRunning.value || isRunning.value)
      return;
    if (isInTaskBlackout(task))
      throw new Error("当前处于本任务的禁止上线时段，已跳过执行");
    scheduledRunning.value = true;
    shouldStop.value = false;
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 开始执行定时任务: ${task.name} ===`,
      type: "info",
    });

    try {
      const parameters = createScheduledTaskParameters(task.parameters ?? readLegacyScheduledParameters());
      const parameterError = validateScheduledTaskParameters(task.selectedTasks, parameters);
      if (parameterError)
        throw new Error(parameterError);
      if (!verifyTaskDependencies(task)) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 定时任务 ${task.name} 依赖验证失败，取消执行 ===`,
          type: "error",
        });
        return;
      }

      const requestedTokens = task.connectedTokens || task.selectedTokens;
      const availableTokens = requestedTokens.filter((tokenId) =>
        tokens.value.some((token) => token.id === tokenId),
      );
      const missingTokens = requestedTokens.filter((tokenId) =>
        !tokens.value.some((token) => token.id === tokenId),
      );

      if (missingTokens.length > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⚠️  跳过不存在的Token: ${missingTokens.join(", ")}`,
          type: "warning",
        });
      }

      if (availableTokens.length === 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 定时任务 ${task.name} 没有可用的Token，取消执行 ===`,
          type: "error",
        });
        return;
      }

      selectedTokens.value = [...availableTokens];
      for (const taskName of task.selectedTasks) {
        if (shouldStop.value)
          continue;
        if (isInTaskBlackout(task)) {
          addLog({ time: new Date().toLocaleTimeString(), message: `定时任务 ${task.name} 已进入禁止上线时段，停止后续任务`, type: "warning" });
          break;
        }

        if (
          ["batchmengjing", "batchBuyDreamItems"].includes(taskName)
          && !dreamActivityOpen.value
        ) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `跳过任务: ${taskLabel(taskName)} (不在梦境开放时间)`,
            type: "warning",
          });
          continue;
        }

        if (
          ["batchTopUpArena", "batcharenafight"].includes(taskName)
          && !arenaActivityOpen.value
        ) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `跳过任务: ${taskLabel(taskName)} (不在竞技场开放时间)`,
            type: "warning",
          });
          continue;
        }

        if (
          [
            "climbWeirdTower",
            "batchUseItems",
            "batchMergeItems",
            "batchClaimFreeEnergy",
          ].includes(taskName)
          && !weirdTowerActivityOpen.value
        ) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `跳过任务: ${taskLabel(taskName)} (不在怪异塔开放时间)`,
            type: "warning",
          });
          continue;
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `执行任务: ${taskLabel(taskName)}`,
          type: "info",
        });

        const taskFunction = getTaskFunction(taskName);
        if (typeof taskFunction !== "function") {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `任务函数不存在: ${taskName}`,
            type: "error",
          });
          continue;
        }

        if (scheduledArgumentTasks.has(taskName))
          await taskFunction(true, { ...parameters });
        else
          await taskFunction();
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务执行完成: ${task.name} ===`,
        type: "success",
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务执行失败: ${reason} ===`,
        type: "error",
      });
      throw error;
    } finally {
      scheduledRunning.value = false;
      isRunning.value = false;
    }
  };

  const manualExecuteTask = async (task: ScheduledTask) => {
    if (scheduledRunning.value || isRunning.value || executingTaskIds.value.includes(task.id))
      return;

    if (!isRunning.value && shouldStop.value)
      shouldStop.value = false;

    executingTaskIds.value.push(task.id);
    try {
      message.info?.(`开始执行任务: ${task.name}`);
      await executeScheduledTask(task);
      message.success(`任务 ${task.name} 执行完成`);
    } catch (error) {
      console.error(`执行任务 ${task.name} 失败:`, error);
      message.error?.(`任务 ${task.name} 执行失败`);
    } finally {
      executingTaskIds.value = executingTaskIds.value.filter(
        (taskId) => taskId !== task.id,
      );
    }
  };

  return {
    executeScheduledTask,
    executingTaskIds,
    manualExecuteTask,
  };
};
