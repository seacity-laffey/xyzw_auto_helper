import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const { createTasksHangUp } = await jiti.import("../src/utils/batch/tasksHangUp.ts");
const { createTasksStore } = await jiti.import("../src/utils/batch/tasksStore.ts");
const { createTasksItem } = await jiti.import("../src/utils/batch/tasksItem.ts");
const run = async (factory, action, responses) => {
  const calls = [];
  const deps = {
    selectedTokens: { value: Object.keys(responses) }, tokens: { value: Object.keys(responses).map(id => ({ id, name: id })) },
    tokenStatus: { value: {} }, isRunning: { value: false }, shouldStop: { value: false },
    currentRunningTokenId: { value: null }, batchSettings: { maxActive: 1 }, helperSettings: {}, delayConfig: { action: 0 },
    connectionQueue: { active: 0 }, ensureConnection: async () => {}, releaseConnectionSlot() {}, addLog() {}, message: { success() {} },
    tokenStore: { closeWebSocketConnection() {}, sendMessage() {}, sendMessageWithPromise: async (id, cmd, params) => {
      calls.push({ id, cmd, params });
      const response = responses[id][cmd];
      return typeof response === "function" ? response(params) : response || {};
    } },
  };
  await factory(deps)[action]();
  return calls;
};
test("club sign-in checks each account and skips claimed or unknown state", async () => {
  const today = Date.now() / 1000;
  const calls = await run(createTasksHangUp, "batchclubsign", {
    claimed: { role_getroleinfo: { role: { legionId: 1, statisticsTime: { "legion:sign:in": today } } } },
    available: { role_getroleinfo: { role: { legionId: 1, statisticsTime: {} } } },
    missing: {},
  });
  assert.deepEqual(calls.filter(c => c.cmd === "legion_signin").map(c => c.id), ["available"]);
});
test("collection claims only accounts with unclaimed free rewards", async () => {
  const calls = await run(createTasksStore, "collection_claimfreereward", {
    claimed: { collection_goodslist: { storeInfo: { freeRewardTime: Date.now() / 1000 } } },
    available: { collection_goodslist: { storeInfo: { freeRewardTime: 0 } } },
    missing: {},
  });
  assert.deepEqual(calls.filter(c => c.cmd === "collection_claimfreereward").map(c => c.id), ["available"]);
});
test("genie sweeps only unused free attempts without consuming ticket inventory", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 7, 12) });
  const calls = await run(createTasksItem, "batchGenieSweep", {
    available: { role_getroleinfo: { role: { genie: { 1: 8, 2: 4, 3: 0, 5: 1 }, statisticsTime: { "genie:daily:free:2": Date.now() / 1000 }, items: { 1021: { quantity: 99 } } } } },
    missing: {},
  });
  assert.deepEqual(calls.filter(c => c.cmd === "genie_sweep"), [
    { id: "available", cmd: "genie_sweep", params: { genieId: 1 } },
    { id: "available", cmd: "genie_sweep", params: { genieId: 5, sweepCnt: 1 } },
  ]);
});

test("free genie does not require tickets and skips claimed attempts and closed deep sea", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 8, 12) });
  const calls = await run(createTasksItem, "batchGenieSweep", {
    free: { role_getroleinfo: { role: { genie: { 1: 8, 5: 1 }, statisticsTime: {}, items: {} } } },
    claimed: { role_getroleinfo: { role: { genie: { 1: 8 }, statisticsTime: { "genie:daily:free:1": Date.now() / 1000 } } } },
  });
  assert.deepEqual(calls.filter(c => c.cmd === "genie_sweep"), [
    { id: "free", cmd: "genie_sweep", params: { genieId: 1 } },
  ]);
});

test("ticket sweep selects highest four-kingdom progress and spends in batches of at most 99", async () => {
  let quantity = 205;
  const calls = await run(createTasksItem, "batchUseGenieTickets", {
    account: {
      role_getroleinfo: { role: { genie: { 1: 8, 2: 4, 4: 14, 5: 99 }, items: { 1021: { quantity } } } },
      genie_sweep: ({ sweepCnt }) => ({ role: { items: { 1021: { quantity: quantity -= sweepCnt } } } }),
    },
  });
  assert.deepEqual(calls.filter(c => c.cmd === "genie_sweep").map(c => c.params), [
    { genieId: 4, sweepCnt: 99 }, { genieId: 4, sweepCnt: 99 }, { genieId: 4, sweepCnt: 7 },
  ]);
});

test("ticket sweep stops on unchanged inventory and skips empty inventory", async () => {
  const role = { genie: { 1: 8 }, items: { 1021: { quantity: 30 } } };
  const calls = await run(createTasksItem, "batchUseGenieTickets", {
    unchanged: { role_getroleinfo: { role }, genie_sweep: { role } },
    empty: { role_getroleinfo: { role: { genie: { 1: 8 }, items: {} } } },
  });
  assert.equal(calls.filter(c => c.cmd === "genie_sweep").length, 1);
});

test("ticket sweep refreshes missing inventory before deciding whether to continue", async () => {
  let reads = 0;
  const calls = await run(createTasksItem, "batchUseGenieTickets", {
    account: {
      role_getroleinfo: () => ({ role: { genie: { 1: 8 }, items: ++reads === 1 ? { 1021: { quantity: 5 } } : {} } }),
      genie_sweep: {},
    },
  });
  assert.deepEqual(calls.map(c => c.cmd), ["role_getroleinfo", "genie_sweep", "role_getroleinfo"]);
});

test("free gacha only draws unclaimed accounts on an open day", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 8, 12) });
  const responses = {
    available: { role_getroleinfo: { role: { statistics: {} } } },
    claimed: { role_getroleinfo: { role: { statistics: { "gacha:free": Date.now() / 1000 } } } },
    unknown: {},
  };
  const calls = await run(createTasksItem, "batchFreeGacha", responses);
  assert.deepEqual(calls.filter(c => c.cmd === "gacha_drawreward"), [
    { id: "available", cmd: "gacha_drawreward", params: { num: 1, isGroup: false } },
  ]);
  t.mock.timers.setTime(new Date(2026, 8, 9, 12).getTime());
  assert.equal((await run(createTasksItem, "batchFreeGacha", responses)).some(c => c.cmd === "gacha_drawreward"), false);
});

test("coin gacha spends only available 5270 inventory and stops at zero", async () => {
  let quantity = 2;
  const calls = await run(createTasksItem, "batchUseGachaCoins", {
    available: {
      role_getroleinfo: () => ({ role: { statistics: { "gacha:free": Date.now() / 1000 }, items: { 5270: { quantity } } } }),
      gacha_drawreward: () => { quantity--; return {}; },
    },
    empty: { role_getroleinfo: { role: { statistics: {}, items: {} } } },
  });
  assert.equal(calls.filter(c => c.cmd === "gacha_drawreward").length, 2);
  assert.equal(quantity, 0);
});

test("coin gacha stops when neither inventory nor free allowance changes", async () => {
  const calls = await run(createTasksItem, "batchUseGachaCoins", {
    unchanged: { role_getroleinfo: { role: { statistics: {}, items: { 5270: { quantity: 3 } } } } },
  });
  assert.equal(calls.filter(c => c.cmd === "gacha_drawreward").length, 1);
});

test("coin gacha permits one confirmed free draw before spending coins", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 8, 12) });
  let freeTime = 0;
  let quantity = 1;
  const calls = await run(createTasksItem, "batchUseGachaCoins", {
    account: {
      role_getroleinfo: () => ({ role: { statistics: { "gacha:free": freeTime }, items: { 5270: { quantity } } } }),
      gacha_drawreward: () => {
        if (!freeTime) freeTime = Date.now() / 1000;
        else quantity--;
        return {};
      },
    },
  });
  assert.equal(calls.filter(c => c.cmd === "gacha_drawreward").length, 2);
  assert.equal(quantity, 0);
});
