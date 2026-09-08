import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  canRunBlackMarketPurchase,
  normalizeBlackMarketPurchaseConfig,
} = await jiti.import("../src/utils/blackMarketPurchase.ts");

test("normalizes black market config returned by the game", () => {
  assert.deepEqual(normalizeBlackMarketPurchaseConfig({
    purchaseCnt: "2",
    purchaseItemList: [
      { itemId: 2003, discount: 1 },
      { itemId: 2003, discount: 8 },
      { itemId: 1012, discount: 12 },
      { itemId: 0, discount: 5 },
    ],
  }), {
    purchaseCnt: 2,
    purchaseItemList: [
      { itemId: 2003, discount: 1 },
      { itemId: 1012, discount: 10 },
    ],
  });
});

test("requires both a purchase count and at least one configured item", () => {
  assert.equal(canRunBlackMarketPurchase({ purchaseCnt: 1, purchaseItemList: [] }), false);
  assert.equal(canRunBlackMarketPurchase({
    purchaseCnt: 1,
    purchaseItemList: [{ itemId: 2002, discount: 10 }],
  }), true);
});
