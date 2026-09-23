import {
  apexConstantConf,
  apexScheduleMap,
  apexSeasonConf,
  apexStageNames,
} from "./apexStageMap.js";

export { apexConstantConf };

export const DAY_MS = 86400000;

export const WEEK_MS = 7 * DAY_MS;

export const DATE_RE = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;

/** 单场赛程状态。数值与客户端 EApexScheduleStatus 完全一致。 */
export const ApexScheduleStatus = {
  None: 0, // 尚未解锁（未到当日 0 点 / 同日前一场未结束）
  Unlocked: 1, // 已解锁：竞猜开放中（可押注）
  Locked: 2, // 阵容已锁定（开赛前 1 小时，仍可押注）
  Fighting: 3, // 比赛进行中（禁止押注）
  Completed: 4, // 已结束（禁止押注）
};

/** 阶段类型。数值与客户端 EApexStageType 完全一致。 */
export const ApexStageType = {
  SignUp: 0,
  HaiXuan: 1,
  YuXuan: 2,
  ZhengShi: 3,
  TaoTai: 4,
};

/**
 * 期（round）所处阶段 —— 用于区分「历史期 / 当前期」。
 *
 * 客户端只有 getAvailableRounds 一个概念，无法区分已结束与进行中；
 * 本引擎按其真实赛程时间补齐该判定（全部由配置推导，无硬编码）。
 */
export const ApexRoundPhase = {
  Upcoming: 0, // 未开始：报名尚未开放
  Ongoing: 1, // 进行中：已开始且末场未结束
  Ended: 2, // 已结束：该期末场（决赛）已打完
};

/** 客户端 ApexStage 枚举（配置表 ApexScheduleConf.ApexStage 取值） */
export const ApexStage = {
  HAIXUAN: 1,
  YUXUAN: 2,
  ZHENGSHI: 3,
  TAOTAI_64: 4,
  TAOTAI_32: 5,
  TAOTAI_16: 6,
  TAOTAI_8: 7,
  TAOTAI_4: 8,
  TAOTAI_3: 9, // 季军赛：advanceNum 恒为 1
  TAOTAI_2: 10, // 决赛
};

// ==================== 基础时间工具 ====================

/**
 * 服务端日期字符串转「当地 0 点」毫秒时间戳（等价客户端 DateUtil.getServerDayTime）。
 * @param {string} dateText 形如 "2026/09/21"
 * @returns {number} 无法解析时返回 NaN
 */
export function getDateZeroTime(dateText) {
  const m = DATE_RE.exec(String(dateText || "").trim());
  if (!m)
    return Number.NaN;
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    0,
    0,
    0,
    0,
  ).getTime();
}

/** 格式化 "M月D日"（等价客户端 DateUtil.formatMonthDay） */
export const formatMonthDay = (ms) => {
  const d = new Date(ms);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

/**
 * 用服务端 resetTime.day（YYMMDD）校准本地时钟，得到可用的「服务端当前时间」。
 *
 * resetTime 只提供 day / week / month / season，无时分秒，因此按「日偏差」校准：
 * 时分秒沿用本地时钟。lockTime 与 fightTime 恒相差 1 小时（配置 312/312 一致），
 * 日级校准足以支撑锁定与开赛判定。
 *
 * day 的格式判定严格对齐客户端 RolePetShop._isCurrentResetPeriod：
 *   ① 必须是「6 位纯数字」（客户端 `/^\d{6}$/` 测试）——长度不足、含空格 / 斜杠 /
 *      字母、或长度超过 6 位一律视为不可用；
 *   ② 解析出的时间戳必须是有限值（客户端 `Number.isFinite` 守卫）。
 * 任一不满足即退回本地时间，**绝不返回 NaN**。这一点很关键：本函数的返回值在视图里
 * 直接充当 serverNowMs，一旦为 NaN，getCurrentSeason 会返回 -1、getCurrentRounds
 * 会把全部期都当成进行中、getHistoryRounds 会清空、getScheduleStatus 会把每一场都
 * 判成已完成，界面整体失真。
 *
 * 注：`Number.isFinite` 守卫不能省。new Date(2000+yy, mm-1, dd) 对 yy 为 NaN 时
 * 返回 Invalid Date（getTime() = NaN），而 yy 来自 day.slice(0, 2)，因此只有
 * 「6 位纯数字」的先决条件才能保证 yy/mm/dd 三个 Number() 都是有限数。
 *
 * @param {number} localNowMs 本地当前时间（毫秒）
 * @param {string|number} dayStr 服务端 resetTime.day，形如 "260915" 或 260915
 * @returns {number} 校准后的服务端当前时间（毫秒）；day 不可用时原样返回 localNowMs
 */
export function calibrateServerTime(localNowMs, dayStr) {
  const day = String(dayStr ?? "");
  // ① 客户端同款格式闸门：严格 6 位纯数字
  if (!/^\d{6}$/.test(day)) {
    return localNowMs;
  }

  const yy = Number(day.slice(0, 2));
  const mm = Number(day.slice(2, 4));
  const dd = Number(day.slice(4, 6));

  const serverToday = new Date(2000 + yy, mm - 1, dd, 0, 0, 0, 0).getTime();
  // ② 客户端同款有限性闸门
  if (!Number.isFinite(serverToday)) {
    return localNowMs;
  }

  const now = new Date(localNowMs);
  const localToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
  return localNowMs + (serverToday - localToday);
}

/** 本周一 0 点（等价客户端 DateUtil.thisWeek，周一为一周起始） */
export const thisWeekStart = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime() - ((d.getDay() || 7) - 1) * DAY_MS;
};

// ==================== 配置索引 ====================

/** 全部赛程配置，按 id 升序（等价客户端 ApexScheduleConf.list 顺序） */
export const allSchedules = Object.keys(apexScheduleMap)
  .map(Number)
  .sort((a, b) => a - b)
  .map((id) => ({ id, ...apexScheduleMap[id] }));

/** season -> round -> 该期配置列表（按 id 升序） */
export const seasonRoundMap = new Map();

for (const conf of allSchedules) {
  if (!seasonRoundMap.has(conf.season))
    seasonRoundMap.set(conf.season, new Map());
  const roundMap = seasonRoundMap.get(conf.season);
  if (!roundMap.has(conf.round))
    roundMap.set(conf.round, []);
  roundMap.get(conf.round).push(conf);
}

/** 阶段简单名，如「64强赛」 */
export const getStageName = (stage) =>
  apexStageNames[stage]?.simpleName || `阶段${stage}`;

/**
 * 取某赛季某期的全部赛程配置。
 *
 * seasonRoundMap 的键由配置快照预置为 Number，而调用方传进来的期号可能来自
 * 界面的字符串（如下拉项的 value），故入口显式 Number 归一后再查表。
 * @param {number|string} round
 * @param {number|string} season
 * @returns {Array<object>} 该期全部赛程配置，按 id 升序
 */
export function getRoundSchedules(round, season) {
  return seasonRoundMap.get(Number(season))?.get(Number(round)) || [];
}

/**
 * 按 scheduleId 取配置（跨赛季安全，无需知道期号）。
 *
 * 注：apexScheduleMap 是普通对象，键为字符串形式的 id，用 `map[scheduleId]` 访问时
 * JS 会自动把数字键转字符串，故 number / string 两种入参都能命中（与客户端
 * ApexScheduleConf.getById 的字符串查表行为一致）。返回前把 id 归一为 Number，
 * 便于调用方直接与配置里的数值 id 比较。
 * @param {number|string} scheduleId
 * @returns {object|null} 形如 { id, round, season, stage, date, ... }
 */
export function getScheduleConf(scheduleId) {
  const conf = apexScheduleMap[scheduleId];
  return conf ? { id: Number(scheduleId), ...conf } : null;
}

/**
 * 当前赛季配置（起止日期 / 报名门槛），供界面提示与赛季更新检测使用。
 * @param {number} season
 * @returns {object|null} 赛季配置；赛季不存在时为 null
 */
export const getSeasonConf = (season) => apexSeasonConf[season] || null;
