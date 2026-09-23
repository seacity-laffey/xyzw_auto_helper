import type { BatchTaskDeps } from "./types";
import { runBatchActivity } from "./activityRunner";
import { selectApexGuessTeam } from "./apexGuess.js";
import { createApexSender, fetchApexPages, resolveOpenApexRounds } from "../apexRequests.js";
import { ApexAction } from "../apexRateLimit.js";
import { calibrateServerTime, canGuessRow, getAdvanceNum, getScheduleStatus } from "../apexRules.js";

export function createTasksApex(deps: BatchTaskDeps) {
  const batchApexGuess = () => runBatchActivity(deps, "逐鹿竞猜", async (token) => {
    const cancelled = () => deps.shouldStop.value;
    const send = createApexSender(deps.tokenStore, token.id, cancelled);
    const response = await send("apex_getroleinfo");
    const info = response.apexRoleInfo || {};
    const now = () => calibrateServerTime(Date.now(), info.resetTime?.day);
    const rounds = resolveOpenApexRounds(now());
    if (!rounds.length)
      throw new Error("当前没有开放的竞猜阶段");
    for (const { season, round, tabs } of rounds) {
      for (const tab of tabs) {
        if (cancelled())
          return;
        const guessed = new Set(info.guessMap?.[tab.scheduleId] || []);
        const limit = getAdvanceNum(round, season, tab.stage);
        if (limit <= 0 || guessed.size >= limit)
          continue;
        const result = await fetchApexPages(send, { cmd: "apex_getguesslist", params: { scheduleId: tab.scheduleId }, listKey: "apexGuessList", cancelled });
        if (!result.complete)
          throw new Error("对阵尚未拉取完整，请稍后重试");
        for (const pair of result.rows) {
          if (cancelled() || guessed.size >= limit)
            break;
          if (!canGuessRow(getScheduleStatus(tab.scheduleId, now()), tab.stage, { team1Win: pair[0]?.isWin, team2Win: pair[1]?.isWin }))
            continue;
          const pick = selectApexGuessTeam(pair, guessed);
          if (!pick)
            continue;
          await send("apex_guess", { teamId: pick.teamId }, ApexAction.GUESS);
          guessed.add(pick.teamId);
          deps.addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 第${round}期 ${tab.title} 竞猜 ${pick.name || pick.teamId}`, type: "success" });
        }
      }
    }
  });
  return { batchApexGuess };
}
