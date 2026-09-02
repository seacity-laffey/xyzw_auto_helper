import assert from "node:assert/strict";
import { test } from "node:test";

import {
  resolveApexScheduleId,
  selectApexGuessTeam,
} from "../src/utils/batch/apexGuess.js";
import { getPendingEvoTowerRewardCount } from "../src/utils/evoTowerRewards.js";

test("apex schedule selection prefers the active empty claim map", () => {
  assert.equal(resolveApexScheduleId({ 45: { reward: true }, 46: {} }), "46");
  assert.equal(resolveApexScheduleId({}, 47), "47");
});

test("apex team selection skips completed pairs and favors cheer count", () => {
  const teams = [
    { teamId: "a", cheerCnt: 10 },
    { teamId: "b", cheerCnt: 20 },
  ];

  assert.equal(selectApexGuessTeam(teams)?.teamId, "b");
  assert.equal(selectApexGuessTeam(teams, new Set(["b"]))?.teamId, "a");
  assert.equal(selectApexGuessTeam(teams, new Set(["a", "b"])), null);
});

test("pending evo tower rewards are derived from cleared and claimed chapters", () => {
  assert.equal(
    getPendingEvoTowerRewardCount({ towerId: 240, rewardTowerId: 22 }),
    2,
  );
  assert.equal(
    getPendingEvoTowerRewardCount({ towerId: 240, rewardTowerId: 24 }),
    0,
  );
  assert.equal(getPendingEvoTowerRewardCount({ towerId: 0 }), 0);
});
