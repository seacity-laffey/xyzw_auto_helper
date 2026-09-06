import assert from "node:assert/strict";
import test from "node:test";
import {
  createClubMonthBattleSummary,
  formatClubBattleMonth,
  formatClubBattleShortDate,
  getClubMonthDailyStat,
  getCurrentMonthBattleDates,
  loadClubMonthBattleRecords,
} from "../src/utils/clubMonthBattleRecordData.js";

test("monthly battle dates include four Saturdays and the final Sunday", () => {
  assert.deepEqual(getCurrentMonthBattleDates(new Date(2026, 8, 20, 12)), [
    "2026/09/05",
    "2026/09/12",
    "2026/09/19",
  ]);
  assert.deepEqual(getCurrentMonthBattleDates(new Date(2026, 8, 30, 12)), [
    "2026/09/05",
    "2026/09/12",
    "2026/09/19",
    "2026/09/26",
    "2026/09/27",
  ]);
});

test("monthly battle summary merges members across dates", () => {
  const summary = createClubMonthBattleSummary({
    "2026/09/05": {
      date: "2026/09/05",
      roleDetailsList: [
        { roleId: 1, name: "甲", winCnt: 10, loseCnt: 12, buildingCnt: 20 },
        { roleId: 2, name: "乙", winCnt: 3, loseCnt: 2, buildingCnt: 8 },
      ],
    },
    "2026/09/12": {
      date: "2026/09/12",
      roleDetailsList: [
        { roleId: 1, name: "甲", winCnt: "8", loseCnt: 12, buildingCnt: 30 },
        { roleId: 3, name: "丙", winCnt: 20, loseCnt: 7, buildingCnt: 5 },
      ],
    },
  });

  assert.deepEqual(summary.members.map((member) => member.roleId), [3, 1, 2]);
  assert.deepEqual(
    summary.members.find((member) => member.roleId === 1),
    {
      dailyRecords: {
        "2026/09/05": { roleId: 1, name: "甲", winCnt: 10, loseCnt: 12, buildingCnt: 20 },
        "2026/09/12": { roleId: 1, name: "甲", winCnt: "8", loseCnt: 12, buildingCnt: 30 },
      },
      headImg: undefined,
      name: "甲",
      roleId: 1,
      totalBuildingCnt: 50,
      totalLoseCnt: 24,
      totalResurrection: 12,
      totalWinCnt: 18,
    },
  );
  assert.equal(summary.stats.totalMembers, 3);
  assert.equal(summary.stats.totalKills, 41);
  assert.equal(summary.stats.totalDeaths, 33);
  assert.equal(summary.stats.totalBuilding, 63);
  assert.equal(summary.stats.totalResurrection, 13);
  assert.equal(
    summary.reportRecords.find((member) => member.roleId === 1).computedReviveCnt,
    12,
  );
});

test("monthly battle display helpers handle missing daily records", () => {
  const member = { dailyRecords: { "2026/09/05": { winCnt: "9" } } };

  assert.equal(getClubMonthDailyStat(member, "2026/09/05", "winCnt"), 9);
  assert.equal(getClubMonthDailyStat(member, "2026/09/12", "winCnt"), 0);
  assert.equal(formatClubBattleShortDate("2026/09/05"), "09/05");
  assert.equal(formatClubBattleMonth(new Date(2026, 8, 5)), "2026年9月");
});

test("monthly battle records load dates sequentially and retain date order", async () => {
  const calls = [];
  let activeLoads = 0;
  let maximumActiveLoads = 0;
  const records = await loadClubMonthBattleRecords(
    ["2026/09/05", "2026/09/12", "2026/09/19"],
    async (date) => {
      calls.push(date);
      activeLoads += 1;
      maximumActiveLoads = Math.max(maximumActiveLoads, activeLoads);
      await Promise.resolve();
      activeLoads -= 1;
      return { date, roleDetailsList: [] };
    },
  );

  assert.deepEqual(calls, ["2026/09/05", "2026/09/12", "2026/09/19"]);
  assert.equal(maximumActiveLoads, 1);
  assert.deepEqual(Object.keys(records), calls);
});
