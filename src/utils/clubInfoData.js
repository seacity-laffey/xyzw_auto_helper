const numberValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export function formatClubNumber(value) {
  const number = numberValue(value);
  if (number >= 1e12)
    return `${(number / 1e12).toFixed(2)}兆`;
  if (number >= 1e8)
    return `${(number / 1e8).toFixed(2)}亿`;
  if (number >= 1e4)
    return `${(number / 1e4).toFixed(2)}万`;
  return String(number);
}

export function getClubJobLabel(job) {
  if (job === 1)
    return "会长";
  if (job === 2)
    return "副会长";
  return "成员";
}

export function sortClubMembers(members) {
  return [...(Array.isArray(members) ? members : [])].sort((left, right) => {
    const jobRank = (job) => job === 1 ? 1 : job === 2 ? 2 : 99;
    const leftJob = jobRank(left?.job);
    const rightJob = jobRank(right?.job);
    if (leftJob !== rightJob)
      return leftJob - rightJob;

    const redDifference = numberValue(right?.custom?.red_quench_cnt)
      - numberValue(left?.custom?.red_quench_cnt);
    if (redDifference)
      return redDifference;

    return numberValue(right?.power || right?.custom?.s_power)
      - numberValue(left?.power || left?.custom?.s_power);
  });
}

export function findClubLeader(members, leaderId) {
  if (leaderId === undefined || leaderId === null)
    return null;
  return (Array.isArray(members) ? members : []).find(
    (member) => Number(member?.roleId) === Number(leaderId),
  ) || null;
}

const normalizeApplication = (application) => ({
  ...application,
  applyReason: application?.ext?.legion_apply_reason || application?.applyReason || "",
  serverId: application?.ext?.server_id || application?.serverId || "",
});

export function parseClubApplications(response) {
  if (!response || typeof response !== "object")
    return [];
  const source = Array.isArray(response)
    ? response
    : response.roleList || response.applyList || response.list || response.data;
  if (!Array.isArray(source))
    return [];
  return source
    .filter((application) => application?.roleId && application?.name)
    .map(normalizeApplication);
}

export function createClubOverview(info, roleStatistics) {
  const source = info || {};
  const base = source.info || {};
  const boss = base.currentBoss || {};
  const statistics = source.statistics || source.stat || {};
  const roleStats = roleStatistics || {};
  const unfoughtBosses = [];
  for (let bossId = 1; bossId <= 150; bossId += 1) {
    if (!roleStats[`lb:${bossId}`])
      unfoughtBosses.push(bossId);
  }

  return {
    currentBossId: boss.bossId || 0,
    currentHP: formatClubNumber(boss.currentHP || 0),
    dan: base.dan ?? source.dan ?? base.rank ?? source.rank ?? "-",
    lastWarRank: statistics["last:war:rank"]
      ?? statistics.lastWarRank
      ?? statistics["legion:last:war:rank"]
      ?? "-",
    noApply: Boolean(base.noApply ?? source.noApply),
    power: numberValue(base.power ?? source.power ?? base.s_power ?? source.s_power),
    redQuench: numberValue(
      base.redQuenchCnt
      ?? source.redQuenchCnt
      ?? statistics["red:quench"]
      ?? statistics.red_quench,
    ),
    unfoughtBosses,
  };
}
