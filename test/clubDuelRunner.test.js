import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeClubDuelBattle,
  runClubDuels,
} from "../src/utils/clubDuelRunner.js";

function createBattle({ isWin, leftHp = [1], rightHp = [1] }) {
  return {
    battleData: {
      result: {
        isWin,
        sponsor: { teamInfo: leftHp.map((hp) => ({ hp })) },
        accept: { teamInfo: rightHp.map((hp) => ({ hp })) },
      },
      leftTeam: { name: "我方", headImg: "left.png", power: 1200 },
      rightTeam: { name: "敌方", headImg: "right.png", power: 900 },
    },
  };
}

test("duel battle normalization counts defeated heroes", () => {
  const result = normalizeClubDuelBattle(
    createBattle({ isWin: true, leftHp: [0, "0", 3], rightHp: [0, 2] }),
    (power) => `${power}战力`,
  );

  assert.equal(result.isWin, true);
  assert.equal(result.leftDieHero, 2);
  assert.equal(result.rightDieHero, 1);
  assert.equal(result.leftpower, "1200战力");
  assert.equal(result.rightpower, "900战力");
  assert.equal(normalizeClubDuelBattle({}, String), null);
});

test("duels run sequentially and aggregate valid and invalid responses", async () => {
  const responses = [
    createBattle({ isWin: true, leftHp: [1], rightHp: [0] }),
    { message: "服务繁忙" },
    createBattle({ isWin: false, leftHp: [0], rightHp: [1] }),
  ];
  const calls = [];
  const attempts = [];
  const failures = [];
  const progress = [];
  const delays = [];
  let activeRequests = 0;
  let maxActiveRequests = 0;

  const summary = await runClubDuels({
    totalCount: responses.length,
    targetId: "target-1",
    requestFight: async (targetId) => {
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      calls.push(targetId);
      await Promise.resolve();
      activeRequests -= 1;
      return responses[calls.length - 1];
    },
    formatPower: String,
    sleepFn: async (milliseconds) => delays.push(milliseconds),
    onAttempt: (event) => attempts.push(event.attemptNumber),
    onInvalidResult: (event) => failures.push(event),
    onProgress: (event) => progress.push(event),
  });

  assert.equal(maxActiveRequests, 1);
  assert.deepEqual(calls, ["target-1", "target-1", "target-1"]);
  assert.deepEqual(attempts, [1, 2, 3]);
  assert.deepEqual(delays, [500]);
  assert.deepEqual(failures, [{ attemptNumber: 2, message: "服务繁忙" }]);
  assert.deepEqual(progress.map((event) => event.percentage), [33, 67, 100]);
  assert.equal(summary.winCount, 1);
  assert.equal(summary.lossCount, 2);
  assert.equal(summary.resultCount.length, 2);
  assert.equal(summary.ourDieHeroGameCount, 1);
  assert.equal(summary.enemyDieHeroGameCount, 1);
  assert.equal(summary.winRate, 33);
  assert.equal(summary.ourDieRate, 33);
  assert.equal(summary.enemyDieRate, 33);
});

test("duels stop and propagate request failures", async () => {
  const expectedError = new Error("连接中断");
  let requestCount = 0;

  await assert.rejects(
    runClubDuels({
      totalCount: 3,
      targetId: "target-2",
      requestFight: async () => {
        requestCount += 1;
        throw expectedError;
      },
      formatPower: String,
    }),
    expectedError,
  );
  assert.equal(requestCount, 1);
});
