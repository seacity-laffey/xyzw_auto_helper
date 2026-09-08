import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { createTasksStore } = await jiti.import("../src/utils/batch/tasksStore.ts");

const runPurchase = async (purchaseConfig, enabled = true) => {
  const commands = [];
  const logs = [];
  const tokenStatus = { value: {} };
  const tasks = createTasksStore({
    loadSettings: () => ({ blackMarketPurchase: enabled }),
    addLog: (entry) => logs.push(entry),
    batchSettings: { maxActive: 1 },
    connectionQueue: { active: 1 },
    currentRunningTokenId: { value: null },
    delayConfig: { action: 0 },
    ensureConnection: async () => true,
    isRunning: { value: false },
    message: {},
    releaseConnectionSlot: () => {},
    selectedTokens: { value: ["token-1"] },
    shouldStop: { value: false },
    tokenStatus,
    tokenStore: {
      closeWebSocketConnection: () => {},
      sendMessageWithPromise: async (_tokenId, command, params) => {
        commands.push({ command, params });
        return command === "store_getpurchase" ? purchaseConfig : {};
      },
    },
    tokens: { value: [{ id: "token-1", name: "测试账号" }] },
  });

  await tasks.store_purchase();
  return { commands, logs, tokenStatus: tokenStatus.value };
};

test("batch black market purchase skips accounts without a game config", async () => {
  const result = await runPurchase({ purchaseCnt: 1, purchaseItemList: [] });
  assert.deepEqual(result.commands, [{ command: "store_getpurchase", params: {} }]);
  assert.equal(result.tokenStatus["token-1"], "completed");
  assert.equal(result.logs.some((entry) => entry.message.includes("已跳过")), true);
});

test("batch black market purchase delegates to the game one-click purchase", async () => {
  const result = await runPurchase({
    purchaseCnt: 2,
    purchaseItemList: [{ itemId: 1012, discount: 1 }],
  });
  assert.deepEqual(result.commands, [
    { command: "store_getpurchase", params: {} },
    { command: "store_purchase", params: {} },
  ]);
  assert.equal(result.tokenStatus["token-1"], "completed");
});

test("template-disabled black market purchase never sends a game request", async () => {
  const result = await runPurchase({ purchaseCnt: 1, purchaseItemList: [{ itemId: 2002, discount: 1 }] }, false);
  assert.deepEqual(result.commands, []);
  assert.equal(result.tokenStatus["token-1"], "skipped");
});
