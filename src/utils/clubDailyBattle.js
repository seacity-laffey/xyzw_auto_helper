const GAME_TIME_ZONE = "Asia/Shanghai";

// ClubWarSlotConf: each theater has ten positions; 3 is commander, 2/4/8 are generals.
export function getTodayClubBattleOpponent(response, date = new Date()) {
  const body = response?.body || response || {};
  const day = getClubBattleDayKey(date);
  const utcDay = Date.UTC(2000 + Number(day.slice(0, 2)), Number(day.slice(2, 4)) - 1, Number(day.slice(4, 6)));
  const weekday = new Date(utcDay).getUTCDay();
  if (![2, 3, 4].includes(weekday))
    return null;
  const monday = new Date(utcDay - (weekday - 1) * 86400000);
  const phase = `${String(monday.getUTCFullYear()).slice(-2)}${String(monday.getUTCMonth() + 1).padStart(2, "0")}${String(monday.getUTCDate()).padStart(2, "0")}`;
  if (String(body.club?.phase) !== phase)
    return null;
  const club = body.club?.oppoMap?.[weekday];
  if (!club)
    return null;
  return {
    ...club,
    regions: Array.from({ length: 3 }, (_, region) => ({
      id: region + 1,
      slots: Array.from({ length: 10 }, (_, position) => {
        const slot = region * 10 + position + 1;
        return {
          slot,
          title: position === 2 ? "统帅" : [1, 3, 7].includes(position) ? "骁将" : "先锋",
          member: club.defenders?.[slot] || null,
        };
      }),
    })),
  };
}

export function getClubBattleDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: GAME_TIME_ZONE,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}${values.month}${values.day}`;
}

export function getTodayClubBattleStats(response, date = new Date()) {
  const body = response?.body || response || {};
  const dayKey = getClubBattleDayKey(date);
  const today = body.siege?.attackMap?.[dayKey] || {};
  const attackCount = Math.max(0, Number(today.attackCnt) || 0);
  const successCount = Math.max(0, Number(today.aSuccessCnt) || 0);

  return {
    dayKey,
    attackCount,
    successCount,
    successRate:
      attackCount > 0
        ? Math.min(100, Math.round((successCount / attackCount) * 100))
        : 0,
    personalScore: Math.max(0, Number(body.siege?.score) || 0),
    clubDayScore: Math.max(0, Number(body.club?.dayScore) || 0),
  };
}

export function getClubBattleMembers(response) {
  const body = response?.body || response || {};
  const members = body.club?.members;
  if (!members || typeof members !== "object")
    return [];

  return Object.values(members)
    .filter((member) => member && (member.roleId || member.id))
    .map((member) => ({
      roleId: String(member.roleId || member.id),
      name: member.name || `成员 ${member.roleId || member.id}`,
      headImg: member.headImg || "",
    }));
}

export function buildClubBattleExportRows(response, statsByRoleId = new Map()) {
  return getClubBattleMembers(response).map((member) => {
    const stats
      = statsByRoleId instanceof Map
        ? statsByRoleId.get(member.roleId)
        : statsByRoleId[member.roleId];

    return {
      ...member,
      successCount: stats?.successCount ?? null,
      attackCount: stats?.attackCount ?? null,
      available: Boolean(stats),
    };
  });
}

export function getClubBattleTargetIds(response) {
  const body = response?.body || response || {};
  const targetIds = new Set();

  Object.values(body.club?.oppoMap || {}).forEach((opponent) => {
    Object.values(opponent?.defenders || {}).forEach((defender) => {
      const hasBattleRecord
        = Number(defender?.challengeCnt) > 0
          || Number(defender?.failCnt) > 0
          || defender?.defeated === true;
      if (hasBattleRecord && defender?.roleId)
        targetIds.add(String(defender.roleId));
    });
  });

  return [...targetIds];
}

const memberKey = (member) => `${member.roleId}${member.mirror === true ? ":mirror" : ""}`;

export function getClubBattleRecordTargets(members) {
  const targets = new Map();
  for (const member of Object.values(members || {})) {
    if (!member?.roleId)
      continue;
    if (Number(member.challengeCnt) > 0 || Number(member.failCnt) > 0 || member.defeated === true) {
      targets.set(memberKey(member), { targetId: String(member.roleId), targetIsMirror: member.mirror === true });
    }
  }
  return [...targets.values()];
}

export function buildOpponentClubBattleRows(response, recordResponses, date = new Date(), { complete = true } = {}) {
  const opponent = getTodayClubBattleOpponent(response, date);
  if (!opponent)
    return [];
  const stats = aggregateClubBattleRecordStats(recordResponses, date, { separateMirrors: true });
  const members = new Map();
  for (const member of Object.values(opponent.defenders || {})) {
    if (!member?.roleId)
      continue;
    const key = memberKey(member);
    const count = stats.get(key) || (complete ? { successCount: 0, attackCount: 0 } : null);
    members.set(key, {
      key,
      roleId: String(member.roleId),
      name: `${member.mirror ? "[镜像] " : ""}${member.name || `成员 ${member.roleId}`}`,
      headImg: member.headImg || "",
      successCount: count?.successCount ?? null,
      attackCount: count?.attackCount ?? null,
      available: Boolean(count),
      partial: !complete,
    });
  }
  return [...members.values()];
}

export function aggregateClubBattleRecordStats(recordResponses, date = new Date(), { separateMirrors = false } = {}) {
  const dayKey = getClubBattleDayKey(date);
  const statsByRoleId = new Map();
  const seenRecords = new Set();

  recordResponses.forEach((source) => {
    const body = source?.body || source?.response?.body || source?.response || source || {};
    const targetId = String(source?.targetId || "");

    (Array.isArray(body.records) ? body.records : []).forEach((record, index) => {
      if (!record?.roleId || !record.created)
        return;

      const timestamp = Number(record.created);
      const recordDate = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp);
      if (
        Number.isNaN(recordDate.getTime())
        || getClubBattleDayKey(recordDate) !== dayKey
      ) {
        return;
      }

      const recordKey
        = record.recordName
          || `${targetId}:${Boolean(source.targetIsMirror)}:${memberKey(record)}:${record.created}:${index}`;
      if (seenRecords.has(recordKey))
        return;
      seenRecords.add(recordKey);

      const roleId = separateMirrors ? memberKey(record) : String(record.roleId);
      const stats = statsByRoleId.get(roleId) || {
        successCount: 0,
        attackCount: 0,
      };
      stats.attackCount++;
      // 这是据点的防守记录；防守方失败即表示该成员进攻成功。
      if (record.isWin === false)
        stats.successCount++;
      statsByRoleId.set(roleId, stats);
    });
  });

  return statsByRoleId;
}
