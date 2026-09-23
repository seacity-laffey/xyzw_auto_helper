import { APEX_TAOTAI_STAGES, apexScheduleMap } from "./apexStageMap.js";
import {
  ApexScheduleStatus,
  ApexStage,
  ApexStageType,
  formatMonthDay,
  getDateZeroTime,
  getRoundSchedules,
} from "./apexScheduleData.js";

// ==================== 核心判定 ====================

/**
 * 单场赛程状态（等价客户端 ApexScheduleData.getScheduleStatus）。
 *
 * 门槛：同一天有多场时，必须等前一场结束（prev.endTime）才解锁本场。
 *
 * @param {number|string} scheduleId
 * @param {number} nowMs 服务端当前时间（毫秒）
 * @returns {number} ApexScheduleStatus
 */
export function getScheduleStatus(scheduleId, nowMs) {
  const conf = apexScheduleMap[scheduleId];
  if (!conf)
    return ApexScheduleStatus.None;
  const dayZero = getDateZeroTime(conf.date);
  if (!Number.isFinite(dayZero))
    return ApexScheduleStatus.None;

  const list = getRoundSchedules(conf.round, conf.season);
  const idx = list.findIndex((c) => c.id === Number(scheduleId));
  const prev = idx > 0 ? list[idx - 1] : null;
  const gate
    = prev && prev.date === conf.date ? dayZero + prev.endTime * 1000 : -Infinity;

  const lockAt = dayZero + conf.lockTime * 1000;
  const fightAt = dayZero + conf.fightTime * 1000;
  const endAt = dayZero + conf.endTime * 1000;

  if (nowMs < gate || nowMs < dayZero)
    return ApexScheduleStatus.None;
  if (nowMs < lockAt)
    return ApexScheduleStatus.Unlocked;
  if (nowMs < fightAt)
    return ApexScheduleStatus.Locked;
  if (nowMs < endAt)
    return ApexScheduleStatus.Fighting;
  return ApexScheduleStatus.Completed;
}

/**
 * 赛程解锁基准时刻（等价客户端 getScheduleEnableBaseTime）：
 * 当日 0 点 → 同日前一场的结束时刻 → 与报名结束时刻取较晚者。
 */
export const getScheduleEnableBaseTime = (list, idx, dayZero, conf) => {
  let base = dayZero;
  const prev = idx > 0 ? list[idx - 1] : null;
  if (prev && prev.date === conf.date)
    base = dayZero + prev.endTime * 1000;
  if (conf.signEndTime > 0) {
    base = Math.max(base, dayZero + conf.signEndTime * 1000);
  }
  return base;
};

/** 构造阶段窗口（等价客户端 _createScheduleInfo） */
export const createScheduleInfo = (
  type,
  nowMs,
  enableBase,
  start,
  end,
  extra,
) => {
  const valid
    = Number.isFinite(enableBase)
      && Number.isFinite(start)
      && Number.isFinite(end)
      && end > 0;
  const info = {
    type,
    isEnable: valid && nowMs >= enableBase,
    isStarted: valid && nowMs >= start,
    isEnded: valid && nowMs >= end,
    startDate: valid ? formatMonthDay(start) : "",
    endDate: valid ? formatMonthDay(end) : "",
    enableBaseTime: valid ? enableBase : 0,
    startTime: valid ? start : 0,
    endTime: valid ? end : 0,
  };
  if (extra !== undefined)
    info.extra = extra;
  return info;
};

/**
 * 取某期各阶段（报名 / 海选 / 预选 / 正式 / 淘汰）的时间窗口与开启状态。
 * 等价客户端 ApexScheduleData.getStageInfoByRound。
 * @param {number} round
 * @param {number} season
 * @param {number} nowMs
 * @returns {Record<number, object>} key 为 ApexStageType
 */
export function getStageInfoByRound(round, season, nowMs) {
  const info = {
    [ApexStageType.SignUp]: createScheduleInfo(ApexStageType.SignUp, nowMs),
    [ApexStageType.HaiXuan]: createScheduleInfo(ApexStageType.HaiXuan, nowMs),
    [ApexStageType.YuXuan]: createScheduleInfo(ApexStageType.YuXuan, nowMs),
    [ApexStageType.ZhengShi]: createScheduleInfo(ApexStageType.ZhengShi, nowMs),
    [ApexStageType.TaoTai]: createScheduleInfo(ApexStageType.TaoTai, nowMs),
  };

  const list = getRoundSchedules(round, season);
  if (!list.length)
    return info;

  // 报名窗口：取「已开始且开始时刻最晚」的报名条（等价 _resolveSignUpStageConf）
  let signConf = null;
  let signStartAt = 0;
  for (const conf of list) {
    if (!conf.signStartTime)
      continue;
    const dayZero = getDateZeroTime(conf.date);
    if (!Number.isFinite(dayZero))
      continue;
    const startAt = dayZero + conf.signStartTime * 1000;
    if (nowMs > startAt && startAt > signStartAt) {
      signStartAt = startAt;
      signConf = conf;
    }
  }
  if (signConf) {
    const endAt = getDateZeroTime(signConf.date) + signConf.signEndTime * 1000;
    const title
      = signConf.stage === ApexStage.HAIXUAN
        ? "海选报名"
        : signConf.stage === ApexStage.YUXUAN
          ? "预选报名"
          : undefined;
    info[ApexStageType.SignUp] = createScheduleInfo(
      ApexStageType.SignUp,
      nowMs,
      signStartAt,
      signStartAt,
      endAt,
      title ? { title } : undefined,
    );
  }

  // 各阶段窗口聚合：[最早解锁基准, 最早开赛, 最晚结束]
  const acc = {
    [ApexStageType.HaiXuan]: [Infinity, Infinity, 0],
    [ApexStageType.YuXuan]: [Infinity, Infinity, 0],
    [ApexStageType.ZhengShi]: [Infinity, Infinity, 0],
    [ApexStageType.TaoTai]: [Infinity, Infinity, 0],
  };
  list.forEach((conf, i) => {
    const bucket
      = conf.stage === ApexStage.HAIXUAN
        ? acc[ApexStageType.HaiXuan]
        : conf.stage === ApexStage.YUXUAN
          ? acc[ApexStageType.YuXuan]
          : conf.stage === ApexStage.ZHENGSHI
            ? acc[ApexStageType.ZhengShi]
            : APEX_TAOTAI_STAGES.includes(conf.stage)
              ? acc[ApexStageType.TaoTai]
              : null;
    if (!bucket)
      return;
    const dayZero = getDateZeroTime(conf.date);
    if (!Number.isFinite(dayZero))
      return;
    bucket[0] = Math.min(
      bucket[0],
      getScheduleEnableBaseTime(list, i, dayZero, conf),
    );
    bucket[1] = Math.min(bucket[1], dayZero + conf.fightTime * 1000);
    bucket[2] = Math.max(bucket[2], dayZero + conf.endTime * 1000);
  });
  for (const type of Object.keys(acc)) {
    const [base, start, end] = acc[type];
    info[Number(type)] = createScheduleInfo(
      Number(type),
      nowMs,
      base,
      start,
      end,
    );
  }
  return info;
}
