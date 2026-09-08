export function getClubRankPosition(startRank, index) {
  const normalizedStartRank = Number.isFinite(Number(startRank))
    ? Number(startRank)
    : 1;
  return normalizedStartRank + index;
}

export function getClubRankMedal(position) {
  if (position === 1)
    return "gold";
  if (position === 2)
    return "silver";
  if (position === 3)
    return "bronze";
  return "";
}

export function getClubAllianceClass(alliance) {
  const classByAlliance = {
    大联盟: "alliance-large",
    梦盟: "alliance-dream",
    正义联盟: "alliance-xin-justice",
    龙盟: "alliance-dragon",
    曦盟: "alliance-xi",
    未知联盟: "alliance-unknown",
  };
  return classByAlliance[alliance] || "alliance-other";
}

export function getClubRedQuenchClass(redQuench) {
  if (redQuench >= 60)
    return "redquench-high";
  if (redQuench >= 50)
    return "redquench-medium";
  return "redquench-low";
}
