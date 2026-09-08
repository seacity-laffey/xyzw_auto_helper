import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClubPlayerInfo,
  extractClubHeroInfo,
  getEquipmentStats,
} from "../src/utils/clubPlayerInfo.js";

test("equipment statistics count sockets and red quenches", () => {
  assert.deepEqual(
    getEquipmentStats({
      weapon: {
        quenches: {
          first: { colorId: 6 },
          second: { colorId: "6" },
        },
      },
      armor: { quenches: [{ colorId: 6 }] },
      empty: {},
    }),
    { holeCount: 3, redCount: 3 },
  );
  assert.deepEqual(getEquipmentStats(), { holeCount: 0, redCount: 0 });
});

test("hero information supports keyed responses and sorts battle slots", () => {
  const result = extractClubHeroInfo(
    {
      back: {
        heroId: 2,
        artifactId: "pearl-2",
        battleTeamSlot: 3,
        equipment: { weapon: { quenches: [{ colorId: 6 }] } },
        hB: { active: false, order: 5 },
      },
      front: {
        heroId: 1,
        battleTeamSlot: 1,
        hB: { active: true, order: 4 },
      },
      reserve: { heroId: 3 },
      legacy: {
        id: 4,
        name: "兼容武将",
        headImg: "legacy.png",
        battleTeamSlot: 4,
        fourBasest: { level: 3 },
      },
    },
    {
      1: { name: "前排", avatar: "front.png" },
      2: { name: "后排", avatar: "back.png" },
    },
  );

  assert.deepEqual(result.heroList.map((hero) => hero.heroId), [1, 2, 4, 3]);
  assert.equal(result.heroList[0].heroName, "前排");
  assert.equal(result.heroList[0].heroAvate, "front.png");
  assert.equal(result.heroList[0].HolyBeast, true);
  assert.equal(result.heroList[1].HolyBeast, false);
  assert.equal(result.heroList[2].heroName, "兼容武将");
  assert.equal(result.heroList[2].heroAvate, "legacy.png");
  assert.equal(result.heroList[2].HolyBeast, true);
  assert.equal(result.heroList[2].HBlevel, 3);
  assert.equal(result.heroList[3].heroName, "未知武将_2");
  assert.deepEqual(
    { holeCount: result.holeCount, redCount: result.redCount },
    { holeCount: 1, redCount: 1 },
  );
});

test("player information attaches pearls and applies legion fallbacks", () => {
  const result = buildClubPlayerInfo(
    "role-1",
    {
      roleInfo: {
        name: "拉菲",
        power: 1200,
        maxPower: 2200,
        red: 3,
        maxRed: 6,
        legacy: { color: 5 },
        heroes: [
          {
            heroId: 1,
            artifactId: "pearl-1",
            hB: { active: true },
            equipment: { weapon: { quenches: [{ colorId: 6 }] } },
          },
        ],
      },
      legionInfo: { name: "测试俱乐部", statistics: {} },
    },
    {
      fillPearls: () => ({ "pearl-1": { level: 7 } }),
      formatPower: (power) => `${power}战力`,
      heroDict: { 1: { name: "吕布" } },
    },
  );

  assert.equal(result.id, "role-1");
  assert.equal(result.legionName, "测试俱乐部");
  assert.equal(result.maxPower, "2200战力");
  assert.equal(result.legionRedQuench, 3);
  assert.equal(result.legionMaxRed, 6);
  assert.equal(result.holyBeast, 1);
  assert.equal(result.totalRedCount, 1);
  assert.deepEqual(result.heroList[0].PearlInfo, { level: 7 });
  assert.equal(result.legacy, 5);
});

test("player information returns null without role data", () => {
  assert.equal(
    buildClubPlayerInfo("missing", {}, {
      fillPearls: () => ({}),
      formatPower: String,
      heroDict: {},
    }),
    null,
  );
});
