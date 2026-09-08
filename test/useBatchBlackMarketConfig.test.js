import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { useBatchBlackMarketConfig } = await jiti.import(
  "../src/composables/useBatchBlackMarketConfig.ts",
);

const createSync = ({ connected = false, ensureError = null } = {}) => {
  const calls = [];
  const tokenStore = {
    closeWebSocketConnection: (tokenId) => calls.push(["close", tokenId]),
    getWebSocketStatus: () => connected ? "connected" : "disconnected",
    sendMessageWithPromise: async (_tokenId, command, params) => {
      calls.push([command, params]);
      return command === "store_getpurchase"
        ? { purchaseCnt: 1, purchaseItemList: [{ itemId: 2002, discount: 10 }] }
        : params;
    },
  };
  const sync = useBatchBlackMarketConfig({
    ensureConnection: async (tokenId) => {
      calls.push(["ensure", tokenId]);
      if (ensureError)
        throw ensureError;
      return true;
    },
    releaseConnectionSlot: () => calls.push(["release"]),
    tokenStore,
  });
  return { calls, sync };
};

test("loads the game config without closing an existing connection", async () => {
  const { calls, sync } = createSync({ connected: true });
  await sync.loadBlackMarketConfig("token-1");

  assert.deepEqual(sync.blackMarketConfig.value, {
    purchaseCnt: 1,
    purchaseItemList: [{ itemId: 2002, discount: 10 }],
  });
  assert.deepEqual(calls, [["store_getpurchase", {}]]);
});

test("releases only the connection acquired for config synchronization", async () => {
  const { calls, sync } = createSync();
  await sync.loadBlackMarketConfig("token-1");

  assert.deepEqual(calls, [
    ["ensure", "token-1"],
    ["store_getpurchase", {}],
    ["close", "token-1"],
    ["release"],
  ]);
});

test("does not release again when connection acquisition fails", async () => {
  const { calls, sync } = createSync({ ensureError: new Error("连接失败") });
  await sync.loadBlackMarketConfig("token-1");

  assert.equal(sync.blackMarketError.value, "读取失败：连接失败");
  assert.deepEqual(calls, [["ensure", "token-1"]]);
});

test("saves the normalized config through the game protocol", async () => {
  const { calls, sync } = createSync({ connected: true });
  sync.blackMarketConfig.value = {
    purchaseCnt: 2,
    purchaseItemList: [{ itemId: 1012, discount: 1 }],
  };
  await sync.saveBlackMarketConfig("token-1");

  assert.deepEqual(calls, [["store_setpurchase", {
    purchaseCnt: 2,
    purchaseItemList: [{ itemId: 1012, discount: 1 }],
  }]]);
});

test("saving only an account template binding does not rewrite unchanged game procurement", async () => {
  const { calls, sync } = createSync({ connected: true });
  await sync.loadBlackMarketConfig("token-1");
  calls.length = 0;
  await sync.saveBlackMarketConfig("token-1");
  assert.deepEqual(calls, []);
});
