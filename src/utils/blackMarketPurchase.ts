export interface BlackMarketPurchaseItem {
  discount: number;
  itemId: number;
}

export interface BlackMarketPurchaseConfig {
  purchaseCnt: number;
  purchaseItemList: BlackMarketPurchaseItem[];
}

export const BLACK_MARKET_ITEMS = [
  // 游戏 GoodsConf 的完整商品种类，使用 merchandise.itemId（不是 goodsId）。
  { itemId: 1001, name: "招募令" },
  { itemId: 1003, name: "进阶石" },
  { itemId: 1006, name: "精铁" },
  { itemId: 1007, name: "咸神门票" },
  { itemId: 1011, name: "普通鱼竿" },
  { itemId: 1012, name: "黄金鱼竿" },
  { itemId: 1016, name: "梦魇晶石" },
  { itemId: 1022, name: "白玉" },
  { itemId: 1023, name: "彩玉" },
  { itemId: 1026, name: "扳手" },
  { itemId: 2002, name: "青铜宝箱" },
  { itemId: 2003, name: "黄金宝箱" },
  { itemId: 2004, name: "铂金宝箱" },
  { itemId: 3005, name: "随机紫将碎片" },
  { itemId: 3006, name: "随机橙将碎片" },
  { itemId: 3007, name: "随机红将碎片" },
] as const;

const toInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

export const normalizeBlackMarketPurchaseConfig = (
  value: unknown,
): BlackMarketPurchaseConfig => {
  const source = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const rawItems = Array.isArray(source.purchaseItemList)
    ? source.purchaseItemList
    : [];
  const seen = new Set<number>();
  const purchaseItemList = rawItems.flatMap((item) => {
    if (!item || typeof item !== "object")
      return [];
    const record = item as Record<string, unknown>;
    const itemId = toInteger(record.itemId, 0);
    if (itemId <= 0 || seen.has(itemId))
      return [];
    seen.add(itemId);
    return [{
      itemId,
      discount: Math.min(10, Math.max(1, toInteger(record.discount, 1))),
    }];
  });

  return {
    purchaseCnt: Math.max(0, toInteger(source.purchaseCnt, 0)),
    purchaseItemList,
  };
};

export const canRunBlackMarketPurchase = (value: unknown) => {
  const config = normalizeBlackMarketPurchaseConfig(value);
  return config.purchaseCnt > 0 && config.purchaseItemList.length > 0;
};
