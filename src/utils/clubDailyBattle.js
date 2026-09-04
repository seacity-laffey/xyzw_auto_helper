const GAME_TIME_ZONE = "Asia/Shanghai";

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

export function aggregateClubBattleRecordStats(recordResponses, date = new Date()) {
  const dayKey = getClubBattleDayKey(date);
  const statsByRoleId = new Map();
  const seenRecords = new Set();

  recordResponses.forEach((source) => {
    const body = source?.body || source?.response?.body || source?.response || source || {};
    const targetId = String(source?.targetId || "");

    (body.records || []).forEach((record, index) => {
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
          || `${targetId}:${record.roleId}:${record.created}:${index}`;
      if (seenRecords.has(recordKey))
        return;
      seenRecords.add(recordKey);

      const roleId = String(record.roleId);
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
