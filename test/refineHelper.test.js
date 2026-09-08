import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRefineHeroList,
  getEquipFromQuenchResult,
  hasHighQualityRefine,
  matchesRefineConditions,
  normalizeRefineSlots,
  parsePresetTeamData,
} from "../src/utils/refineHelper.js";

test("parses array-based preset teams and builds ordered heroes", () => {
  const teamData = parsePresetTeamData({
    useTeamId: 2,
    2: { heroes: [{ heroId: 20 }, { heroId: 10 }] },
  });
  const heroes = buildRefineHeroList(
    teamData,
    { 10: { level: 8, equipment: { 1: {} } }, 20: { level: 9, equipment: { 1: {} } } },
    { 10: { name: "十" }, 20: { name: "二十" } },
  );
  assert.deepEqual(heroes.map((hero) => hero.id), [20, 10]);
});

test("normalizes slots and evaluates quality and target conditions", () => {
  const quenches = {
    2: { attrId: 3, attrNum: 40, colorId: 4 },
    1: { attrId: 1, attrNum: 55, colorId: 5, locked: true },
  };
  const slots = normalizeRefineSlots(quenches);
  assert.deepEqual(slots.map((slot) => slot.id), [1, 2]);
  assert.equal(slots[0].isLocked, true);
  assert.equal(hasHighQualityRefine({ quenches }), true);
  assert.equal(matchesRefineConditions({ quenches }, [{ attrId: 1, attrValue: 50 }]), true);
});

test("normalizes quench response formats", () => {
  const currentEquip = { quenchTimes: 3, quenches: {} };
  assert.deepEqual(getEquipFromQuenchResult({
    currentEquip,
    heroId: 1,
    partId: 2,
    result: { quenches: { 1: { colorId: 2 } } },
  }), {
    quenchTimes: 4,
    quenches: { 1: { colorId: 2 } },
  });
});
