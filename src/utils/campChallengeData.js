import {
  aggregateClubBattleRecordStats,
  getClubBattleDayKey,
} from "./clubDailyBattle.js";

export function getCampMatchDate(phase, weekday) {
  if (!/^\d{6}$/.test(String(phase)) || ![2, 3, 4].includes(Number(weekday)))
    return null;
  const text = String(phase);
  return new Date(
    Date.UTC(
      2000 + Number(text.slice(0, 2)),
      Number(text.slice(2, 4)) - 1,
      Number(text.slice(4, 6)) + Number(weekday) - 1,
      4,
    ),
  );
}
export function getCampRecordRows(records, phase, day) {
  const date = getCampMatchDate(phase, day);
  if (!date)
    return [];
  return (records || []).filter((record) => {
    const time = Number(record.created);
    if (!time)
      return false;
    const dateValue = new Date(time < 1e12 ? time * 1000 : time);
    return (
      Number.isFinite(dateValue.getTime())
      && getClubBattleDayKey(dateValue) === getClubBattleDayKey(date)
    );
  });
}
export function buildCampMembers(
  members,
  recordResponses,
  date,
  complete = true,
) {
  const stats = date
    ? aggregateClubBattleRecordStats(recordResponses, date)
    : new Map();
  return Object.entries(members || {}).map(([slot, member]) => {
    const roleId = String(member.roleId || member.id || "");
    // 镜像防守据点不继承本体的主动进攻统计。
    const attacks = member.mirror ? null : stats.get(roleId);
    const count = Math.max(0, Number(member.challengeCnt) || 0);
    const wins = Math.min(count, Math.max(0, Number(member.failCnt) || 0));
    return {
      ...member,
      roleId,
      slot,
      key: `${slot}:${roleId}:${Boolean(member.mirror)}`,
      defenseWins: wins,
      defenseCount: count,
      defenseRate: count ? `${Math.round((wins / count) * 100)}%` : "—",
      attacks: member.mirror
        ? "—"
        : attacks
          ? `${complete ? "" : "≥"}${attacks.successCount}/${complete ? "" : "≥"}${attacks.attackCount}`
          : complete
            ? "0/0"
            : "未知",
    };
  });
}
