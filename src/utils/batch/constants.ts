/**
 * 批量日常任务常量配置
 */

// 宝箱类型选项
export const boxTypeOptions = [
  { label: "木质宝箱", value: 2001 },
  { label: "青铜宝箱", value: 2002 },
  { label: "黄金宝箱", value: 2003 },
  { label: "铂金宝箱", value: 2004 },
];

// 鱼竿类型选项
export const fishTypeOptions = [
  { label: "普通鱼竿", value: 1 },
  { label: "黄金鱼竿", value: 2 },
];

// 阵容选项
export const formationOptions = [1, 2, 3, 4, 5, 6].map((v) => ({
  label: `阵容${v}`,
  value: v,
}));

// BOSS次数选项
export const bossTimesOptions = [0, 1, 2, 3, 4].map((v) => ({
  label: `${v}次`,
  value: v,
}));

// 可用的定时任务列表
export const availableTasks = [
  { label: "执行账号日常模板", value: "startBatch" },
  { label: "领取挂机", value: "claimHangUpRewards" },
  { label: "一键加钟", value: "batchAddHangUpTime" },
  { label: "重置罐子", value: "resetBottles" },
  { label: "一键领取罐子", value: "batchlingguanzi" },
  { label: "一键爬塔", value: "climbTower" },
  { label: "一键爬怪异塔", value: "climbWeirdTower" },
  { label: "一键答题", value: "batchStudy" },
  { label: "批量开箱", value: "batchOpenBox" },
  { label: "按积分开箱", value: "batchOpenBoxByPoints" },
  { label: "领取宝箱积分", value: "batchClaimBoxPointReward" },
  { label: "批量钓鱼", value: "batchFish" },
  { label: "批量招募", value: "batchRecruit" },
  { label: "一键梦境", value: "batchmengjing" },
  { label: "一键俱乐部签到", value: "batchclubsign" },
  { label: "一键竞技场战斗3次", value: "batcharenafight" },
  { label: "一键钓鱼补齐", value: "batchTopUpFish" },
  { label: "一键竞技场补齐", value: "batchTopUpArena" },
  { label: "一键领取怪异塔免费道具", value: "batchClaimFreeEnergy" },
  { label: "一键换皮闯关", value: "skinChallenge" },
  { label: "一键购买四圣碎片", value: "legion_storebuygoods" },
  { label: "一键黑市采购", value: "store_purchase" },
  { label: "免费领取珍宝阁", value: "collection_claimfreereward" },
  { label: "批量领取功法残卷", value: "batchLegacyClaim" },
  { label: "批量赠送功法残卷", value: "batchLegacyGiftSendEnhanced" },
  { label: "一键使用怪异塔道具", value: "batchUseItems" },
  { label: "一键怪异塔合成", value: "batchMergeItems" },
  { label: "一键领取蟠桃园任务", value: "batchClaimPeachTasks" },
  { label: "一键免费灯神扫荡", value: "batchGenieSweep" },
  { label: "一键使用灯神券", value: "batchUseGenieTickets" },
  { label: "一键免费扭蛋", value: "batchFreeGacha" },
  { label: "一键使用扭蛋币", value: "batchUseGachaCoins" },
  { label: "一键购买梦境商品", value: "batchBuyDreamItems" },
];

// 月度任务目标
export const FISH_TARGET = 320;
export const ARENA_TARGET = 240;
