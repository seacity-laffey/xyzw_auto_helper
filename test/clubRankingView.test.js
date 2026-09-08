import assert from "node:assert/strict";
import test from "node:test";

import {
  getClubAllianceClass,
  getClubRankMedal,
  getClubRankPosition,
  getClubRedQuenchClass,
} from "../src/utils/clubRankingView.js";

test("club rank positions include the selected group offset", () => {
  assert.equal(getClubRankPosition(1, 0), 1);
  assert.equal(getClubRankPosition(101, 0), 101);
  assert.equal(getClubRankPosition(401, 99), 500);
});

test("club rank medals are limited to the global top three", () => {
  assert.equal(getClubRankMedal(1), "gold");
  assert.equal(getClubRankMedal(3), "bronze");
  assert.equal(getClubRankMedal(101), "");
});

test("club rank row classes preserve alliance and red quench thresholds", () => {
  assert.equal(getClubAllianceClass("龙盟"), "alliance-dragon");
  assert.equal(getClubAllianceClass("其他"), "alliance-other");
  assert.equal(getClubRedQuenchClass(49), "redquench-low");
  assert.equal(getClubRedQuenchClass(50), "redquench-medium");
  assert.equal(getClubRedQuenchClass(60), "redquench-high");
});
