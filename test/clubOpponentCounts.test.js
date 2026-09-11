import assert from "node:assert/strict";
import test from "node:test";
import { buildOpponentClubBattleRows, getClubBattleRecordTargets } from "../src/utils/clubDailyBattle.js";

const date = new Date("2026-09-09T03:18:39Z");
const created = date.getTime() / 1000;
const response = { club: { phase: "260907", oppoMap: {
  2: { name: "Yesterday", defenders: { 1: { roleId: 999, name: "Yesterday member" } } },
  3: { name: "Enemy", defenders: {
    1: { roleId: 201, name: "Enemy A" },
    2: { roleId: 202, name: "Enemy B" },
    3: { roleId: 201, name: "Enemy A", mirror: true },
    4: { roleId: 201, name: "Enemy A" },
  } },
} } };

test("defense queries include only challenged positions and keep mirror identity", () => {
  assert.deepEqual(getClubBattleRecordTargets({
    1: { roleId: 101, challengeCnt: 2 },
    2: { roleId: 101, challengeCnt: 1 },
    3: { roleId: 101, challengeCnt: 3, mirror: true },
    4: { roleId: 102, failCnt: 1 },
    5: { roleId: 103, defeated: true },
    6: { roleId: 104, challengeCnt: 0 },
  }), [
    { targetId: "101", targetIsMirror: false },
    { targetId: "101", targetIsMirror: true },
    { targetId: "102", targetIsMirror: false },
    { targetId: "103", targetIsMirror: false },
  ]);
});

test("enemy member counts use today's attackers, invert defender wins and deduplicate records", () => {
  const record = { roleId: 201, isWin: false, created, recordName: "a", mirror: false };
  const rows = buildOpponentClubBattleRows(response, [
    { targetId: "101", records: [record, { roleId: 201, isWin: true, created, recordName: "b" }, { roleId: 202, isWin: false, created: created - 86400, recordName: "old" }] },
    { targetId: "102", records: [record, { roleId: 201, isWin: false, created: created * 1000, mirror: true, recordName: "mirror" }, { roleId: 999, isWin: false, created, recordName: "other" }] },
  ], date);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => [r.key, r.successCount, r.attackCount, r.available, r.partial]), [
    ["201", 1, 2, true, false],
    ["202", 0, 0, true, false],
    ["201:mirror", 1, 1, true, false],
  ]);
});

test("partial queries show known counts as partial and unobserved members as unknown", () => {
  const rows = buildOpponentClubBattleRows(response, [{ records: [{ roleId: 201, isWin: false, created, recordName: "a" }] }], date, { complete: false });
  assert.equal(rows[0].partial, true);
  assert.equal(rows[0].attackCount, 1);
  assert.equal(rows[1].available, false);
  assert.equal(rows[1].attackCount, null);
});

test("no current opponent or stale phase produces no opponent rows", () => {
  assert.deepEqual(buildOpponentClubBattleRows(response, [], new Date("2026-09-11T03:00:00Z")), []);
  assert.deepEqual(buildOpponentClubBattleRows({ club: { ...response.club, phase: "260831" } }, [], date), []);
});
