import assert from "node:assert/strict";
import test from "node:test";
import {
  createClubBattleRecordSummary,
  getBattleRecordHeatColor,
  getBattleRecordPercent,
} from "../src/utils/clubBattleRecordData.js";

const records = [
  { roleId: 1, winCnt: 10, loseCnt: 2, buildingCnt: 80 },
  { roleId: 2, winCnt: 30, loseCnt: 12, buildingCnt: 20 },
  { roleId: 3, winCnt: 20, loseCnt: 8, buildingCnt: 120 },
  { roleId: 4, winCnt: 5, loseCnt: 1, buildingCnt: 0 },
];

test("club battle record summary derives totals and ranked lists", () => {
  const summary = createClubBattleRecordSummary(records);

  assert.deepEqual(
    {
      totalBuilding: summary.totalBuilding,
      totalDeaths: summary.totalDeaths,
      totalKD: summary.totalKD,
      totalKills: summary.totalKills,
      totalRevives: summary.totalRevives,
      totalWinRate: summary.totalWinRate,
    },
    {
      totalBuilding: 220,
      totalDeaths: 23,
      totalKD: "2.83",
      totalKills: 65,
      totalRevives: 8,
      totalWinRate: "73.9",
    },
  );
  assert.deepEqual(summary.killRank.map(player => player.roleId), [2, 3, 1]);
  assert.deepEqual(summary.occupyRank.map(player => player.roleId), [3, 1, 2]);
  assert.deepEqual(summary.deathRank.map(player => player.roleId), [2, 3, 1]);
  assert.deepEqual(summary.kdRank.map(player => player.roleId), [1, 4, 2]);
  assert.deepEqual(summary.reviveRank.map(player => player.roleId), [2, 3, 1]);
  assert.deepEqual(summary.survivalRank.map(player => player.roleId), [4, 1, 3]);
  assert.equal(summary.mvpPlayer.roleId, 2);
  assert.equal(summary.avgKills, "16.3");
  assert.deepEqual(
    [summary.maxKills, summary.maxDeaths, summary.maxOccupies],
    [30, 12, 120],
  );
});

test("club battle record summary handles empty and zero-death records", () => {
  const empty = createClubBattleRecordSummary();
  const undefeated = createClubBattleRecordSummary([
    { roleId: 1, winCnt: "6", loseCnt: 0, buildingCnt: null },
  ]);

  assert.equal(empty.totalKD, 0);
  assert.equal(empty.totalWinRate, "0.0");
  assert.equal(empty.mvpPlayer, null);
  assert.equal(undefeated.totalKills, 6);
  assert.equal(undefeated.totalKD, 0);
  assert.equal(undefeated.kdRank[0].kd, "0.00");
});

test("club battle record display helpers clamp percentages and color thresholds", () => {
  assert.equal(getBattleRecordPercent(15, 10), 100);
  assert.equal(getBattleRecordPercent(3, 12), 25);
  assert.equal(getBattleRecordPercent(3, 0), 0);
  assert.equal(getBattleRecordHeatColor("kill", 50), "rgba(76, 175, 80, 0.3)");
  assert.equal(getBattleRecordHeatColor("death", 10), "rgba(255, 205, 210, 0.3)");
  assert.equal(getBattleRecordHeatColor("revive", 4), "transparent");
  assert.equal(getBattleRecordHeatColor("unknown", 999), "transparent");
});
