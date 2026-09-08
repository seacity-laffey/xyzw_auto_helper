import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const { createTasksDungeon } = await jiti.import("../src/utils/batch/tasksDungeon.ts");
const { useBatchRuntimeSettings } = await jiti.import("../src/composables/useBatchRuntimeSettings.ts");

const setup = (dungeon) => {
  const calls = [];
  const warnings = [];
  let connections = 0;
  const tasks = createTasksDungeon({
    selectedTokens: { value: ["test"] }, tokens: { value: [{ id: "test", name: "test" }] },
    tokenStatus: { value: {} }, isRunning: { value: false }, shouldStop: { value: false },
    currentRunningTokenId: { value: null }, batchSettings: { dreamPurchaseList: [], maxActive: 1 },
    connectionQueue: { active: 0 }, ensureConnection: async () => { connections++; },
    releaseConnectionSlot() {}, addLog() {},
    message: { success() {}, warning: value => warnings.push(value) },
    tokenStore: { closeWebSocketConnection() {}, sendMessageWithPromise: async (_id, cmd) => {
      calls.push(cmd);
      return { role: { dungeon } };
    } },
  });
  return { tasks, calls, warnings, connections: () => connections };
};

test("closed weekdays reject both dream actions before connecting", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 8, 12) });
  for (const date of [8, 11, 12]) {
    t.mock.timers.setTime(new Date(2026, 8, date, 12).getTime());
    const run = setup({ beginTime: 0 });
    await run.tasks.batchmengjing();
    await run.tasks.batchBuyDreamItems();
    assert.equal(run.connections(), 0);
    assert.deepEqual(run.calls, []);
  }
});

test("dream skips current-period progress and missing state", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 7, 22) });
  for (const dungeon of [undefined, { beginTime: 1788624000, id: 161, battleTeam: { 0: { heroId: 107 } } }]) {
    const run = setup(dungeon);
    await run.tasks.batchmengjing();
    assert.deepEqual(run.calls, ["role_getroleinfo"]);
  }
});

test("dream starts when the previous period has expired", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 9, 12) });
  const run = setup({ beginTime: 1788624000, id: 161 });
  await run.tasks.batchmengjing();
  assert.deepEqual(run.calls, ["role_getroleinfo", "dungeon_selecthero"]);
});

test("unconfigured dream purchases warn without connecting", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 7, 22) });
  const run = setup();
  await run.tasks.batchBuyDreamItems();
  assert.equal(run.connections(), 0);
  assert.ok(run.warnings.some(value => value.includes("配置购买清单")));
});

test("dream purchases default to empty and preserve saved selections", (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let saved = null;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => saved } });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  });
  assert.deepEqual([...useBatchRuntimeSettings().batchSettings.dreamPurchaseList], []);
  saved = JSON.stringify({ dreamPurchaseList: ["1-5"] });
  assert.deepEqual([...useBatchRuntimeSettings().batchSettings.dreamPurchaseList], ["1-5"]);
});

test("dream purchases resolve each account override before connecting", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 7, 12) });
  const calls = [];
  const connected = [];
  const settings = { custom: { dreamPurchaseList: ["2-6"] }, empty: { dreamPurchaseList: [] } };
  const batchSettings = { dreamPurchaseList: ["1-5"], maxActive: 1 };
  const tasks = createTasksDungeon({
    selectedTokens: { value: ["default", "custom", "empty"] },
    tokens: { value: ["default", "custom", "empty"].map(id => ({ id, name: id })) },
    loadSettings: id => settings[id] || {},
    tokenStatus: { value: {} }, isRunning: { value: false }, shouldStop: { value: false },
    currentRunningTokenId: { value: null }, batchSettings,
    connectionQueue: { active: 0 }, ensureConnection: async id => connected.push(id),
    releaseConnectionSlot() {}, addLog() {}, message: { success() {}, warning() {} },
    tokenStore: { closeWebSocketConnection() {}, sendMessageWithPromise: async (id, cmd, params) => {
      if (cmd === "dungeon_buymerchant") calls.push({ account: id, ...params });
      return { role: { levelId: 5000, dungeon: { merchant: { 1: [5], 2: [6] } } }, reward: {} };
    } },
  });
  await tasks.batchBuyDreamItems();
  assert.deepEqual(connected.sort(), ["custom", "default"]);
  assert.deepEqual(calls.sort((a, b) => a.account.localeCompare(b.account)), [
    { account: "custom", id: 2, index: 6, pos: 0 },
    { account: "default", id: 1, index: 5, pos: 0 },
  ]);
  calls.length = 0;
  connected.length = 0;
  batchSettings.dreamPurchaseList = [];
  await tasks.batchBuyDreamItems();
  assert.deepEqual(connected, ["custom"]);
  assert.deepEqual(calls, [{ account: "custom", id: 2, index: 6, pos: 0 }]);
  calls.length = 0;
  connected.length = 0;
  settings.custom.dreamPurchaseEnable = false;
  await tasks.batchBuyDreamItems();
  assert.deepEqual(connected, []);
  assert.deepEqual(calls, []);
});
