import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  canClaimCardReward,
  canClaimClubSignIn,
  canClaimCollectionFreeReward,
  canClaimDailyDiscount,
  canClaimSystemSignIn,
  canDrawFreeGacha,
  canStartDailyDungeon,
  canSweepDeepSea,
  getRemainingFreeSweepTickets,
  hasClaimableMailAttachment,
  hasClaimablePointReward,
} = await jiti.import("../src/utils/dailyRewardEligibility.ts");

const now = new Date("2026-09-07T12:00:00+08:00");
const today = Math.floor(new Date("2026-09-07T10:35:00+08:00").getTime() / 1000);
const yesterday = Math.floor(new Date("2026-09-06T10:35:00+08:00").getTime() / 1000);

test("tickets use today's count and reset a previous day's count", () => {
  for (const [count, expected] of [[0, 3], [1, 2], [2, 1], [3, 0], [4, 0]]) {
    assert.equal(getRemainingFreeSweepTickets({ "genie:sweep:buy": count }, { "genie:sweep:buy": today }, now), expected);
  }
  assert.equal(getRemainingFreeSweepTickets({ "genie:sweep:buy": 3 }, { "genie:sweep:buy": yesterday }, now), 3);
  assert.equal(getRemainingFreeSweepTickets({}, {}, now), 3);
  assert.equal(getRemainingFreeSweepTickets(undefined, undefined, now), 0);
});

test("dream entry uses the whole open period and preserves existing progress", () => {
  const sunday = new Date(2026, 8, 6).getTime() / 1000;
  const started = { beginTime: sunday, id: 161, battleTeam: { 0: { heroId: 107 } } };
  assert.equal(canStartDailyDungeon(started, new Date(2026, 8, 7, 22)), false);
  assert.equal(canStartDailyDungeon(started, new Date(2026, 8, 9, 12)), true);
  assert.equal(canStartDailyDungeon({ ...started, beginTime: new Date(2026, 8, 9).getTime() / 1000 }, new Date(2026, 8, 10, 12)), false);
  for (let day = 0; day < 7; day++) {
    assert.equal(canStartDailyDungeon({ beginTime: 0, id: 0, battleTeam: {} }, new Date(2026, 8, 6 + day, 12)), [0, 1, 3, 4].includes(day));
  }
  assert.equal(canStartDailyDungeon(undefined, now), false);
});

test("deep sea requires cleared progress and an unused Monday sweep", () => {
  assert.equal(canSweepDeepSea({ 1: 8, 2: 4, 3: 6, 4: 14 }, {}, now), false);
  assert.equal(canSweepDeepSea({ 5: 0 }, {}, now), false);
  assert.equal(canSweepDeepSea({ 5: 1 }, {}, now), true);
  assert.equal(canSweepDeepSea({ 5: 1 }, { "genie:daily:free:5": today }, now), false);
  assert.equal(canSweepDeepSea({ 5: 1 }, {}, new Date(2026, 8, 8, 12)), false);
});

test("free gacha is only available on Tuesday, Thursday and Saturday", () => {
  for (let day = 0; day < 7; day++) {
    const date = new Date(2026, 8, 6 + day, 12);
    assert.equal(canDrawFreeGacha({}, date), [2, 4, 6].includes(day));
  }
});

test("free gacha skips today's claim and allows a previous day's claim on an open day", () => {
  const date = new Date(2026, 8, 8, 12);
  const timestamp = date.getTime() / 1000;
  assert.equal(canDrawFreeGacha({ "gacha:free": timestamp }, date), false);
  assert.equal(canDrawFreeGacha({ "gacha:free": timestamp - 86400 }, date), true);
});

test("point rewards require an earned and unclaimed reward tier", () => {
  assert.equal(hasClaimablePointReward(110, { 1: true, 2: true, 3: true, 4: true, 5: true }, 20), false);
  assert.equal(hasClaimablePointReward(110, { 1: true, 2: true, 3: true, 4: true }, 20), true);
  assert.equal(hasClaimablePointReward(110, { 1: true }, 100), false);
  assert.equal(hasClaimablePointReward(210, { 1: true }, 100), true);
});

test("timestamp-backed rewards are skipped after today's claim", () => {
  assert.equal(canClaimSystemSignIn({ 15: today }, now), false);
  assert.equal(canClaimSystemSignIn({ 14: yesterday }, now), true);
  assert.equal(canClaimClubSignIn({ "legion:sign:in": today }, now), false);
  assert.equal(canClaimCardReward({ 1: { lastClaimTime: today } }, 1, now), false);
  assert.equal(canClaimCardReward({ 1: { lastClaimTime: yesterday } }, 1, now), true);
  assert.equal(canClaimCardReward({}, 4003, now), false);
});

test("queried fixed rewards require an explicit claimable state", () => {
  assert.equal(canClaimCollectionFreeReward({ storeInfo: { freeRewardTime: today } }, now), false);
  assert.equal(canClaimCollectionFreeReward({ storeInfo: { freeRewardTime: yesterday } }, now), true);
  assert.equal(canClaimDailyDiscount({ discountList: [{ discountId: 1, discountState: 3 }] }), false);
  assert.equal(canClaimDailyDiscount({ discountList: [{ discountId: 1, discountState: 2 }] }), true);
  assert.equal(hasClaimableMailAttachment({
    list: [{ state: 3, haveAttachments: true, attachments: [{ id: 1 }] }],
  }), false);
  assert.equal(hasClaimableMailAttachment({
    list: [{ state: 1, haveAttachments: true, attachments: [{ id: 1 }] }],
  }), true);
});
