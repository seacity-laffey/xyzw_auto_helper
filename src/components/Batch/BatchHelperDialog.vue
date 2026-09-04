<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription class="sr-only">
          配置本次批量操作的类型和数量
        </DialogDescription>
      </DialogHeader>

      <div class="helper-form">
        <div v-if="type === 'box'" class="field-group">
          <Label for="helper-box-type">宝箱类型</Label>
          <select
            id="helper-box-type"
            :value="modelValue.boxType"
            @change="updateNumber('boxType', $event)"
          >
            <option
              v-for="option in boxTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div v-if="type === 'fish'" class="field-group">
          <Label for="helper-fish-type">鱼竿类型</Label>
          <select
            id="helper-fish-type"
            :value="modelValue.fishType"
            @change="updateNumber('fishType', $event)"
          >
            <option
              v-for="option in fishTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div v-if="type === 'pointsBox'" class="field-group">
          <Label for="helper-target-points">目标积分</Label>
          <Input
            id="helper-target-points"
            type="number"
            :max="1000000"
            :min="1"
            :model-value="modelValue.targetPoints"
            :step="100"
            @update:model-value="updateValue('targetPoints', Number($event))"
          ></Input>
        </div>

        <div v-if="type === 'pointsBox'" class="helper-note">
          <p>优先级：木质（保留 200 个）→ 青铜 → 黄金 → 铂金</p>
          <p>积分：木质 1、青铜 10、黄金 20、铂金 50</p>
        </div>

        <div v-if="type !== 'pointsBox'" class="field-group">
          <Label for="helper-count">消耗数量（10 的倍数）</Label>
          <Input
            id="helper-count"
            type="number"
            :max="10000"
            :min="10"
            :model-value="modelValue.count"
            :step="10"
            @update:model-value="updateValue('count', Number($event))"
          ></Input>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button @click="emit('execute')">开始执行</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SelectOption {
  label: string;
  value: number;
}

interface HelperSettings {
  boxType: number;
  count: number;
  fishType: number;
  targetPoints: number;
}

type HelperType = "box" | "fish" | "pointsBox" | "recruit";
type NumberKey = keyof HelperSettings;

const props = defineProps<{
  boxTypeOptions: SelectOption[];
  fishTypeOptions: SelectOption[];
  modelValue: HelperSettings;
  open: boolean;
  type: HelperType;
}>();

const emit = defineEmits<{
  "execute": [];
  "update:modelValue": [value: HelperSettings];
  "update:open": [value: boolean];
}>();

const title = computed(() => {
  const titles: Record<HelperType, string> = {
    box: "批量开宝箱",
    fish: "批量钓鱼",
    recruit: "批量招募",
    pointsBox: "按积分开箱",
  };
  return titles[props.type];
});

const updateValue = (key: NumberKey, value: number) => {
  if (!Number.isFinite(value))
    return;
  emit("update:modelValue", { ...props.modelValue, [key]: value });
};

const updateNumber = (key: NumberKey, event: Event) => {
  updateValue(key, Number((event.target as HTMLSelectElement).value));
};
</script>

<style scoped>
.helper-form,
.field-group {
  display: grid;
  gap: 8px;
}

.helper-form {
  gap: 16px;
}

.field-group select {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--input);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--foreground);
  font: inherit;
  font-size: 13px;
  outline: none;
}

.field-group select:focus-visible {
  border-color: var(--ring);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
}

.helper-note {
  padding: 10px 12px;
  border-left: 2px solid var(--foreground);
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.6;
}

.helper-note p {
  margin: 0;
}
</style>
