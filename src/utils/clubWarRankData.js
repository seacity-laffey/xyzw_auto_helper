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

export function filterAndSortClubRanks(
  clubs,
  {
    activeAlliance,
    currentSortType,
    editingSortOrder,
    getMemberAlliance,
    getMemberRank,
    isEditMode,
  },
) {
  const filtered = activeAlliance === "all"
    ? [...clubs]
    : clubs.filter((member) => {
        if (activeAlliance === "空白") {
          return !member.announcement
            || member.announcement === 0
            || member.announcement === "0";
        }
        return getMemberAlliance(member) === activeAlliance;
      });

  return filtered.sort((left, right) => {
    if (isEditMode) {
      return editingSortOrder.indexOf(left.id) - editingSortOrder.indexOf(right.id);
    }
    if (currentSortType === "manual")
      return getMemberRank(left) - getMemberRank(right);
    if (currentSortType === "redQuench")
      return (right.redQuench || 0) - (left.redQuench || 0);
    if (currentSortType === "score")
      return (right.sRScore || 0) - (left.sRScore || 0);
    return 0;
  });
}

export function groupClubRankRows(
  clubs,
  { allianceOrder, getMemberAlliance },
) {
  const groups = new Map();
  clubs.forEach((member) => {
    const alliance = getMemberAlliance(member) || "未知联盟";
    const group = groups.get(alliance) || [];
    group.push(member);
    groups.set(alliance, group);
  });

  const orderedAlliances = [
    ...allianceOrder.filter((alliance) => groups.has(alliance)),
    ...Array.from(groups.keys()).filter(
      (alliance) => !allianceOrder.includes(alliance),
    ),
  ];

  return orderedAlliances.flatMap((alliance) => {
    const members = groups.get(alliance);
    const totalRedQuench = members.reduce(
      (total, member) => total + (Number(member.redQuench) || 0),
      0,
    );

    return [
      {
        id: `group-${alliance}`,
        __isGroupHeader: true,
        alliance,
        count: members.length,
        avgRedQuench: members.length
          ? Math.round(totalRedQuench / members.length)
          : 0,
        rank: "",
        name: "",
        serverId: "",
        power: "",
        redQuench: "",
        topHeroes: [],
        level: "",
        announcement: "",
      },
      ...members,
    ];
  });
}

export function createRedQuenchRankMap(clubs) {
  return Object.fromEntries(
    [...clubs]
      .sort((left, right) =>
        (right.redQuench || 0) - (left.redQuench || 0),
      )
      .map((club, index) => [club.id, index + 1]),
  );
}

export function countClubRanksByAlliance(
  clubs,
  alliances,
  getMemberAlliance,
) {
  return Object.fromEntries(
    alliances.map((alliance) => [
      alliance,
      clubs.filter((member) => {
        if (alliance === "空白") {
          return !member.announcement
            || member.announcement === 0
            || member.announcement === "0";
        }
        return getMemberAlliance(member) === alliance;
      }).length,
    ]),
  );
}

export function calculateClubAverageRedQuench(clubs, totalSlots = 20) {
  const total = clubs.reduce(
    (sum, member) => sum + Number(member.redQuench || 0),
    0,
  );
  return totalSlots > 0 ? Math.round(total / totalSlots) : 0;
}
