export function getPendingEvoTowerRewardCount(evoTower) {
  const towerId = Number(evoTower?.towerId ?? 0);
  const rewardTowerId = Number(evoTower?.rewardTowerId ?? 0);
  if (!Number.isFinite(towerId) || towerId <= 0)
    return 0;
  return Math.max(0, Math.floor(towerId / 10) - rewardTowerId);
}
