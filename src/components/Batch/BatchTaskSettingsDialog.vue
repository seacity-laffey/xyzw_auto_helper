<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-md overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription class="sr-only">编辑账号批量任务的执行设置</DialogDescription>
      </DialogHeader>

      <div class="settings-form">
        <div v-if="showName" class="field-row">
          <Label for="batch-settings-name">模板名称</Label>
          <Input
            id="batch-settings-name"
            placeholder="请输入模板名称"
            :model-value="name"
            @update:model-value="emit('update:name', String($event))"
          ></Input>
        </div>

        <div
          v-for="field in selectFields"
          :key="field.key"
          class="field-row"
        >
          <Label :for="`batch-settings-${field.key}`">{{ field.label }}</Label>
          <select
            :id="`batch-settings-${field.key}`"
            :value="modelValue[field.key]"
            @change="updateNumber(field.key, $event)"
          >
            <option
              v-for="option in field.options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="switch-list">
          <div v-for="field in switchFields" :key="field.key" class="switch-row">
            <Label :for="`batch-settings-${field.key}`">{{ field.label }}</Label>
            <Switch
              :id="`batch-settings-${field.key}`"
              :model-value="modelValue[field.key]"
              @update:model-value="updateBoolean(field.key, $event)"
            ></Switch>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button @click="emit('save')">{{ saveLabel }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
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
import { Switch } from "@/components/ui/switch";

interface SelectOption {
  label: string;
  value: number;
}

interface TaskSettings {
  arenaEnable: boolean;
  arenaFormation: number;
  blackMarketPurchase: boolean;
  bossFormation: number;
  bossTimes: number;
  claimBottle: boolean;
  claimEmail: boolean;
  claimHangUp: boolean;
  openBox: boolean;
  payRecruit: boolean;
  towerFormation: number;
}

type NumberField = "arenaFormation" | "towerFormation" | "bossFormation" | "bossTimes";
type BooleanField = Exclude<keyof TaskSettings, NumberField>;

const props = withDefaults(defineProps<{
  bossTimesOptions: SelectOption[];
  formationOptions: SelectOption[];
  modelValue: TaskSettings;
  name?: string;
  open: boolean;
  saveLabel?: string;
  showName?: boolean;
  title: string;
}>(), {
  name: "",
  saveLabel: "保存设置",
  showName: false,
});

const emit = defineEmits<{
  "save": [];
  "update:modelValue": [value: TaskSettings];
  "update:name": [value: string];
  "update:open": [value: boolean];
}>();

const selectFields: Array<{
  key: NumberField;
  label: string;
  options: SelectOption[];
}> = [
  { key: "arenaFormation", label: "竞技场阵容", options: props.formationOptions },
  { key: "towerFormation", label: "爬塔阵容", options: props.formationOptions },
  { key: "bossFormation", label: "BOSS阵容", options: props.formationOptions },
  { key: "bossTimes", label: "BOSS次数", options: props.bossTimesOptions },
];

const switchFields: Array<{ key: BooleanField; label: string }> = [
  { key: "claimBottle", label: "领罐子" },
  { key: "claimHangUp", label: "领挂机" },
  { key: "arenaEnable", label: "竞技场" },
  { key: "openBox", label: "开宝箱" },
  { key: "claimEmail", label: "领取邮件奖励" },
  { key: "blackMarketPurchase", label: "黑市购买物品" },
  { key: "payRecruit", label: "付费招募" },
];

const updateNumber = (field: NumberField, event: Event) => {
  const value = Number((event.target as HTMLSelectElement).value);
  emit("update:modelValue", { ...props.modelValue, [field]: value });
};

const updateBoolean = (field: BooleanField, value: boolean) => {
  emit("update:modelValue", { ...props.modelValue, [field]: value });
};
</script>

<style scoped>
.settings-form {
  display: grid;
  gap: 16px;
}

.field-row {
  display: grid;
  gap: 7px;
}

.field-row select {
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

.field-row select:focus-visible {
  border-color: var(--ring);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
}

.switch-list {
  display: grid;
  border-top: 1px solid var(--border);
}

.switch-row {
  display: flex;
  min-height: 43px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border);
}
</style>
