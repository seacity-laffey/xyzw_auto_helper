import { apexSeasonConf } from "./apexStageMap.js";
import {
  allSchedules,
  ApexRoundPhase,
  ApexScheduleStatus,
  ApexStage,
  DAY_MS,
  getDateZeroTime,
  getRoundSchedules,
  seasonRoundMap,
} from "./apexScheduleData.js";
import { getScheduleStatus } from "./apexStages.js";

/**
 * 当前赛季（等价客户端 refreshCurrentSeason）。
 * 赛季窗口 = [min(serverDate + signStartTime), max(endDate 或 serverDate + endTime)]，
 * 命中即返回赛季号；无命中返回 -1。
 * @param {number} nowMs
 * @returns {number} 命中窗口的赛季号；无命中时返回 -1
 */
export function getCurrentSeason(nowMs) {
  const windows = new Map();
  const order = [];
  for (const conf of allSchedules) {
    const dayZero = getDateZeroTime(conf.date);
    if (!Number.isFinite(dayZero))
      continue;
    if (!windows.has(conf.season)) {
      windows.set(conf.season, { startTime: Infinity, endTime: 0 });
      order.push(conf.season);
    }
    const win = windows.get(conf.season);
    if (conf.signStartTime) {
      win.startTime = Math.min(
        win.startTime,
        dayZero + conf.signStartTime * 1000,
      );
    }
    if (conf.endDate) {
      const endZero = getDateZeroTime(conf.endDate);
      if (Number.isFinite(endZero))
        win.endTime = Math.max(win.endTime, endZero);
    } else {
      win.endTime = Math.max(win.endTime, dayZero + conf.endTime * 1000);
    }
  }
  for (const season of order) {
    const win = windows.get(season);
    if (
      Number.isFinite(win.startTime)
      && nowMs >= win.startTime
      && nowMs <= win.endTime
    ) {
      return season;
    }
  }
  return -1;
}

/**
 * 是否处于赛季内（等价客户端 checkNowInSeason）。用于识别「配置快照未覆盖当前赛季」。
 * @param {number} nowMs
 * @returns {{inSeason: boolean, timeLeft: number}} inSeason 表示是否落在赛季窗口内，timeLeft 为窗口内剩余毫秒
 */
export function checkNowInSeason(nowMs) {
  // 客户端默认余量为 31536e6 ms（= 365 天）
  const result = { inSeason: false, timeLeft: 365 * DAY_MS };
  for (const conf of Object.values(apexSeasonConf)) {
    const start = getDateZeroTime(conf.startDate);
    const end = getDateZeroTime(conf.endDate);
    if (!Number.isFinite(start) || !Number.isFinite(end))
      continue;
    if (start <= nowMs && nowMs <= end)
      return { inSeason: true, timeLeft: 0 };
    if (nowMs < start)
      result.timeLeft = Math.min(result.timeLeft, start - nowMs);
  }
  return result;
}

/**
 * 遍历某期赛程，跳过日期不可解析的场次，把「当日零点 + 场次内秒偏移」交给回调。
 *
 * 报名起始时刻与该期结束时刻都要按 `conf.date` 取零再加偏移，且都要跳过坏日期，
 * 因此共用这一处收敛器，避免两处各写一遍取零逻辑。
 * @param {Array<object>} list 该期赛程配置
 * @param {string} field 场次内的秒偏移字段名（signStartTime / endTime）
 * @param {(at: number) => void} collect 收到该场的绝对时刻（ms）
 */
export const forEachScheduleTime = (list, field, collect) => {
  for (const conf of list) {
    const offset = conf[field];
    if (!offset)
      continue;
    const zero = getDateZeroTime(conf.date);
    if (!Number.isFinite(zero))
      continue;
    collect(zero + offset * 1000);
  }
};

/**
 * 该期报名开始时刻（取最早一条 signStartTime，无则退回首场当日 0 点）。
 * @param {number} round
 * @param {number} season
 * @returns {number} 无法解析时返回 NaN
 */
export function getRoundSignStartTime(round, season) {
  const list = getRoundSchedules(round, season);
  let min = Infinity;
  forEachScheduleTime(list, "signStartTime", (at) => {
    min = Math.min(min, at);
  });
  if (Number.isFinite(min))
    return min;
  return list.length ? getDateZeroTime(list[0].date) : Number.NaN;
}

/**
 * 该期「真实结束时刻」：取该期全部场次（date + endTime）的最晚者。
 *
 * ⚠️ 不能直接用配置里的 endDate：实测 endDate 是行政截止日，比该期末场（决赛）
 *    晚约 19 天（如第 1 期决赛 7/28 结束但 endDate=8/16，第 3 期决赛 9/8 结束但
 *    endDate=9/27）。用它判定会把已打完的期误判为进行中。
 *    仅当全部场次日期都不可解析时，才退回 endDate 兜底。
 * @param {number} round
 * @param {number} season
 * @returns {number} 无法解析时返回 NaN
 */
export function getRoundEndTime(round, season) {
  const list = getRoundSchedules(round, season);
  let max = -Infinity;
  forEachScheduleTime(list, "endTime", (at) => {
    max = Math.max(max, at);
  });
  if (Number.isFinite(max))
    return max;
  // 兜底：全部场次日期不可解析时，改用配置里的行政截止日 endDate
  let fallback = -Infinity;
  for (const conf of list) {
    const zero = getDateZeroTime(conf.endDate);
    if (!Number.isFinite(zero))
      continue;
    fallback = Math.max(fallback, zero + (conf.endTime || 0) * 1000);
  }
  return Number.isFinite(fallback) ? fallback : Number.NaN;
}

/**
 * 该期「结算时刻」：决赛当日 0 点 + 一天（等价客户端 DayDuration）。
 *
 * 客户端在 _getInitialPhaseIndex 里判定「该期还没翻篇」用的是这个时刻，而不是
 * 决赛 endTime：只要还没到决赛次日的 0 点，这一期就仍算「当前期」。
 *
 * ⚠️ 与 getRoundEndTime 差一个 1h45m 窗口：实测各期决赛 endTime 恒为 22:15，
 *    而结算时刻是次日 00:00，两者之间决赛已打完但该期尚未翻篇。只用 endTime 判定
 *    会在这段窗口里提前跳到下一期。
 * @param {number} round
 * @param {number} season
 * @returns {number} 无法解析时返回 NaN
 */
export function getRoundSettleTime(round, season) {
  const final = getRoundSchedules(round, season).find(
    (c) => c.stage === ApexStage.TAOTAI_2,
  );
  if (!final)
    return Number.NaN;
  const zero = getDateZeroTime(final.date);
  return Number.isFinite(zero) ? zero + DAY_MS : Number.NaN;
}

/**
 * 该期是否已结束（末场已打完）。
 * @param {number} round
 * @param {number} season
 * @param {number} nowMs
 * @returns {boolean} 该期末场已结束为 true
 */
export function isRoundEnded(round, season, nowMs) {
  const end = getRoundEndTime(round, season);
  return Number.isFinite(end) && nowMs >= end;
}

/**
 * 该期所处阶段（未开始 / 进行中 / 已结束）。
 * @param {number} round
 * @param {number} season
 * @param {number} nowMs
 * @returns {number} ApexRoundPhase
 */
export function getRoundPhase(round, season, nowMs) {
  const start = getRoundSignStartTime(round, season);
  if (Number.isFinite(start) && nowMs < start)
    return ApexRoundPhase.Upcoming;
  return isRoundEnded(round, season, nowMs)
    ? ApexRoundPhase.Ended
    : ApexRoundPhase.Ongoing;
}

/**
 * 当前赛季中「已开期」的期号列表（升序），含已结束的历史期。
 *
 * 与客户端 getAvailableRounds 的差别：客户端额外用 endDate 过滤掉已结束的期，
 * 历史期因此不可见；这里保留全部已开期，由 getCurrentRounds / getHistoryRounds
 * 再做划分，以便界面对历史期与当前期分开呈现。
 * @param {number} season
 * @param {number} nowMs
 * @returns {number[]} 已开期的期号列表（升序，含历史期）
 */
export function getAvailableRounds(season, nowMs) {
  const roundMap = seasonRoundMap.get(season);
  if (!roundMap)
    return [];
  const result = [];
  for (const round of [...roundMap.keys()].sort((a, b) => a - b)) {
    const start = getRoundSignStartTime(round, season);
    if (!Number.isFinite(start))
      continue;
    if (nowMs < start)
      break;
    result.push(round);
  }
  return result;
}

/**
 * 当前进行中的期（已开始且末场未结束），升序。
 * @param {number} season
 * @param {number} nowMs
 * @returns {number[]} 进行中的期号列表（升序）
 */
export function getCurrentRounds(season, nowMs) {
  return getAvailableRounds(season, nowMs).filter(
    (round) => !isRoundEnded(round, season, nowMs),
  );
}

/**
 * 历史期（已开过且末场已结束），升序。
 * @param {number} season
 * @param {number} nowMs
 * @returns {number[]} 已结束的历史期号列表（升序）
 */
export function getHistoryRounds(season, nowMs) {
  return getAvailableRounds(season, nowMs).filter((round) =>
    isRoundEnded(round, season, nowMs),
  );
}

/** 该期是否处于报名窗口内（等价客户端 checkDuringSignUp） */
export const checkDuringSignUp = (round, season, nowMs) => {
  for (const conf of getRoundSchedules(round, season)) {
    if (!conf.signStartTime || !conf.signEndTime)
      continue;
    const zero = getDateZeroTime(conf.date);
    if (!Number.isFinite(zero))
      continue;
    if (
      nowMs >= zero + conf.signStartTime * 1000
      && nowMs <= zero + conf.signEndTime * 1000
    ) {
      return true;
    }
  }
  return false;
};

/**
 * 默认展示的期号（等价客户端 ApexPanel._getInitialPhaseIndex）。
 *
 * 判定顺序：
 *   1) 处于报名窗口内的期 → 取该期；
 *   2) 决赛尚未结束、或已结束但未到结算时刻（决赛次日 0 点）的期 → 取该期；
 *   3) 都不满足 → 回退到第 1 期（客户端 _getEarliestUnfinishedPhaseIndex 恒返回 0）。
 *
 * 有意简化：客户端在 1) 之前还有一步「报名期避让」（checkIsSignUp +
 * getPhaseState），依赖报名表 TEAM_UP.getTeamInfoByType 与数百行阶段判定，
 * 本实现无法取得该状态，故不做避让，直接按窗口判定。此处差异只影响「玩家已淘汰
 * 且正处于新报名期」这一种情形下的默认期号，不影响各期本身的可押判定。
 *
 * @param {number[]} availableRounds
 * @param {number} season
 * @param {number} nowMs
 * @returns {number|null} 默认展示的期号；无可用期时为 null
 */
export function getInitialRound(availableRounds, season, nowMs) {
  if (!availableRounds.length)
    return null;

  for (const round of availableRounds) {
    if (checkDuringSignUp(round, season, nowMs))
      return round;
  }

  for (const round of availableRounds) {
    const final = getRoundSchedules(round, season).find(
      (c) => c.stage === ApexStage.TAOTAI_2,
    );
    if (!final)
      continue;
    if (getScheduleStatus(final.id, nowMs) !== ApexScheduleStatus.Completed) {
      return round;
    }
    // 决赛已打完但未到结算时刻（决赛次日 0 点）时，该期仍视为当前期
    const settle = getRoundSettleTime(round, season);
    if (Number.isFinite(settle) && nowMs <= settle)
      return round;
  }

  return availableRounds[0];
}
