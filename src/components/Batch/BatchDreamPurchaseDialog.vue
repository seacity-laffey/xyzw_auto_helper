<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>梦境商品购买配置</DialogTitle>
        <DialogDescription>
          只会购买已勾选且出现在商店中的商品。
        </DialogDescription>
      </DialogHeader>

      <div class="quick-actions">
        <Button size="sm" variant="outline" @click="selectGoldItems">
          勾选金币商品
        </Button>
        <Button size="sm" variant="outline" @click="selectAllItems">
          全选
        </Button>
        <Button size="sm" variant="ghost" @click="draft = []">
          清空
        </Button>
      </div>

      <div class="merchant-list">
        <section
          v-for="(merchant, merchantId) in merchantConfig"
          :key="merchantId"
          class="merchant-section"
        >
          <h3>{{ merchant.name }}</h3>
          <div class="item-grid">
            <label
              v-for="(item, itemIndex) in merchant.items"
              :key="itemIndex"
              class="item-option"
            >
              <Checkbox
                :model-value="isSelected(merchantId, itemIndex)"
                @update:model-value="toggleItem(merchantId, itemIndex, $event === true)"
              ></Checkbox>
              <span>{{ item }}</span>
            </label>
          </div>
        </section>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button @click="save">保存配置</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { goldItemsConfig, merchantConfig } from "@/utils/dreamConstants";

const props = defineProps<{
  modelValue: string[];
  open: boolean;
}>();

const emit = defineEmits<{
  "save": [value: string[]];
  "update:open": [value: boolean];
}>();

const draft = ref<string[]>([]);

watch(
  () => props.open,
  (open) => {
    if (open)
      draft.value = [...props.modelValue];
  },
  { immediate: true },
);

const itemKey = (merchantId: string | number, itemIndex: number) =>
  `${merchantId}-${itemIndex}`;

const isSelected = (merchantId: string | number, itemIndex: number) =>
  draft.value.includes(itemKey(merchantId, itemIndex));

const toggleItem = (
  merchantId: string | number,
  itemIndex: number,
  checked: boolean,
) => {
  const key = itemKey(merchantId, itemIndex);
  const selection = new Set(draft.value);
  if (checked)
    selection.add(key);
  else selection.delete(key);
  draft.value = [...selection];
};

const selectGoldItems = () => {
  const selection = new Set(draft.value);
  Object.entries(goldItemsConfig).forEach(([merchantId, indexes]) => {
    indexes.forEach((itemIndex) => selection.add(itemKey(merchantId, itemIndex)));
  });
  draft.value = [...selection];
};

const selectAllItems = () => {
  const selection = new Set(draft.value);
  Object.entries(merchantConfig).forEach(([merchantId, merchant]) => {
    merchant.items.forEach((_, itemIndex) => {
      selection.add(itemKey(merchantId, itemIndex));
    });
  });
  draft.value = [...selection];
};

const save = () => {
  emit("save", [...draft.value]);
  emit("update:open", false);
};
</script>

<style scoped>
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.merchant-list {
  display: grid;
  gap: 18px;
}

.merchant-section {
  display: grid;
  gap: 10px;
}

.merchant-section h3 {
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 650;
}

.item-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
}

.item-option {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: var(--foreground);
  font-size: 13px;
  cursor: pointer;
}

.item-option span {
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 560px) {
  .item-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
