import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getPendingSaltCupMatchIds,
  getSaltCupPickLabel,
  normalizeSaltCupPick,
} from "../src/utils/batch/footballBet.js";
import {
  getSkinChallengeRewardActId,
  MAX_SKIN_CHALLENGE_REWARD_CLAIMS,
} from "../src/utils/towerActId.js";

test("salt cup pick values are normalized and labeled", () => {
  assert.equal(normalizeSaltCupPick(1), 1);
  assert.equal(normalizeSaltCupPick("2"), 2);
  assert.equal(normalizeSaltCupPick(99), 3);
  assert.equal(getSaltCupPickLabel(1), "主胜");
  assert.equal(getSaltCupPickLabel(2), "平局");
  assert.equal(getSaltCupPickLabel(3), "客胜");
});

test("pending salt cup matches come from the latest schedule", () => {
  assert.deepEqual(
    getPendingSaltCupMatchIds({
      roleData: {
        betRecord: {
          schedule1: {
            oldMatch: { pick: 0 },
          },
          schedule2: {
            match1: { pick: 0 },
            match2: { pick: 3 },
            match3: { pick: "0" },
          },
        },
      },
    }),
    ["match1", "match3"],
  );
  assert.deepEqual(getPendingSaltCupMatchIds({ roleData: {} }), []);
});

test("skin challenge reward activity ids are derived safely", () => {
  assert.equal(getSkinChallengeRewardActId(2608071), 2608072);
  assert.equal(getSkinChallengeRewardActId("2608072"), 2608072);
  assert.equal(getSkinChallengeRewardActId("invalid"), null);
  assert.equal(MAX_SKIN_CHALLENGE_REWARD_CLAIMS, 100);
});
