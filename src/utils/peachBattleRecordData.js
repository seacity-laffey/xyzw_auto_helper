const numberValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const byDescending = (field) => (left, right) =>
  numberValue(right?.[field]) - numberValue(left?.[field]);

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
};

export function getLastPeachBattleSunday(now = new Date()) {
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 && now.getHours() < 18
    ? 7
    : dayOfWeek;
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() - daysToSubtract);
  return formatDate(targetDate);
}

export function formatPeachBattleDateKey(date) {
  const parts = String(date || "").split("/");
  if (parts.length !== 3)
    return String(date || "");
  return `${parts[0].slice(2)}${parts[1]}${parts[2]}`;
}

export function formatPeachBattlePower(power) {
  const amount = numberValue(power);
  if (amount >= 100000000)
    return `${(amount / 100000000).toFixed(2)}亿`;
  if (amount >= 10000)
    return `${(amount / 10000).toFixed(2)}万`;
  return String(amount);
}

export function getPeachBattlePercent(value, maximum) {
  const max = numberValue(maximum);
  if (!max)
    return 0;
  return Math.max(0, Math.min(100, (numberValue(value) / max) * 100));
}

export function createPeachBattleClubSummary({
  fallbackName,
  id,
  legionInfo,
  records,
}) {
  const data = legionInfo?.legionData || {};
  const members = (Array.isArray(records) ? records : []).map((record) => {
    const killCnt = numberValue(record?.killCnt);
    const reviveCnt = numberValue(record?.reviveCnt);
    return {
      ...record,
      carCnt: numberValue(record?.carCnt),
      kd: reviveCnt ? Number((killCnt / reviveCnt).toFixed(2)) : 0,
      killCnt,
      mCKCnt: numberValue(record?.mCKCnt),
      reviveCnt,
      roleInfo: record?.roleInfo || {},
    };
  });
  const killRank = [...members].sort(byDescending("killCnt"));
  const kdRank = [...members].sort(byDescending("kd"));
  const reviveRank = [...members].sort(byDescending("reviveCnt"));
  const killStreakRank = [...members].sort(byDescending("mCKCnt"));
  const totalKills = members.reduce((total, member) => total + member.killCnt, 0);
  const totalRevives = members.reduce(
    (total, member) => total + member.reviveCnt,
    0,
  );

  return {
    announcement: data.announcement || "",
    averageKills: members.length
      ? (totalKills / members.length).toFixed(1)
      : "0.0",
    godRank: killRank,
    id,
    kdRank,
    killRank,
    killStreakRank,
    level: numberValue(data.level),
    logo: data.logo || "",
    maxKills: Math.max(0, ...members.map((member) => member.killCnt)),
    memberCount: members.length,
    name: data.name || fallbackName,
    quenchNum: numberValue(data.quenchNum),
    reviveRank,
    serverId: data.serverId || "",
    totalKD: totalRevives
      ? Number((totalKills / totalRevives).toFixed(2))
      : 0,
    totalKills,
    totalPower: members.reduce(
      (total, member) => total + numberValue(member.roleInfo?.power),
      0,
    ),
    totalRevives,
  };
}

const getClubRecords = (recordsMap, legionId) => {
  if (!recordsMap || legionId === undefined || legionId === null)
    return [];
  return recordsMap[legionId] || recordsMap[Number(legionId)] || [];
};

export function createPeachBattleRecords({
  firstLegionId,
  firstLegionInfo,
  killRecord,
  secondLegionId,
  secondLegionInfo,
}) {
  return {
    opponentClub: createPeachBattleClubSummary({
      fallbackName: "敌方俱乐部",
      id: secondLegionId,
      legionInfo: secondLegionInfo,
      records: getClubRecords(killRecord?.recordsMap, secondLegionId),
    }),
    ownClub: createPeachBattleClubSummary({
      fallbackName: "我方俱乐部",
      id: firstLegionId,
      legionInfo: firstLegionInfo,
      records: getClubRecords(killRecord?.recordsMap, firstLegionId),
    }),
  };
}
