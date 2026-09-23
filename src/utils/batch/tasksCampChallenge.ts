import type { BatchTaskDeps } from "./types";
import { runBatchActivity } from "./activityRunner";
import {
  getTodayClubBattleOpponent,
  getTodayClubBattleStats,
} from "../clubDailyBattle.js";

interface CampTeam { teamInfo?: Record<string, { heroId?: number; id?: number }> }
type CampPresets = Record<string, CampTeam>;
interface CampResponse {
  presetTeamInfo?: CampPresets & { presetTeamInfo?: CampPresets };
  role?: { lordWeaponId?: number };
  siege?: { taskProgress?: Record<number, number>; taskClaimedMap?: Record<number, boolean> };
  club?: Record<string, unknown>;
}

export function createTasksCampChallenge(deps: BatchTaskDeps) {
  const send = (id: string, cmd: string, params = {}) => {
    if (deps.shouldStop.value)
      throw new Error("任务已停止");
    return deps.tokenStore.sendMessageWithPromise(id, cmd, params, 10000) as Promise<CampResponse>;
  };
  const formation = async (id: string) => {
    const [preset, info] = await Promise.all([
      send(id, "presetteam_getinfo"),
      send(id, "role_getroleinfo"),
    ]);
    const settings = (deps.loadSettings as (id: string) => any)?.(id);
    const formationId = String(settings?.campFormation || 1);
    const root
      = preset?.presetTeamInfo?.presetTeamInfo || preset?.presetTeamInfo || {};
    const team = root[formationId]?.teamInfo || {};
    const battleTeam = Object.fromEntries(
      Object.entries(team).flatMap(([pos, hero]: [string, any]) => {
        const heroId = hero?.heroId ?? hero?.id;
        return heroId ? [[pos, Number(heroId)]] : [];
      }),
    );
    if (!Object.keys(battleTeam).length)
      throw new Error(`营地阵容${formationId}为空，请先配置`);
    return {
      lordWeaponId: info?.role?.lordWeaponId || 0,
      petUId: "",
      battleTeam,
    };
  };
  const claim = async (id: string) => {
    const { siege = {} } = await send(id, "club_getinfo");
    for (const confId of [1, 2, 3, 4]) {
      if (deps.shouldStop.value)
        return;
      if (
        siege.taskClaimedMap?.[confId]
        || Number(siege.taskProgress?.[confId] || 0) < (confId === 4 ? 3 : 1)
      ) {
        continue;
      }
      await send(id, "club_taskclaim", { confId });
    }
  };
  const batchCampChallenge = () =>
    runBatchActivity(deps, "营地挑战（最多3次）", async ({ id, name }) => {
      let info = await send(id, "club_getinfo");
      if (!getTodayClubBattleOpponent(info))
        throw new Error("今日营地挑战未开放或尚未匹配");
      const max = Math.min(
        3,
        Math.max(0, 10 - getTodayClubBattleStats(info).attackCount),
      );
      if (!max)
        return;
      const teamSetParams = await formation(id);
      const attempted = new Set<string>();
      for (let index = 0; index < max && !deps.shouldStop.value; index++) {
        // 每次重新读据点计数，避免其他账号出刀后继续使用旧计数。
        if (index)
          info = await send(id, "club_getinfo");
        const opponent = getTodayClubBattleOpponent(info);
        const targets = Object.entries(opponent?.defenders || {}).filter(
          ([nodeId, d]: [string, any]) => !d.defeated && !attempted.has(nodeId),
        );
        const target = targets[Math.floor(Math.random() * targets.length)];
        if (!target)
          break;
        const [nodeId, defender] = target as [string, any];
        attempted.add(nodeId);
        await send(id, "club_attack", {
          nodeId: Number(nodeId),
          targetId: defender.roleId,
          challengeCnt: defender.challengeCnt || 0,
          failCnt: defender.failCnt || 0,
          useItem: false,
          teamSetParams,
        });
        deps.addLog({
          time: new Date().toLocaleTimeString(),
          message: `${name} 已挑战据点 ${nodeId} · ${defender.name || defender.roleId}`,
          type: "success",
        });
      }
      if (!deps.shouldStop.value)
        await claim(id);
    });
  const batchCampChallengePet = () =>
    runBatchActivity(deps, "营地宠物挑战（3轮）", async ({ id }) => {
      const teamSetParams = await formation(id);
      for (let i = 0; i < 3 && !deps.shouldStop.value; i++)
        await send(id, "club_attackmonster", { useItem: false, teamSetParams });
      if (!deps.shouldStop.value)
        await claim(id);
    });
  const batchCampClaimTasks = () =>
    runBatchActivity(deps, "营地任务领奖", ({ id }) => claim(id));
  return { batchCampChallenge, batchCampChallengePet, batchCampClaimTasks };
}
