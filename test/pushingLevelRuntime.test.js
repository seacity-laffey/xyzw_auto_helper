import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPushingLevel,
  computeTorchRemaining,
  pickNumber,
  readTorchFromResponse,
  sanitizePushingError,
} from "../src/utils/pushingLevelRuntime.js";

test("normalizes nested torch state and numeric fallbacks", () => {
  assert.deepEqual(readTorchFromResponse({
    body: { role: { autoClickType: "1009", autoClickTime: "90" } },
  }), {
    torchType: 1009,
    torchRemaining: 90,
    torchSettleTime: 0,
  });
  assert.equal(pickNumber(null, "", "12"), 12);
});

test("computes torch countdown from absolute and local timestamps", () => {
  assert.equal(computeTorchRemaining({ torchSettleTime: 1010 }, 1000000), 10);
  assert.equal(computeTorchRemaining({
    torchBaseRemaining: 30,
    torchBaseTimestamp: 1000,
  }, 6000), 25);
});

test("updates level and keeps server boss names tied to the current level", () => {
  const state = { level: 0, bossName: "", bossLevel: 0 };
  applyPushingLevel(state, 10, "测试首领");
  assert.deepEqual(state, { level: 10, bossName: "测试首领", bossLevel: 10 });
  applyPushingLevel(state, 11);
  assert.equal(state.level, 11);
  assert.equal(state.bossLevel, 11);
});

test("sanitizes protocol command names from user-facing errors", () => {
  assert.equal(
    sanitizePushingError(new Error("请求超时: fight_start (10000ms)")),
    "请求超时",
  );
});
