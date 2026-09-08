import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
const config = await createJiti(import.meta.url).import("../src/utils/taskTemplateConfig.ts");

const storage = (t) => {
  const entries = new Map();
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  } });
  t.after(() => original ? Object.defineProperty(globalThis, "localStorage", original) : delete globalThis.localStorage);
  return (key, value) => localStorage.setItem(key, JSON.stringify(value));
};

test("new accounts use an undeletable system template and resolve live changes", t => {
  storage(t);
  const first = config.resolveAccountTaskSettings("new");
  assert.equal(first.templateId, config.SYSTEM_TEMPLATE_ID);
  assert.equal(first.dreamPurchaseEnable, false);
  const templates = config.loadTaskTemplates();
  templates[0].settings.openBox = false;
  config.saveTaskTemplates(templates);
  assert.equal(config.resolveAccountTaskSettings("new").openBox, false);
  assert.equal(first.openBox, true);
  assert.throws(() => config.saveTaskTemplates([]), /不能删除/);
});

test("migration backs up and preserves account differences without repeat copies", t => {
  const put = storage(t);
  put("daily-settings:a", { openBox: false, dreamPurchaseList: ["1-5"] });
  put("batchSettings", { dreamPurchaseList: ["2-6"] });
  config.migrateTaskAccounts([{ id: "a", name: "A" }]);
  const resolved = config.resolveAccountTaskSettings("a");
  assert.equal(resolved.openBox, false);
  assert.deepEqual(resolved.dreamPurchaseList, ["1-5"]);
  assert.equal(resolved.templateId, "migrated:a");
  assert.ok(localStorage.getItem("task-template-migration-backup:v1"));
  config.migrateTaskAccounts([{ id: "a" }]);
  assert.equal(config.loadTaskTemplates().length, 2);
});

test("binding does not overwrite procurement overrides and empty overrides do not fall back", t => {
  storage(t);
  config.migrateTaskAccounts([{ id: "a" }]);
  const templates = config.loadTaskTemplates();
  templates.push({ id: "custom", name: "Custom", settings: { ...config.createDefaultTemplateSettings(), dreamPurchaseEnable: true, dreamPurchaseList: ["1-5"] }, createdAt: "2026-09-08" });
  config.saveTaskTemplates(templates);
  config.saveAccountTaskBinding("a", { templateId: "custom", dreamPurchaseList: null });
  assert.deepEqual(config.resolveAccountTaskSettings("a").dreamPurchaseList, ["1-5"]);
  config.saveAccountTaskBinding("a", { templateId: "custom", dreamPurchaseList: [] });
  assert.deepEqual(config.resolveAccountTaskSettings("a").dreamPurchaseList, []);
  config.saveTaskTemplates(templates.filter(t => t.id !== "custom"));
  assert.throws(() => config.resolveAccountTaskSettings("a"), /不存在/);
});

test("migration retains the original template binding when its copied settings still match", t => {
  const put = storage(t);
  const settings = config.createDefaultTemplateSettings();
  put("task-templates", [{ id: "original", name: "Original", settings, createdAt: "2026-09-08" }]);
  put("daily-settings:a", { ...settings, templateId: "original" });
  assert.equal(config.resolveAccountTaskSettings("a").templateId, "original");
});

test("batch execution snapshots all account templates before any account starts", async t => {
  storage(t);
  const { useBatchDailyRunner } = await createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } }).import("../src/composables/useBatchDailyRunner.ts");
  config.migrateTaskAccounts([{ id: "a" }, { id: "b" }]);
  const templates = config.loadTaskTemplates();
  config.TEMPLATE_TASK_FIELDS.forEach(({ key }) => { templates[0].settings[key] = false; });
  templates[0].settings.shareEnable = true;
  config.saveTaskTemplates(templates);
  const calls = [];
  const runner = useBatchDailyRunner({
    addLog() {}, batchSettings: { commandDelay: 0, taskDelay: 0 }, connectionQueue: { active: 0 },
    currentRunningTokenId: { value: null }, isRunning: { value: false }, shouldStop: { value: false },
    selectedTokens: { value: ["a", "b"] }, tokenStatus: { value: {} }, tokens: { value: [{ id: "a", name: "A" }, { id: "b", name: "B" }] },
    releaseConnectionSlot() {}, message: { success() {} },
    ensureConnection: async () => { templates[0].settings.shareEnable = false; config.saveTaskTemplates(templates); },
    tokenStore: {
      closeWebSocketConnection() {},
      sendGetRoleInfo: async () => ({ role: { statistics: {}, statisticsTime: {} } }),
      sendMessageWithPromise: async (id, cmd) => { if (cmd === "system_mysharecallback") calls.push(id); return {}; },
    },
  });
  await runner.startBatch();
  assert.deepEqual(calls.sort(), ["a", "b"]);
  assert.equal(config.resolveAccountTaskSettings("a").shareEnable, false);
});
