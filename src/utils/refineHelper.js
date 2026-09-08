export const REFINE_ATTR_MAP = {
  1: "攻击",
  2: "血量",
  3: "防御",
  4: "速度",
  5: "破甲",
  6: "破甲抵抗",
  7: "精准",
  8: "格挡",
  9: "减伤",
  10: "暴击",
  11: "暴击抵抗",
  12: "爆伤",
  13: "爆伤抵抗",
  14: "技能伤害",
  15: "免控",
  16: "眩晕免疫",
  17: "冰冻免疫",
  18: "沉默免疫",
  19: "流血免疫",
  20: "中毒免疫",
  21: "灼烧免疫",
};

export const REFINE_PART_MAP = {
  1: "武器",
  2: "铠甲",
  3: "头冠",
  4: "坐骑",
};

export const parsePresetTeamData = (presetTeamInfo) => {
  if (!presetTeamInfo)
    return { useTeamId: 1, teams: {} };

  const root = presetTeamInfo.presetTeamInfo ?? presetTeamInfo;
  const findUseTeamId = (value) => {
    if (!value || typeof value !== "object")
      return null;
    if (typeof value.useTeamId === "number")
      return value.useTeamId;
    for (const child of Object.values(value)) {
      const found = findUseTeamId(child);
      if (found)
        return found;
    }
    return null;
  };
  const useTeamId = root.useTeamId
    ?? root.presetTeamInfo?.useTeamId
    ?? findUseTeamId(root)
    ?? 1;
  const dictionary = root.presetTeamInfo ?? root;
  const teams = {};

  Object.keys(dictionary || {})
    .filter((key) => /^\d+$/.test(key))
    .forEach((key) => {
      const node = dictionary[key];
      if (!node) {
        teams[Number(key)] = { teamInfo: {} };
      } else if (node.teamInfo) {
        teams[Number(key)] = { teamInfo: node.teamInfo };
      } else if (node.heroes) {
        teams[Number(key)] = {
          teamInfo: Object.fromEntries(
            node.heroes.map((hero, index) => [String(index + 1), hero]),
          ),
        };
      } else if (typeof node === "object") {
        const hasHero = Object.values(node).some((hero) =>
          hero && typeof hero === "object" && "heroId" in hero,
        );
        teams[Number(key)] = { teamInfo: hasHero ? node : {} };
      } else {
        teams[Number(key)] = { teamInfo: {} };
      }
    });

  return { useTeamId: Number(useTeamId) || 1, teams };
};

export const buildRefineHeroList = (teamData, heroData, heroDictionary) => {
  const currentTeam = teamData.teams[teamData.useTeamId] || { teamInfo: {} };
  const heroes = [];

  Object.entries(currentTeam.teamInfo).forEach(([position, hero]) => {
    const heroId = hero?.heroId || hero?.id;
    if (!heroId)
      return;
    const detail = heroData[String(heroId)] || {};
    heroes.push({
      id: heroId,
      name: heroDictionary[heroId]?.name || `武将${heroId}`,
      position: Number(position),
      level: hero?.level || detail?.level || 1,
      equipment: detail?.equipment || {},
    });
  });

  if (!heroes.length) {
    for (const [id, hero] of Object.entries(heroData)) {
      if (!hero?.equipment)
        continue;
      heroes.push({
        id: Number(id),
        name: heroDictionary[Number(id)]?.name || `武将${Number(id)}`,
        position: heroes.length + 1,
        level: hero.level || 1,
        equipment: hero.equipment,
      });
      if (heroes.length >= 5)
        break;
    }
  }

  return heroes.sort((left, right) => left.position - right.position);
};

export const normalizeRefineSlots = (quenches) => Object.keys(quenches || {})
  .sort((left, right) => Number(left) - Number(right))
  .map((key) => {
    const slot = quenches[key];
    return {
      id: Number(key),
      attrId: slot.attrId || null,
      attrNum: slot.attrNum || 0,
      isLocked: slot.isLocked || slot.locked || false,
      colorId: slot.colorId || 0,
    };
  });

export const getEquipFromQuenchResult = ({ currentEquip, heroId, partId, result }) => {
  if (result?.equipment)
    return result.equipment;
  if (result?.role?.heroes) {
    const hero = result.role.heroes[String(heroId)];
    if (hero?.equipment)
      return hero.equipment[partId];
  }
  if (result?.quenches) {
    return {
      ...currentEquip,
      quenches: result.quenches,
      quenchTimes: (currentEquip?.quenchTimes || 0) + 1,
    };
  }
  return currentEquip;
};

export const hasHighQualityRefine = (equipment) => Object.values(equipment?.quenches || {})
  .some((slot) => Number(slot.colorId) >= 5);

export const matchesRefineConditions = (equipment, conditions) => {
  const validConditions = conditions.filter((condition) =>
    condition.attrId && condition.attrValue,
  );
  if (!validConditions.length || !equipment?.quenches)
    return false;
  const slots = Object.values(equipment.quenches);
  return validConditions.some((condition) => slots.some((slot) =>
    slot.attrId === condition.attrId && slot.attrNum >= condition.attrValue,
  ));
};
