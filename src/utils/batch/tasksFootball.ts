import type { BatchTaskDeps } from "./types";
import {
  getPendingSaltCupMatchIds,
  getSaltCupPickLabel,
  normalizeSaltCupPick,
} from "./footballBet.js";

/**
 * 创建盐杯竞猜任务执行器。
 */
export function createTasksFootball(deps: BatchTaskDeps) {
  const {
    selectedTokens,
    tokens,
    tokenStatus,
    isRunning,
    shouldStop,
    ensureConnection,
    releaseConnectionSlot,
    connectionQueue,
    batchSettings,
    tokenStore,
    addLog,
    message,
    currentRunningTokenId,
  } = deps;

  const batchFootballBet = async (requestedPick = 3) => {
    if (selectedTokens.value.length === 0) {
      return;
    }

    const pick = normalizeSaltCupPick(requestedPick);
    const pickLabel = getSaltCupPickLabel(pick);

    isRunning.value = true;
    shouldStop.value = false;
    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value) {
        return;
      }

      const token = tokens.value.find((item) => item.id === tokenId);
      if (!token) {
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `未找到 Token: ${tokenId}`,
          type: "error",
        });
        return;
      }

      tokenStatus.value[tokenId] = "running";
      let connectionReady = false;
      const releaseSlotOnClose =
        tokenStore.getWebSocketStatus(tokenId) !== "connected";

      try {
        await ensureConnection(tokenId);
        connectionReady = true;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始盐杯竞猜: ${token.name} (${pickLabel}) ===`,
          type: "info",
        });

        const betInfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "saltcup26_getbetinfo",
          {},
          8000,
        );
        const pendingMatchIds = getPendingSaltCupMatchIds(betInfo);

        if (pendingMatchIds.length === 0) {
          tokenStatus.value[tokenId] = "completed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 没有待竞猜比赛`,
            type: "success",
          });
          return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const matchId of pendingMatchIds) {
          if (shouldStop.value) {
            break;
          }

          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "saltcup26_placebet",
              { matchId, pick },
              8000,
            );
            successCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} ${matchId} -> ${pickLabel}`,
              type: "success",
            });
          } catch (error) {
            failCount++;
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} ${matchId} 竞猜失败: ${errorMessage}`,
              type: "error",
            });
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        const finalStatus =
          failCount > 0 && successCount === 0 ? "failed" : "completed";
        tokenStatus.value[tokenId] = finalStatus;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 竞猜完成: 成功 ${successCount}，失败 ${failCount} ===`,
          type: failCount > 0 ? "warning" : "success",
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 盐杯竞猜失败: ${errorMessage}`,
          type: "error",
        });
      } finally {
        if (connectionReady) {
          tokenStore.closeWebSocketConnection(tokenId);
          if (releaseSlotOnClose) {
            releaseConnectionSlot();
          }
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭 (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
            type: "info",
          });
        }
      }
    });

    await Promise.all(taskPromises);
    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量盐杯竞猜结束");
  };

  return { batchFootballBet };
}
