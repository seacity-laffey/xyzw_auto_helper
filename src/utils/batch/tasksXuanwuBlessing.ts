import type { BatchLogType, BatchTaskDeps } from "./types";
import { runBatchActivity } from "./activityRunner";
/**
 * 玄武赐福（通行证活动）批量任务
 * 顺序执行：任务领取 -> 通行证奖励 -> 免费珍宝 -> 抽奖 -> 点卯 -> 抽奖后二次领取
 * 抽奖会推进任务进度（如"抽奖X次"类任务），故抽奖后需重新拉取并再领一轮
 */

import { getXuanwuActBase } from "@/utils/towerActId";

interface Reward { type: number; value: number; itemId?: number }
interface WarOrder { complete?: Record<string, number>; taskClaimed?: Record<string, boolean> }
interface XuanwuResponse {
  activity?: { warOrderActivityInfo?: Record<number, WarOrder> };
  reward?: Reward[];
  lotteryInfo?: unknown;
}

// 活动ID后缀（前缀为当天日期 YYMMDD）
const WAR_ORDER_SUFFIX = "1";
const SIGN_SUFFIX = "5";
const GOODS_SUFFIX = "41";

// 抽奖次数（默认1次，需要连抽改成10即可）
const DRAW_TIMES = 1;

// 通行证奖励领取最大轮数
const MAX_REWARD_ROUNDS = 10;

// 点卯补领天数（patchDay 0-6）
const SIGN_MAX_DAY = 6;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatReward = (reward: Reward[] = []) =>
  reward
    .map((r) => {
      if (r.type === 2)
        return `金砖x${r.value}`;
      if (r.type === 3)
        return `道具${r.itemId}x${r.value}`;
      return `类型${r.type}x${r.value}`;
    })
    .join(", ");

/**
 * 创建玄武赐福批量任务执行器
 * @param {Object} deps - 依赖项
 * @returns {Object} 任务函数集合
 */
export function createTasksXuanwuBlessing(deps: BatchTaskDeps) {
  const { shouldStop, tokenStore, addLog, delayConfig } = deps;
  const send = (
    ...args: Parameters<typeof tokenStore.sendMessageWithPromise>
  ) => {
    if (shouldStop.value)
      throw new Error("任务已停止");
    return tokenStore.sendMessageWithPromise(...args) as Promise<XuanwuResponse>;
  };
  const delays = delayConfig as { command?: number; action?: number } | undefined;
  const commandDelay = delays?.command ?? delays?.action ?? 300;

  const log = (msg: string, type: BatchLogType = "info") =>
    addLog({ time: new Date().toLocaleTimeString(), message: msg, type });

  /** 拉取通行证活动信息 */
  const fetchWarOrder = async (tokenId: string, actId: number) => {
    try {
      const res = await send(tokenId, "activity_warorderget", { actId }, 8000);
      return res?.activity?.warOrderActivityInfo?.[actId] || null;
    } catch {
      return null;
    }
  };

  /** 解析当前活动ID：先用日期推导，取不到再逐天回退探测 */
  const resolveWarOrder = async (tokenId: string) => {
    const candidates = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      candidates.push(Number(getXuanwuActBase(date) + WAR_ORDER_SUFFIX));
    }

    for (const actId of candidates) {
      if (shouldStop.value)
        return null;
      const info = await fetchWarOrder(tokenId, actId);
      if (info)
        return { actId, info };
    }

    return null;
  };

  /** 领取通行证任务（每日/每周/本期），返回领取/跳过数 */
  const claimTasks = async (tokenId: string, actId: number, info: WarOrder, tokenName: string) => {
    const complete = info?.complete || {};
    const claimedMap = info?.taskClaimed || {};
    let claimed = 0;
    let skipped = 0;

    for (const [missionIdStr, progress] of Object.entries(complete)) {
      if (shouldStop.value)
        break;
      if (claimedMap[missionIdStr] === true)
        continue;
      if (!(progress > 0))
        continue;

      try {
        const res = await send(
          tokenId,
          "activity_warordertaskclaim",
          { actId, missionId: Number(missionIdStr) },
          8000,
        );
        const latest
          = res?.activity?.warOrderActivityInfo?.[actId]?.taskClaimed;
        if (latest)
          Object.assign(claimedMap, latest);

        if (res?.reward?.length) {
          log(
            `${tokenName} 任务${missionIdStr}领取: ${formatReward(res.reward)}`,
            "success",
          );
          claimed++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
      await delay(commandDelay);
    }

    if (claimed > 0 || skipped > 0) {
      log(
        `${tokenName} 通行证任务: 领取 ${claimed}, 跳过 ${skipped}`,
        claimed > 0 ? "success" : "info",
      );
    }
    return { claimed, skipped };
  };

  /** 通行证奖励领取（可能产出抽奖券），返回领取轮数 */
  const claimPassRewards = async (tokenId: string, actId: number, tokenName: string) => {
    let rounds = 0;
    for (let round = 0; round < MAX_REWARD_ROUNDS; round++) {
      if (shouldStop.value)
        break;
      try {
        const res = await send(
          tokenId,
          "activity_warorderrewardclaim",
          { actId },
          8000,
        );
        if (!res?.reward?.length)
          break;
        log(
          `${tokenName} 通行证奖励领取: ${formatReward(res.reward)}`,
          "success",
        );
        rounds++;
      } catch {
        // 已无可领取奖励
        break;
      }
      await delay(commandDelay);
    }
    if (rounds > 0) {
      log(`${tokenName} 通行证奖励: 领取 ${rounds} 次`, "success");
    }
    return rounds;
  };

  /** 免费珍宝购买（产出抽奖券） */
  const buyFreeGoods = async (tokenId: string, goodsId: number, tokenName: string) => {
    try {
      const res = await send(
        tokenId,
        "activity_commonbuygoods",
        { goodsId },
        8000,
      );
      log(
        `${tokenName} 免费珍宝购买成功${res?.reward?.length ? `: ${formatReward(res.reward)}` : ""}`,
        "success",
      );
      return true;
    } catch {
      log(`${tokenName} 免费珍宝今日已购买或不可购买`);
      return false;
    }
  };

  /** 抽奖（会推进抽奖类任务进度） */
  const doLottery = async (tokenId: string, tokenName: string) => {
    try {
      const lotteryInfo = await send(
        tokenId,
        "activity_getlotteryinfo",
        {},
        8000,
      );
      log(
        `${tokenName} 抽奖信息: ${JSON.stringify(lotteryInfo?.lotteryInfo || {})}`,
      );
    } catch {
      // 抽奖信息获取失败不影响抽奖
    }

    let count = 0;
    for (let i = 0; i < DRAW_TIMES; i++) {
      if (shouldStop.value)
        break;
      try {
        const res = await send(tokenId, "activity_lottery", { times: 1 }, 8000);
        log(
          `${tokenName} 抽奖第${i + 1}次: ${formatReward(res?.reward || []) || "无奖励"}`,
          "success",
        );
        count++;
      } catch (error) {
        log(`${tokenName} 抽奖失败: ${error instanceof Error ? error.message : String(error)}`, "warning");
        break;
      }
      await delay(commandDelay);
    }
    return count;
  };

  /** 玄武点卯（patchDay 0-6 补领） */
  const claimSign = async (tokenId: string, signActivityId: number, tokenName: string) => {
    let claimed = 0;
    let skipped = 0;
    for (let patchDay = 0; patchDay <= SIGN_MAX_DAY; patchDay++) {
      if (shouldStop.value)
        break;
      try {
        const res = await send(
          tokenId,
          "activity_claimsignreward",
          { activityId: signActivityId, patchDay },
          8000,
        );
        if (res?.reward?.length) {
          log(
            `${tokenName} 点卯第${patchDay + 1}天领取: ${formatReward(res.reward)}`,
            "success",
          );
          claimed++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
      await delay(commandDelay);
    }
    log(
      `${tokenName} 玄武点卯: 领取 ${claimed} 天, 跳过 ${skipped} 天`,
      claimed > 0 ? "success" : "info",
    );
    return claimed;
  };

  /** 批量执行玄武赐福 */
  const batchXuanwuBlessing = () =>
    runBatchActivity(deps, "玄武赐福（抽奖1次）", async (token) => {
      const tokenId = token.id;
      const resolved = await resolveWarOrder(tokenId);
      if (!resolved) {
        throw new Error("未找到玄武赐福活动，请确认活动是否开启");
      }
      const { actId, info } = resolved;
      const base = String(actId).slice(0, 6);
      const signActivityId = Number(base + SIGN_SUFFIX);
      const goodsId = Number(base + GOODS_SUFFIX);

      // 1. 先领一轮任务 + 通行证奖励，同时攒抽奖券
      const first = await claimTasks(tokenId, actId, info, token.name);
      let passRewards = await claimPassRewards(tokenId, actId, token.name);

      // 2. 免费珍宝购买（产出抽奖券）
      await buyFreeGoods(tokenId, goodsId, token.name);
      await delay(commandDelay);

      // 3. 抽奖（会推进"抽奖X次"类任务进度）
      const lotteryCnt = await doLottery(tokenId, token.name);

      // 4. 点卯补领（同样可能推进任务进度）
      const signCnt = await claimSign(tokenId, signActivityId, token.name);

      // 5. 抽奖/点卯后重新拉取，领取新完成的任务
      let secondClaimed = 0;
      if (lotteryCnt > 0 || signCnt > 0) {
        const latestInfo = await fetchWarOrder(tokenId, actId);
        if (latestInfo) {
          const second = await claimTasks(
            tokenId,
            actId,
            latestInfo,
            token.name,
          );
          secondClaimed = second.claimed;
          if (secondClaimed > 0) {
            passRewards += await claimPassRewards(tokenId, actId, token.name);
          }
        }
      }

      log(
        `${token.name} 玄武赐福完成: 任务${first.claimed + secondClaimed}, 通行证奖励${passRewards}, 点卯${signCnt}, 抽奖${lotteryCnt}`,
        "success",
      );
    });

  return {
    batchXuanwuBlessing,
  };
}
