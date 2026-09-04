import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getSkinChallengeRewardActId,
  MAX_SKIN_CHALLENGE_REWARD_CLAIMS,
} from "../src/utils/towerActId.js";

test("skin challenge reward activity ids are derived safely", () => {
  assert.equal(getSkinChallengeRewardActId(2608071), 2608072);
  assert.equal(getSkinChallengeRewardActId("2608072"), 2608072);
  assert.equal(getSkinChallengeRewardActId("invalid"), null);
  assert.equal(MAX_SKIN_CHALLENGE_REWARD_CLAIMS, 100);
});
