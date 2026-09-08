<template>
  <section class="batch-function-panel" data-testid="batch-function-panel">
    <header class="panel-header">
      <span class="panel-icon"><LayoutGrid :size="18"></LayoutGrid></span>
      <h3>批量功能列表</h3>
    </header>

    <nav aria-label="批量功能分类" class="function-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="function-tab"
        role="tab"
        type="button"
        :aria-selected="activeTab === tab.value"
        :class="{ active: activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="function-content" role="tabpanel">
      <div v-if="activeTab === 'weirdTower'" class="inline-setting">
        <label for="weird-tower-count">挑战次数</label>
        <Input
          id="weird-tower-count"
          class="w-[96px]"
          min="1"
          placeholder="次数"
          type="number"
          :disabled="isRunning"
          :model-value="weirdTowerMaxClimb"
          @update:model-value="updateWeirdTowerMaxClimb"
        ></Input>
        <span>次</span>
      </div>

      <div class="function-actions">
        <Button
          v-for="item in activeActions"
          :key="item.action"
          size="sm"
          variant="outline"
          :disabled="item.disabled"
          :title="item.title"
          @click="emit('action', item.action)"
        >
          {{ item.label }}
        </Button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useNow } from "@vueuse/core";
import { canDrawFreeGacha } from "@/utils/dailyRewardEligibility";
import { LayoutGrid } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FunctionTab
  = | "daily"
    | "dungeon"
    | "weirdTower"
    | "resource"
    | "legacy"
    | "monthly";

interface ActionItem {
  action: string;
  label: string;
  disabled: boolean;
  title?: string;
}

const props = defineProps<{
  arenaActivityOpen: boolean;
  dreamActivityOpen: boolean;
  isRunning: boolean;
  selectedCount: number;
  warGuessActivityOpen: boolean;
  warGuessActivityTip: string;
  weirdTowerActivityOpen: boolean;
  weirdTowerMaxClimb: number;
}>();

const emit = defineEmits<{
  "action": [action: string];
  "update:weirdTowerMaxClimb": [value: number];
}>();

const tabs: Array<{ label: string; value: FunctionTab }> = [
  { label: "日常", value: "daily" },
  { label: "副本", value: "dungeon" },
  { label: "怪异塔", value: "weirdTower" },
  { label: "资源", value: "resource" },
  { label: "功法", value: "legacy" },
  { label: "月度", value: "monthly" },
];

const activeTab = ref<FunctionTab>("daily");
const now = useNow({ interval: 1000 });
const baseDisabled = computed(() => props.isRunning || props.selectedCount === 0);
const activityDisabled = (open: boolean) => baseDisabled.value || !open;

const activeActions = computed<ActionItem[]>(() => {
  const common = baseDisabled.value;
  const groups: Record<FunctionTab, ActionItem[]> = {
    daily: [
      { action: "claimHangUpRewards", label: "领取挂机", disabled: common },
      { action: "batchAddHangUpTime", label: "一键加钟", disabled: common },
      { action: "resetBottles", label: "重置罐子", disabled: common },
      { action: "batchlingguanzi", label: "一键领取罐子", disabled: common },
      { action: "batchclubsign", label: "一键俱乐部签到", disabled: common },
      { action: "batchStudy", label: "一键答题", disabled: common },
      {
        action: "batcharenafight",
        label: "一键竞技场战斗3次",
        disabled: activityDisabled(props.arenaActivityOpen),
      },
      { action: "storePurchase", label: "一键黑市采购", disabled: common },
      { action: "claimCollectionReward", label: "一键领取珍宝阁", disabled: common },
      { action: "batchGenieSweep", label: "一键免费灯神扫荡", disabled: common },
      { action: "batchUseGenieTickets", label: "一键使用灯神券", disabled: common },
      { action: "batchFreeGacha", label: "一键免费扭蛋", disabled: common || !canDrawFreeGacha({}, now.value), title: "周二、周四、周六开放" },
      { action: "batchUseGachaCoins", label: "一键使用扭蛋币", disabled: common },
    ],
    dungeon: [
      { action: "climbTower", label: "一键爬塔", disabled: common },
      {
        action: "batchmengjing",
        label: "一键梦境",
        disabled: activityDisabled(props.dreamActivityOpen),
      },
      { action: "skinChallenge", label: "一键换皮闯关", disabled: common },
      { action: "claimPeachTasks", label: "一键领取蟠桃园任务", disabled: common },
      {
        action: "buyDreamItems",
        label: "一键购买梦境商品",
        disabled: activityDisabled(props.dreamActivityOpen),
      },
    ],
    weirdTower: [
      {
        action: "climbWeirdTower",
        label: "一键爬怪异塔",
        disabled: activityDisabled(props.weirdTowerActivityOpen),
      },
      {
        action: "useWeirdTowerItems",
        label: "一键使用怪异塔道具",
        disabled: activityDisabled(props.weirdTowerActivityOpen),
      },
      {
        action: "mergeWeirdTowerItems",
        label: "一键怪异塔合成",
        disabled: activityDisabled(props.weirdTowerActivityOpen),
      },
      {
        action: "claimWeirdTowerEnergy",
        label: "一键领取怪异塔免费道具",
        disabled: activityDisabled(props.weirdTowerActivityOpen),
      },
    ],
    resource: [
      { action: "openBoxes", label: "批量开箱", disabled: common },
      { action: "openPointBoxes", label: "按积分开箱", disabled: common },
      { action: "claimBoxPointReward", label: "领取宝箱积分", disabled: common },
      { action: "fish", label: "批量钓鱼", disabled: common },
      { action: "recruit", label: "批量招募", disabled: common },
      { action: "heroUpgrade", label: "一键英雄升星", disabled: common },
      { action: "bookUpgrade", label: "一键图鉴升星", disabled: common },
      { action: "claimStarRewards", label: "一键领取图鉴奖励", disabled: common },
      { action: "buyHolyBeastItems", label: "一键购买四圣碎片", disabled: common },
      { action: "buySkinCoins", label: "一键购买俱乐部5皮肤币", disabled: common },
    ],
    legacy: [
      { action: "claimLegacy", label: "批量功法残卷领取", disabled: common },
      { action: "openLegacyGift", label: "批量功法残卷赠送", disabled: common },
    ],
    monthly: [
      { action: "topUpFish", label: "一键钓鱼补齐", disabled: common },
      {
        action: "topUpArena",
        label: "一键竞技场补齐",
        disabled: activityDisabled(props.arenaActivityOpen),
      },
      {
        action: "openWarGuess",
        label: "月赛助威",
        disabled: activityDisabled(props.warGuessActivityOpen),
        title: props.warGuessActivityOpen ? "" : props.warGuessActivityTip,
      },
    ],
  };
  return groups[activeTab.value];
});

const updateWeirdTowerMaxClimb = (value: string | number) => {
  const parsed = Math.max(1, Math.trunc(Number(value) || 1));
  emit("update:weirdTowerMaxClimb", parsed);
};
</script>

<style scoped>
.batch-function-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

.panel-header h3 {
  margin: 0;
  color: var(--foreground);
  font-size: 15px;
  font-weight: 600;
}

.panel-icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  border-radius: var(--radius);
  background: var(--muted);
  color: var(--foreground);
}

.function-tabs {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid var(--border);
  scrollbar-width: none;
}

.function-tabs::-webkit-scrollbar {
  display: none;
}

.function-tab {
  min-width: max-content;
  height: 40px;
  padding: 0 20px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--muted-foreground);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.function-tab:hover,
.function-tab.active {
  color: var(--foreground);
}

.function-tab.active {
  border-bottom-color: var(--foreground);
  font-weight: 600;
}

.function-content {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.inline-setting {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.function-actions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.function-actions > button {
  min-height: 42px;
  justify-content: flex-start;
  white-space: normal;
  text-align: left;
}

@media (max-width: 1024px) {
  .batch-function-panel {
    min-height: 520px;
  }
}

@media (max-width: 640px) {
  .panel-header,
  .function-content {
    padding-right: 14px;
    padding-left: 14px;
  }

  .function-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .function-actions > button {
    min-height: 48px;
  }
}
</style>
