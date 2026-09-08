import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";
const { createTasksLegacy } = await createJiti(import.meta.url).import("../src/utils/batch/tasksLegacy.ts");

for (const quantity of [0, 3]) {
  test(`scheduled gifts use independent inventory with quantity ${quantity}`, async () => {
    const calls = [];
    const tasks = createTasksLegacy({
      selectedTokens: { value: ["a", "b"] }, tokens: { value: [{ id: "a", name: "A" }, { id: "b", name: "B" }] },
      tokenStatus: { value: {} }, isRunning: { value: false }, shouldStop: { value: false }, currentRunningTokenId: { value: null },
      batchSettings: { maxActive: 2, receiverId: 999, password: "unused" }, connectionQueue: { active: 0 },
      recipientIdInput: { value: 999 }, recipientInfo: { value: {} }, securityPassword: { value: "unused" }, giftQuantity: { value: 1 }, delayConfig: { long: 0 },
      ensureConnection: async () => {}, releaseConnectionSlot() {}, addLog() {}, message: { success() {}, warning() {}, error(text) { assert.fail(text); } },
      tokenStore: {
        closeWebSocketConnection() {}, sendMessage() {},
        sendGetRoleInfo: async id => ({ role: { level: 6000, levelId: 8001, items: { 37007: { quantity: id === "a" ? 7 : 13 } } } }),
        sendMessageWithPromise: async (id, cmd, data) => {
          calls.push({ id, cmd, data });
          return { roleInfo: { roleId: 123 }, role: { statistics: { "que:wh:tm": 1 } } };
        },
      },
    });
    await tasks.batchLegacyGiftSendEnhanced(true, { receiverId: "123", password: "fixture", giftQuantity: quantity });
    const gifts = calls.filter(call => call.cmd === "legacy_sendgift");
    assert.deepEqual(gifts.map(call => [call.id, call.data.itemCnt, call.data.targetId]), [["a", quantity || 7, 123], ["b", quantity || 13, 123]]);
    assert.ok(calls.filter(call => call.cmd === "role_commitpassword").every(call => call.data.password === "fixture"));
  });
}

for (const action of ["batchLegacyClaim", "batchLegacyGiftSendEnhanced"]) {
  test(`${action} skips locked and unknown accounts before claiming or verifying passwords`, async () => {
    const calls = [];
    const states = { value: {} };
    const roles = {
      lowLevel: { level: 5999, levelId: 8001 },
      lowStage: { level: 6000, levelId: 8000 },
      unknown: {},
      open: { level: 6000, levelId: 8001 },
    };
    const tasks = createTasksLegacy({
      selectedTokens: { value: Object.keys(roles) }, tokens: { value: Object.keys(roles).map(id => ({ id, name: id })) },
      tokenStatus: states, isRunning: { value: false }, shouldStop: { value: false }, currentRunningTokenId: { value: null },
      batchSettings: { maxActive: 1 }, connectionQueue: { active: 0 },
      recipientIdInput: { value: 123 }, recipientInfo: { value: {} }, securityPassword: { value: "test" }, giftQuantity: { value: 1 }, delayConfig: { long: 0 },
      ensureConnection: async () => {}, releaseConnectionSlot() {}, addLog() {}, message: { success() {}, warning() {}, error() {} },
      tokenStore: {
        closeWebSocketConnection() {}, sendMessage() {},
        sendGetRoleInfo: async id => ({ role: { ...roles[id], items: { 37007: { quantity: 10 } } } }),
        sendMessageWithPromise: async (id, cmd) => {
          calls.push({ id, cmd });
          return { reward: [{ value: 1 }], role: { ...roles[id], statistics: { "que:wh:tm": 1 }, items: { 37007: { quantity: 10 } } } };
        },
      },
    });
    await tasks[action]();
    const mutations = calls.filter(({ cmd }) => ["legacy_claimhangup", "legacy_sendgift", "role_commitpassword"].includes(cmd));
    assert.ok(mutations.length > 0);
    assert.ok(mutations.every(({ id }) => id === "open"));
    for (const id of ["lowLevel", "lowStage", "unknown"])
      assert.equal(states.value[id], "skipped");
    assert.equal(states.value.open, "completed");
  });
}
