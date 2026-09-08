type BooleanMap = Record<string | number, boolean | undefined> | null | undefined;
type NumericMap = Record<string | number, number | undefined> | null | undefined;

const toTimestamp = (value: unknown) => {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
};

export const isTimestampToday = (value: unknown, now = new Date()) => {
  const timestamp = toTimestamp(value);
  if (!timestamp)
    return false;
  return new Date(timestamp * 1000).toDateString() === now.toDateString();
};

export const canDrawFreeGacha = (statistics: NumericMap, now = new Date()) =>
  [2, 4, 6].includes(now.getDay())
  && !isTimestampToday(statistics?.["gacha:free"], now);

export const getRemainingFreeSweepTickets = (
  statistics: NumericMap,
  statisticsTime: NumericMap,
  now = new Date(),
) => {
  if (!statistics || !statisticsTime)
    return 0;
  const count = Number(statistics["genie:sweep:buy"] ?? 0);
  const timestamp = toTimestamp(statisticsTime["genie:sweep:buy"]);
  if (!Number.isInteger(count) || count < 0 || (count > 0 && !timestamp))
    return 0;
  return isTimestampToday(timestamp, now) ? Math.max(0, 3 - count) : 3;
};

export const canStartDailyDungeon = (
  dungeon: {
    beginTime?: number;
    id?: number;
    battleTeam?: Record<string, { heroId?: number } | number> | null;
  } | null | undefined,
  now = new Date(),
) => {
  const day = now.getDay();
  if (![0, 1, 3, 4].includes(day) || !dungeon)
    return false;
  const beginTime = Number(dungeon.beginTime);
  if (!Number.isFinite(beginTime) || beginTime < 0)
    return false;
  // 周日与周一、周三与周四分别属于同一期梦境。
  const periodStart = new Date(now);
  periodStart.setHours(0, 0, 0, 0);
  periodStart.setDate(periodStart.getDate() - (day === 1 || day === 4 ? 1 : 0));
  if (beginTime * 1000 < periodStart.getTime())
    return true;
  if (beginTime * 1000 > now.getTime())
    return false;
  const hasTeam = Object.values(dungeon.battleTeam || {}).some((hero) =>
    Number(typeof hero === "number" ? hero : hero?.heroId) > 0);
  return !hasTeam && Number(dungeon.id ?? 0) === 0;
};

export const canSweepDeepSea = (
  genie: NumericMap,
  statisticsTime: NumericMap,
  now = new Date(),
) => now.getDay() === 1
  && Number(genie?.[5]) > 0
  && Boolean(statisticsTime)
  && !isTimestampToday(statisticsTime?.["genie:daily:free:5"], now);

export const hasClaimablePointReward = (
  point: unknown,
  claimed: BooleanMap,
  pointStep: number,
  maxRewardId = 5,
) => {
  const earnedCount = Math.min(
    maxRewardId,
    Math.floor(Math.max(0, Number(point) || 0) / pointStep),
  );
  for (let rewardId = 1; rewardId <= earnedCount; rewardId++) {
    if (claimed?.[rewardId] !== true)
      return true;
  }
  return false;
};

export const canClaimSystemSignIn = (signInReward: NumericMap, now = new Date()) =>
  !Object.values(signInReward || {}).some((timestamp) => isTimestampToday(timestamp, now));

export const canClaimClubSignIn = (statisticsTime: NumericMap, now = new Date()) =>
  !isTimestampToday(statisticsTime?.["legion:sign:in"], now);

export const canClaimCardReward = (
  cardTime: Record<string | number, { lastClaimTime?: number } | undefined> | null | undefined,
  cardId: number,
  now = new Date(),
) => {
  const card = cardTime?.[cardId];
  return Boolean(card) && !isTimestampToday(card?.lastClaimTime, now);
};

export const canClaimCollectionFreeReward = (
  response: unknown,
  now = new Date(),
) => {
  const storeInfo = response && typeof response === "object"
    ? (response as Record<string, unknown>).storeInfo
    : null;
  if (!storeInfo || typeof storeInfo !== "object")
    return false;
  return !isTimestampToday((storeInfo as Record<string, unknown>).freeRewardTime, now);
};

export const canClaimDailyDiscount = (response: unknown, discountId = 1) => {
  const discountList = response && typeof response === "object"
    ? (response as Record<string, unknown>).discountList
    : null;
  if (!Array.isArray(discountList))
    return false;
  const discount = discountList.find((item) =>
    item && typeof item === "object"
    && Number((item as Record<string, unknown>).discountId) === discountId);
  if (!discount || typeof discount !== "object")
    return false;
  const state = Number((discount as Record<string, unknown>).discountState);
  return state === 1 || state === 2;
};

export const hasClaimableMailAttachment = (response: unknown) => {
  const list = response && typeof response === "object"
    ? (response as Record<string, unknown>).list
    : null;
  if (!Array.isArray(list))
    return false;
  return list.some((mail) => {
    if (!mail || typeof mail !== "object")
      return false;
    const record = mail as Record<string, unknown>;
    return record.haveAttachments === true
      && Array.isArray(record.attachments)
      && record.attachments.length > 0
      && Number(record.state) !== 3;
  });
};
