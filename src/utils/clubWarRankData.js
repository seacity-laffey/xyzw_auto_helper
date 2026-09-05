export function createEmptyClubRankEntry(club) {
  return {
    ...club,
    redQuench: 0,
    power: 0,
    announcement: "未知",
    redno: 0,
    redno1: "0红",
    redno2: "0红",
    redno3: "0红",
    hb1: 0,
    hb2: 0,
    hb3: 0,
    topHeroes: [],
    level: 30,
  };
}

function countHolyBeasts(heroes) {
  return Object.values(heroes || {}).filter(
    (hero) => hero?.hB?.active !== undefined,
  ).length;
}

export async function loadClubWarRankDetails(
  clubs,
  { fetchClubDetail, fetchRoleInfo, getHeroInfo, getLineupType, onClubError },
) {
  return Promise.all(
    clubs.map(async (club) => {
      try {
        const detail = await fetchClubDetail(club.id);
        if (!detail?.legionData)
          return createEmptyClubRankEntry(club);

        const topHeroes = [];
        for (const [roleId, memberData] of Object.entries(
          detail.legionData.members || {},
        )) {
          const roleResult = await fetchRoleInfo(roleId);
          const heroes = roleResult?.roleInfo?.heroes || {};
          topHeroes.push({
            id: roleId,
            name: memberData.name || memberData.custom?.name || "未知",
            headImg: memberData.headImg || memberData.custom?.headImg || "",
            power: roleResult?.roleInfo?.power || 0,
            redQuench: memberData.custom?.red_quench_cnt || 0,
            holyBeast: countHolyBeasts(heroes),
            lineupType: getLineupType(getHeroInfo(heroes).heroList || []),
          });
        }
        topHeroes.sort((left, right) => right.redQuench - left.redQuench);
        const leaders = topHeroes.slice(0, 3);
        const redCounts = leaders.map((hero) => `${hero.redQuench}红`);
        const holyBeastCounts = leaders.map((hero) => hero.holyBeast);

        return {
          ...club,
          redQuench: detail.legionData.quenchNum || 0,
          power: detail.legionData.power || 0,
          announcement: detail.legionData.announcement || 0,
          redno: redCounts,
          redno1: redCounts[0] || "0红",
          redno2: redCounts[1] || "0红",
          redno3: redCounts[2] || "0红",
          hb1: holyBeastCounts[0] || 0,
          hb2: holyBeastCounts[1] || 0,
          hb3: holyBeastCounts[2] || 0,
          topHeroes: leaders,
          level: 30,
        };
      } catch (error) {
        onClubError?.(club, error);
        return createEmptyClubRankEntry(club);
      }
    }),
  );
}

export function sortClubRanksByDominantAlliance(clubs, resolveAlliance) {
  const withAlliance = clubs.map((club) => ({
    ...club,
    alliance: resolveAlliance(club.announcement),
  }));
  const groups = new Map();

  withAlliance.forEach((club) => {
    const group = groups.get(club.alliance) || [];
    group.push(club);
    groups.set(club.alliance, group);
  });

  for (const members of groups.values()) {
    members.sort((left, right) =>
      (right.redQuench || 0) - (left.redQuench || 0),
    );
  }

  const alliances = [...groups.keys()];
  const dominantAlliance = alliances.reduce((dominant, alliance) =>
    !dominant || groups.get(alliance).length > groups.get(dominant).length
      ? alliance
      : dominant, "");
  const orderedAlliances = [
    dominantAlliance,
    ...alliances
      .filter((alliance) => alliance !== dominantAlliance)
      .sort((left, right) => left.localeCompare(right, "zh-CN")),
  ].filter(Boolean);
  return orderedAlliances.flatMap((alliance) => groups.get(alliance));
}
