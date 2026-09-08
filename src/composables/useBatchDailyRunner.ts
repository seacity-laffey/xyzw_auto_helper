import type { Ref } from "vue";
import { DailyTaskRunner } from "@/utils/dailyTaskRunner";
import { resolveAccountTaskSettings } from "@/utils/taskTemplateConfig";
import type {
  BatchConnectionQueue,
  BatchLogEntry,
  BatchMessageApi,
  BatchSettings,
  BatchToken,
  BatchTokenStore,
  TokenStatus,
} from "@/utils/batch/types";

interface BatchDailyRunnerOptions {
  addLog: (entry: BatchLogEntry) => void;
  batchSettings: BatchSettings;
  connectionQueue: BatchConnectionQueue;
  currentRunningTokenId: Ref<string | null>;
  ensureConnection: (tokenId: string) => Promise<boolean>;
  isRunning: Ref<boolean>;
  message: BatchMessageApi;
  releaseConnectionSlot: () => void;
  selectedTokens: Ref<string[]>;
  shouldStop: Ref<boolean>;
  tokenStatus: Ref<Record<string, TokenStatus>>;
  tokenStore: BatchTokenStore;
  tokens: Ref<BatchToken[]>;
}

export const useBatchDailyRunner = ({
  addLog,
  batchSettings,
  connectionQueue,
  currentRunningTokenId,
  ensureConnection,
  isRunning,
  message,
  releaseConnectionSlot,
  selectedTokens,
  shouldStop,
  tokenStatus,
  tokenStore,
  tokens,
}: BatchDailyRunnerOptions) => {
  const startBatch = async () => {
    if (selectedTokens.value.length === 0)
      return;

    let snapshots: Map<string, ReturnType<typeof resolveAccountTaskSettings>>;
    try {
      snapshots = new Map(selectedTokens.value.map((tokenId) => [tokenId, resolveAccountTaskSettings(tokenId)]));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      addLog({ time: new Date().toLocaleTimeString(), message: `执行模板读取失败：${reason}`, type: "error" });
      message.error?.(`执行模板读取失败：${reason}`);
      return;
    }

    isRunning.value = true;
    shouldStop.value = false;
    selectedTokens.value.forEach((tokenId) => {
      tokenStatus.value[tokenId] = "waiting";
    });

    await Promise.all(selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";
      let retryCount = 0;
      const maxRetries = 1;
      let success = false;

      while (retryCount <= maxRetries && !success) {
        if (shouldStop.value)
          break;

        const token = tokens.value.find((item) => item.id === tokenId);
        if (!token) {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `账号不存在，跳过执行: ${tokenId}`,
            type: "error",
          });
          break;
        }

        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: retryCount === 0
              ? `=== 开始执行: ${token.name} ===`
              : `=== 尝试重试: ${token.name} (第${retryCount}次) ===`,
            type: "info",
          });

          await ensureConnection(tokenId);
          const runner = new DailyTaskRunner(tokenStore, {
            commandDelay: batchSettings.commandDelay as number,
            taskDelay: batchSettings.taskDelay as number,
          });
          await runner.run(tokenId, {
            onLog: (log) => addLog(log as BatchLogEntry),
            onProgress: () => {},
          }, snapshots.get(tokenId));

          success = true;
          tokenStatus.value[tokenId] = "completed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 执行完成 ===`,
            type: "success",
          });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          console.error(error);
          if (retryCount < maxRetries && !shouldStop.value) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 执行出错: ${reason}，等待3秒后重试...`,
              type: "warning",
            });
            await new Promise((resolve) => setTimeout(resolve, 3000));
            retryCount++;
          } else {
            tokenStatus.value[tokenId] = "failed";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 执行失败: ${reason}`,
              type: "error",
            });
          }
        } finally {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
            type: "info",
          });
        }
      }
    }));

    await new Promise((resolve) => setTimeout(resolve, 1000));
    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量任务执行结束");
  };

  const stopBatch = () => {
    shouldStop.value = true;
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "正在停止...",
      type: "warning",
    });
  };

  return { startBatch, stopBatch };
};
