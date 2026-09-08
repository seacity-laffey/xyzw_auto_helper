<template>
  <section class="purchase-config">
    <div v-if="loading" class="config-state">
      <LoaderCircle class="animate-spin" :size="16"></LoaderCircle>
      正在读取游戏配置
    </div>
    <div v-else-if="error" class="config-state error-state">
      <span>{{ error }}</span>
      <Button size="sm" variant="outline" :disabled="disabled" @click="emit('retry')">
        <RefreshCw :size="14"></RefreshCw>
        重试
      </Button>
    </div>
    <template v-else-if="modelValue">
      <div class="count-row">
        <Label for="black-market-purchase-count">每日采购次数</Label>
        <Input
          id="black-market-purchase-count"
          class="!w-24 shrink-0"
          min="1"
          type="number"
          :disabled="disabled"
          :model-value="modelValue.purchaseCnt"
          @update:model-value="updateCount"
        ></Input>
      </div>

      <div class="list-heading">
        <span>全部商品 · {{ itemOptions.length }}</span>
        <span>已选 {{ modelValue.purchaseItemList.length }} 项</span>
      </div>
      <div class="item-list">
        <div v-for="item in itemOptions" :key="item.itemId" class="item-row" :class="{ 'is-selected': isSelected(item.itemId) }">
          <label class="item-toggle">
            <Checkbox
              :aria-label="item.name"
              :disabled="disabled"
              :model-value="isSelected(item.itemId)"
              @update:model-value="toggleItem(item.itemId, $event === true)"
            ></Checkbox>
            <img v-if="itemImages[item.itemId]" alt="" class="item-image" :src="itemImages[item.itemId]">
            <Package v-else class="item-image item-placeholder" :size="28"></Package>
            <span>{{ item.name }}</span>
          </label>
          <label class="discount-row">
            <span>最高折扣</span>
            <select
              :aria-label="`${item.name}最高折扣`"
              :disabled="disabled || !isSelected(item.itemId)"
              :value="getDiscount(item.itemId)"
              @change="updateDiscount(item.itemId, $event)"
            >
              <option v-for="discount in discounts" :key="discount" :value="discount">
                {{ discount }}折
              </option>
            </select>
          </label>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { LoaderCircle, Package, RefreshCw } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BLACK_MARKET_ITEMS,

} from "@/utils/blackMarketPurchase";
import type { BlackMarketPurchaseConfig } from "@/utils/blackMarketPurchase";

const props = defineProps<{
  disabled?: boolean;
  error?: string;
  loading?: boolean;
  modelValue: BlackMarketPurchaseConfig | null;
}>();

const emit = defineEmits<{
  "retry": [];
  "update:modelValue": [value: BlackMarketPurchaseConfig];
}>();

const discounts = Array.from({ length: 10 }, (_, index) => index + 1);
const itemImages: Record<number, string> = {
  1001: "/icons/zml.png",
  1011: "/fish/ptyg.png",
  1012: "/fish/hjyg.png",
  2002: "/box/qtbx.png",
  2003: "/box/hjbx.png",
  2004: "/box/bjbx.png",
};
const itemOptions = computed(() => {
  const knownIds = new Set<number>(BLACK_MARKET_ITEMS.map((item) => item.itemId));
  const unknownItems = (props.modelValue?.purchaseItemList || [])
    .filter((item) => !knownIds.has(item.itemId))
    .map((item) => ({ itemId: item.itemId, name: `道具 ${item.itemId}` }));
  return [...BLACK_MARKET_ITEMS, ...unknownItems];
});

const isSelected = (itemId: number) =>
  props.modelValue?.purchaseItemList.some((item) => item.itemId === itemId) || false;

const getDiscount = (itemId: number) =>
  props.modelValue?.purchaseItemList.find((item) => item.itemId === itemId)?.discount || 1;

const updateConfig = (patch: Partial<BlackMarketPurchaseConfig>) => {
  if (!props.modelValue)
    return;
  emit("update:modelValue", { ...props.modelValue, ...patch });
};

const updateCount = (value: string | number) => {
  const purchaseCnt = Math.max(1, Math.trunc(Number(value) || 1));
  updateConfig({ purchaseCnt });
};

const toggleItem = (itemId: number, selected: boolean) => {
  if (!props.modelValue)
    return;
  const purchaseItemList = selected
    ? [...props.modelValue.purchaseItemList, { itemId, discount: 1 }]
    : props.modelValue.purchaseItemList.filter((item) => item.itemId !== itemId);
  updateConfig({ purchaseItemList });
};

const updateDiscount = (itemId: number, event: Event) => {
  const discount = Number((event.target as HTMLSelectElement).value);
  updateConfig({
    purchaseItemList: (props.modelValue?.purchaseItemList || []).map((item) =>
      item.itemId === itemId ? { ...item, discount } : item),
  });
};
</script>

<style scoped>
.purchase-config {
  display: grid;
  gap: 12px;
  padding-top: 4px;
}

.count-row,
.list-heading,
.item-row,
.item-toggle,
.config-state {
  display: flex;
  align-items: center;
}

.count-row,
.list-heading,
.item-row {
  justify-content: space-between;
  gap: 16px;
}

.config-state {
  min-height: 64px;
  justify-content: center;
  gap: 8px;
  color: var(--muted-foreground);
  font-size: 13px;
}

.error-state {
  flex-direction: column;
  color: var(--destructive);
}

.count-row > label {
  white-space: nowrap;
}

.item-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.list-heading {
  min-height: 34px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.item-row {
  display: grid;
  justify-content: normal;
  gap: 12px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
}

.item-row.is-selected {
  border-color: #16806a;
  background: color-mix(in srgb, #16806a 8%, var(--background));
}

.item-image {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}

.item-placeholder {
  color: var(--muted-foreground);
}

.discount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--muted-foreground);
}

.item-toggle {
  min-width: 0;
  gap: 9px;
  font-size: 13px;
  cursor: pointer;
}

.item-toggle span {
  overflow-wrap: anywhere;
}

.item-row select {
  height: 32px;
  min-width: 76px;
  padding: 0 8px;
  border: 1px solid var(--input);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--foreground);
  font: inherit;
  font-size: 13px;
}

.item-row select:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 600px) {
  .item-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .item-row {
    padding: 10px;
  }

  .item-toggle {
    flex-wrap: wrap;
  }

  .item-toggle span {
    flex-basis: 100%;
  }

  .discount-row {
    display: grid;
    gap: 4px;
  }

  .discount-row select {
    width: 100%;
  }
}
</style>
