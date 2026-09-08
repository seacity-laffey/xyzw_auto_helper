import {
  createTasksArena,
  createTasksBottle,
  createTasksDungeon,
  createTasksHangUp,
  createTasksItem,
  createTasksLegacy,
  createTasksStore,
  createTasksTower,
} from "@/utils/batch";

interface TaskModuleOptions {
  createTaskDeps: () => Record<string, any>;
  openHelperModal: (type: string) => void;
  openLegacyGift: () => void;
  openWarGuessModal: () => void;
}

export const useBatchTaskModules = ({
  createTaskDeps,
  openHelperModal,
  openLegacyGift,
  openWarGuessModal,
}: TaskModuleOptions) => {
  const {
    claimHangUpRewards,
    batchAddHangUpTime,
    batchStudy,
    batchclubsign,
    batchWarGuessCheer,
  } = createTasksHangUp(createTaskDeps());
  const { resetBottles, batchlingguanzi } = createTasksBottle(createTaskDeps());
  const {
    climbTower,
    climbWeirdTower,
    batchClaimFreeEnergy,
    skinChallenge,
    batchUseItems,
    batchMergeItems,
  } = createTasksTower(createTaskDeps());
  const {
    batchOpenBox,
    batchOpenBoxByPoints,
    batchClaimBoxPointReward,
    batchFish,
    batchRecruit,
    batchHeroUpgrade,
    batchBookUpgrade,
    batchClaimStarRewards,
    batchClaimPeachTasks,
    batchGenieSweep,
    batchUseGenieTickets,
    batchFreeGacha,
    batchUseGachaCoins,
  } = createTasksItem(createTaskDeps());
  const { batchmengjing, batchBuyDreamItems } = createTasksDungeon(createTaskDeps());
  const { batcharenafight, batchTopUpFish, batchTopUpArena } = createTasksArena(createTaskDeps());
  const {
    legion_storebuygoods,
    legionStoreBuySkinCoins,
    store_purchase,
    collection_claimfreereward,
  } = createTasksStore(createTaskDeps());
  const { batchLegacyClaim, batchLegacyGiftSendEnhanced } = createTasksLegacy(createTaskDeps());

  const batchFunctionActions = {
    claimHangUpRewards,
    batchAddHangUpTime,
    resetBottles,
    batchlingguanzi,
    batchclubsign,
    batchStudy,
    batcharenafight,
    storePurchase: store_purchase,
    claimCollectionReward: collection_claimfreereward,
    batchGenieSweep,
    batchUseGenieTickets,
    batchFreeGacha,
    batchUseGachaCoins,
    climbTower,
    batchmengjing,
    skinChallenge,
    claimPeachTasks: batchClaimPeachTasks,
    buyDreamItems: batchBuyDreamItems,
    climbWeirdTower,
    useWeirdTowerItems: batchUseItems,
    mergeWeirdTowerItems: batchMergeItems,
    claimWeirdTowerEnergy: batchClaimFreeEnergy,
    openBoxes: () => openHelperModal("box"),
    openPointBoxes: () => openHelperModal("pointsBox"),
    claimBoxPointReward: batchClaimBoxPointReward,
    fish: () => openHelperModal("fish"),
    recruit: () => openHelperModal("recruit"),
    heroUpgrade: batchHeroUpgrade,
    bookUpgrade: batchBookUpgrade,
    claimStarRewards: batchClaimStarRewards,
    buyHolyBeastItems: legion_storebuygoods,
    buySkinCoins: legionStoreBuySkinCoins,
    claimLegacy: batchLegacyClaim,
    openLegacyGift,
    topUpFish: batchTopUpFish,
    topUpArena: batchTopUpArena,
    openWarGuess: openWarGuessModal,
  };

  return {
    ...batchFunctionActions,
    batchFunctionActions,
    batchLegacyGiftSendEnhanced,
    batchLegacyClaim,
    batchOpenBox,
    batchOpenBoxByPoints,
    batchClaimBoxPointReward,
    batchFish,
    batchRecruit,
    batchHeroUpgrade,
    batchBookUpgrade,
    batchClaimStarRewards,
    batchClaimPeachTasks,
    batchGenieSweep,
    batchUseGenieTickets,
    batchFreeGacha,
    batchUseGachaCoins,
    batchmengjing,
    batchBuyDreamItems,
    batcharenafight,
    batchTopUpFish,
    batchTopUpArena,
    legion_storebuygoods,
    legionStoreBuySkinCoins,
    store_purchase,
    collection_claimfreereward,
    claimHangUpRewards,
    batchAddHangUpTime,
    batchStudy,
    batchclubsign,
    batchWarGuessCheer,
    resetBottles,
    batchlingguanzi,
    climbTower,
    climbWeirdTower,
    batchClaimFreeEnergy,
    skinChallenge,
    batchUseItems,
    batchMergeItems,
  };
};
