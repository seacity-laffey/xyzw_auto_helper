import assert from "node:assert/strict";
import test from "node:test";
import { getTodayClubBattleOpponent } from "../src/utils/clubDailyBattle.js";

const response = { club: { phase: "260907", oppoMap: {
  2: { name: "Tuesday", defenders: { 1: { roleId: 100 }, 13: { roleId: 200, mirror: true }, 30: { roleId: 300 } } },
  3: { name: "Wednesday", defenders: {} },
  4: { name: "Thursday", defenders: {} },
} } };
test("selects only the current Beijing match day and rejects stale phases", () => {
  assert.equal(getTodayClubBattleOpponent(response, new Date("2026-09-08T12:00:00+08:00")).name, "Tuesday");
  assert.equal(getTodayClubBattleOpponent(response, new Date("2026-09-08T16:00:00Z")).name, "Wednesday");
  assert.equal(getTodayClubBattleOpponent(response, new Date("2026-09-10T23:59:00+08:00")).name, "Thursday");
  for (const day of ["07", "11", "12", "13", "15"])
    assert.equal(getTodayClubBattleOpponent(response, new Date(`2026-09-${day}T12:00:00+08:00`)), null);
  assert.equal(getTodayClubBattleOpponent({ club: { oppoMap: response.club.oppoMap } }, new Date("2026-09-08")), null);
});
test("preserves thirty positions, three theaters, mirrors and empty slots", () => {
  const club = getTodayClubBattleOpponent({ body: response }, new Date("2026-09-08"));
  assert.equal(club.regions.length, 3);
  for (const region of club.regions) {
    assert.equal(region.slots.length, 10);
    assert.equal(region.slots.filter(slot => slot.title === "统帅").length, 1);
    assert.equal(region.slots.filter(slot => slot.title === "骁将").length, 3);
    assert.equal(region.slots.filter(slot => slot.title === "先锋").length, 6);
  }
  assert.equal(club.regions[1].slots[2].slot, 13);
  assert.equal(club.regions[1].slots[2].member.mirror, true);
  assert.equal(club.regions[2].slots[9].member.roleId, 300);
  assert.equal(club.regions[0].slots[1].member, null);
});
