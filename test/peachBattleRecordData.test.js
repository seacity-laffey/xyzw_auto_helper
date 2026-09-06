import assert from "node:assert/strict";
import test from "node:test";
import {
  createPeachBattleRecords,
  formatPeachBattleDateKey,
  formatPeachBattlePower,
  getLastPeachBattleSunday,
  getPeachBattlePercent,
} from "../src/utils/peachBattleRecordData.js";

test("peach battle date uses the previous Sunday before the event closes", () => {
  assert.equal(
    getLastPeachBattleSunday(new Date(2026, 8, 6, 17, 59)),
    "2026/08/30",
  );
  assert.equal(
    getLastPeachBattleSunday(new Date(2026, 8, 6, 18, 0)),
    "2026/09/06",
  );
  assert.equal(
    getLastPeachBattleSunday(new Date(2026, 8, 9, 12, 0)),
    "2026/09/06",
  );
  assert.equal(formatPeachBattleDateKey("2026/09/06"), "260906");
});

test("peach battle records normalize both clubs and derive rankings", () => {
  const records = createPeachBattleRecords({
    firstLegionId: "101",
    firstLegionInfo: {
      legionData: { name: "甲俱乐部", serverId: 3100, quenchNum: 8 },
    },
    secondLegionId: 202,
    secondLegionInfo: { legionData: { name: "乙俱乐部" } },
    killRecord: {
      recordsMap: {
        101: [
          { roleInfo: { name: "甲一", power: "100" }, killCnt: 8, reviveCnt: 2, mCKCnt: 3, carCnt: 1 },
          { roleInfo: { name: "甲二", power: 200 }, killCnt: "12", reviveCnt: 6, mCKCnt: 5 },
        ],
        202: [
          { roleInfo: { name: "乙一", power: 500 }, killCnt: 4, reviveCnt: 0 },
        ],
      },
    },
  });

  assert.equal(records.ownClub.name, "甲俱乐部");
  assert.equal(records.ownClub.totalKills, 20);
  assert.equal(records.ownClub.totalRevives, 8);
  assert.equal(records.ownClub.totalKD, 2.5);
  assert.equal(records.ownClub.totalPower, 300);
  assert.equal(records.ownClub.averageKills, "10.0");
  assert.equal(records.ownClub.killRank[0].roleInfo.name, "甲二");
  assert.equal(records.ownClub.kdRank[0].roleInfo.name, "甲一");
  assert.equal(records.ownClub.killStreakRank[0].mCKCnt, 5);
  assert.equal(records.opponentClub.totalKD, 0);
});

test("peach battle display helpers clamp values", () => {
  assert.equal(formatPeachBattlePower(250000000), "2.50亿");
  assert.equal(formatPeachBattlePower(25000), "2.50万");
  assert.equal(getPeachBattlePercent(5, 20), 25);
  assert.equal(getPeachBattlePercent(30, 20), 100);
  assert.equal(getPeachBattlePercent(-2, 20), 0);
});
