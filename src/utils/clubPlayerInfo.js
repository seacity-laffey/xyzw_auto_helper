export function getEquipmentStats(equipment) {
  let redCount = 0;
  let holeCount = 0;

  Object.values(equipment || {}).forEach((item) => {
    Object.values(item?.quenches || {}).forEach((quench) => {
      holeCount += 1;
      if (quench?.colorId === 6)
        redCount += 1;
    });
  });
  return { holeCount, redCount };
}

export function extractClubHeroInfo(heroSource, heroDict = {}) {
  const heroes = Array.isArray(heroSource)
    ? heroSource
    : heroSource && typeof heroSource === "object"
      ? Object.values(heroSource)
      : [];
  let redCount = 0;
  let holeCount = 0;

  const heroList = heroes.filter(Boolean).map((hero, index) => {
    const dictionaryHero = heroDict[hero.heroId] || {};
    const equipment = getEquipmentStats(hero.equipment);
    redCount += equipment.redCount;
    holeCount += equipment.holeCount;
    return {
      heroId: hero.heroId || `unknown_${index}`,
      artifactId: hero.artifactId || "",
      power: hero.power || 0,
      star: hero.star || 0,
      equipment: hero.equipment,
      heroName: hero.heroName || dictionaryHero.name || `未知武将_${index}`,
      heroAvate: hero.heroAvate || dictionaryHero.avatar || "",
      level: hero.level || 0,
      hole: equipment.holeCount,
      red: equipment.redCount,
      HolyBeast: hero.hB?.active === true,
      HBlevel: hero.hB?.order || 0,
      skillList: hero.skillList || [],
      attributeList: hero.attributeList || [],
      battleTeamSlot: hero.battleTeamSlot,
    };
  });
  heroList.sort((left, right) =>
    (left.battleTeamSlot ?? Number.MAX_SAFE_INTEGER)
    - (right.battleTeamSlot ?? Number.MAX_SAFE_INTEGER),
  );
  return { redCount, holeCount, heroList };
}

export function buildClubPlayerInfo(
  roleId,
  result,
  { fillPearls, formatPower, heroDict },
) {
  const roleInfo = result?.roleInfo;
  if (!roleInfo)
    return null;

  const heroes = extractClubHeroInfo(roleInfo.heroes, heroDict);
  const pearlInfo = fillPearls(roleInfo) || {};
  heroes.heroList.forEach((hero) => {
    hero.PearlInfo = pearlInfo[hero.artifactId] || {};
  });

  const roleRedQuench = roleInfo.red || 0;
  const roleMaxRed = roleInfo.maxRed || 0;
  const legionStats = result.legionInfo?.statistics || {};
  const legionMaxPower = legionStats["max:power"] || roleInfo.maxPower || 0;

  return {
    id: roleId,
    name: roleInfo.name,
    headImg: roleInfo.headImg,
    power: roleInfo.power,
    level: roleInfo.level,
    serverName: roleInfo.serverName,
    legionName: result.legionInfo?.name || "无",
    redQuench: roleRedQuench,
    holyBeast: heroes.heroList.filter((hero) => hero.HolyBeast).length,
    maxPower: formatPower(legionMaxPower),
    currentRedDrum: roleRedQuench,
    maxRedDrum: roleMaxRed,
    totalRedCount: heroes.redCount,
    totalHoleCount: heroes.holeCount,
    legionRedQuench: legionStats["battle:red:quench"] || roleRedQuench,
    legionMaxRed: legionStats["red:quench"] || roleMaxRed,
    heroList: heroes.heroList,
    legacy: roleInfo.legacy?.color || 0,
  };
}
