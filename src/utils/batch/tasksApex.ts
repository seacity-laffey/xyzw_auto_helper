import type { BatchTaskDeps } from "./types";
import { resolveApexScheduleId, selectApexGuessTeam } from "./apexGuess.js";

interface ApexTeam {
  teamId: string;
  name?: string;
  cheerCnt?: number;
}

interface ApexRoleInfo {
  guessMap?: Record<string, string[]>;
  guessClaimMap?: Record<string, Record<string, unknown>>;
}

interface ApexResponse {
  apexRoleInfo?: ApexRoleInfo;
  apexGuessList?: ApexTeam[][];
}

/**
 * 逐鹿盐山竞猜任务
 * 包含: 一键批量竞猜（自动选助威最高队伍）
 */

/**
 * 创建逐鹿盐山竞猜任务执行器
 * @param {object} deps - 依赖项
 * @returns {object} 任务函数集合
 */
export function createTasksApex(deps: BatchTaskDeps) {
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

  /**
   * 一键批量逐鹿盐山竞猜
   * 自动选每组对阵中助威数最高的队伍
   */
  const batchApexGuess = async (defaultScheduleId = 46) => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value)
        return;

      const token = tokens.value.find((t) => t.id === tokenId);
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
      const releaseSlotOnClose
        = tokenStore.getWebSocketStatus(tokenId) !== "connected";

      try {
        await ensureConnection(tokenId);
        connectionReady = true;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始逐鹿盐山竞猜: ${token.name} ===`,
          type: "info",
        });

        // 1. 获取角色信息
        const roleResp = (await tokenStore.sendMessageWithPromise(
          tokenId,
          "apex_getroleinfo",
          {},
          8000,
        )) as ApexResponse;
        const apexInfo = roleResp?.apexRoleInfo || {};
        const guessMap = apexInfo.guessMap || {};
        const guessClaimMap = apexInfo.guessClaimMap || {};

        // 2. 确定当前活跃 scheduleId（guessClaimMap 中值为 {} 的 key）
        const scheduleId = resolveApexScheduleId(
          guessClaimMap,
          defaultScheduleId,
        );

        if (!Object.hasOwn(guessClaimMap, scheduleId)) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 未找到活跃赛季，使用默认: ${scheduleId}`,
            type: "warning",
          });
        }

        // 3. 收集已竞猜的队伍 ID
        const guessedTeamIds = new Set(guessMap[scheduleId] || []);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 当前赛季: ${scheduleId}，已竞猜: ${guessedTeamIds.size} 队`,
          type: "info",
        });

        // 4. 分页获取所有对阵
        const allGroups: ApexTeam[][] = [];
        let idx = 0;
        while (true) {
          if (shouldStop.value)
            break;

          const resp = (await tokenStore.sendMessageWithPromise(
            tokenId,
            "apex_getguesslist",
            { scheduleId: Number(scheduleId), idx },
            8000,
          )) as ApexResponse;
          const groups = resp?.apexGuessList || [];
          if (groups.length === 0)
            break;
          allGroups.push(...groups);
          idx += 5;
        }

        if (allGroups.length === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 没有对阵数据`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 共 ${allGroups.length} 组对阵`,
          type: "info",
        });

        // 5. 遍历对阵，选助威最高的队伍竞猜
        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;

        for (const group of allGroups) {
          if (shouldStop.value)
            break;

          const [team0, team1] = group;
          if (!team0 || !team1)
            continue;

          const pick = selectApexGuessTeam(
            group,
            guessedTeamIds,
          ) as ApexTeam | null;
          if (!pick) {
            skipCount++;
            continue;
          }

          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "apex_guess",
              { teamId: pick.teamId },
              8000,
            );
            guessedTeamIds.add(pick.teamId);
            successCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 竞猜 ${pick.name} (${pick.teamId}) 助威:${pick.cheerCnt} ✓`,
              type: "success",
            });
          } catch (error) {
            failCount++;
            const errorMessage
              = error instanceof Error ? error.message : String(error);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 竞猜 ${pick.name} 失败: ${errorMessage}`,
              type: "error",
            });
          }

          // 竞猜间隔
          await new Promise((r) => setTimeout(r, 500));
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 竞猜完成: 成功${successCount} 跳过${skipCount} 失败${failCount} ===`,
          type: "success",
        });
      } catch (error) {
        const errorMessage
          = error instanceof Error ? error.message : String(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 逐鹿盐山竞猜失败: ${errorMessage}`,
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
    message.success("批量逐鹿盐山竞猜结束");
  };

  return {
    batchApexGuess,
  };
}
