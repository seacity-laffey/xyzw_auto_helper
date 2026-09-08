import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const { createScheduledTaskParameters, validateScheduledTaskParameters } = await jiti.import("../src/utils/scheduledTaskParameters.ts");
const { sanitizeScheduledTask, useScheduledTaskStorage } = await jiti.import("../src/composables/useScheduledTaskStorage.ts");
const { useBatchScheduledTaskExecution } = await jiti.import("../src/composables/useBatchScheduledTaskExecution.ts");
const storage = (t) => {
  const data = new Map();
  const old = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) } });
  t.after(() => old ? Object.defineProperty(globalThis, "localStorage", old) : delete globalThis.localStorage);
};

test("old schedules snapshot legacy parameters and preserve them across later global changes", (t) => {
  storage(t);
  localStorage.setItem("batchSettings", JSON.stringify({ boxCount: 240, defaultBoxType: 2003, receiverId: "123", password: "fixture" }));
  localStorage.setItem("scheduledTasks", JSON.stringify([{ id: "old", selectedTasks: ["batchOpenBox"], enabled: true }]));
  const tasks = useScheduledTaskStorage({ addLog() {}, notify() {} }).scheduledTasks.value;
  assert.equal(tasks[0].parameters.boxCount, 240);
  assert.equal(tasks[0].parameters.defaultBoxType, 2003);
  assert.ok(localStorage.getItem("scheduled-task-parameters-backup:v1"));
  localStorage.setItem("batchSettings", JSON.stringify({ boxCount: 1 }));
  assert.equal(useScheduledTaskStorage({ addLog() {}, notify() {} }).scheduledTasks.value[0].parameters.boxCount, 240);
  assert.equal(sanitizeScheduledTask({ selectedTasks: ["batchFish"], parameters: { fishCount: 30 } }).parameters.fishCount, 30);
});

test("only selected tasks require parameters and gifting requires a recipient and password", () => {
  const params = createScheduledTaskParameters();
  assert.equal(validateScheduledTaskParameters(["batchOpenBox"], params), "");
  assert.match(validateScheduledTaskParameters(["batchLegacyGiftSendEnhanced"], params), /接收者/);
  assert.match(validateScheduledTaskParameters(["batchOpenBox"], { ...params, boxCount: -1 }), /开箱/);
});

test("scheduled execution passes independent parameter snapshots without changing global defaults", async (t) => {
  storage(t);
  const calls = [];
  const tokens = { value: [{ id: "a", name: "A" }] };
  const runner = useBatchScheduledTaskExecution({
    addLog() {},
    arenaActivityOpen: { value: true },
    dreamActivityOpen: { value: true },
    weirdTowerActivityOpen: { value: true },
    getTaskFunction: (name) => async (...args) => calls.push({ name, args }),
    isRunning: { value: false },
    message: { success() {} },
    selectedTokens: { value: [] },
    shouldStop: { value: false },
    tokenStore: { gameTokens: tokens.value },
    tokens,
  });
  const makeTask = (id, count) => ({ id, name: id, selectedTasks: ["batchOpenBox"], selectedTokens: ["a"], parameters: createScheduledTaskParameters({ boxCount: count }) });
  await runner.executeScheduledTask(makeTask("first", 20));
  await runner.executeScheduledTask(makeTask("second", 90));
  assert.deepEqual(calls.map((c) => [c.args[0], c.args[1]?.boxCount]), [[true, 20], [true, 90]]);
  assert.equal(localStorage.getItem("batchSettings"), null);
});
