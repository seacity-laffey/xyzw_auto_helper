<template>
  <Dialog :open="open && !showBlackMarketDialog && !showDreamDialog" @update:open="emit('update:open', $event)">
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

        <template v-if="accountMode">
          <div class="field-row">
            <Label for="account-task-template">执行模板</Label>
            <select id="account-task-template" :value="modelValue.templateId" @change="selectTemplate">
              <option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name }}</option>
            </select>
          </div>
          <details v-if="selectedTemplate" class="field-row">
            <summary>执行清单 · {{ taskSummary.length }} 项</summary>
            <ul class="m-0 grid gap-1 pl-5 text-sm"><li v-for="task in taskSummary" :key="task">{{ task }}</li></ul>
          </details>
          <div class="switch-row">
            <div>
              <Label>黑市采购</Label>
              <p class="m-0 text-xs text-muted-foreground">{{ selectedTemplate?.settings.blackMarketPurchase ? '游戏内配置' : '模板未启用' }} · {{ blackMarketConfig?.purchaseItemList.length || 0 }} 项 · 每日 {{ blackMarketConfig?.purchaseCnt || 0 }} 次</p>
            </div>
            <Button size="sm" variant="outline" :disabled="saving" @click="openBlackMarketConfig"><SlidersHorizontal :size="14"></SlidersHorizontal>配置商品</Button>
          </div>
        </template>
        <template v-else>
          <p v-if="impactCount" class="m-0 text-sm text-muted-foreground">此模板已绑定 {{ impactCount }} 个账号；保存后用于下次执行。</p>
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
        </template>

        <div class="field-row">
          <Label for="account-dream-mode">梦境商店配置</Label>
          <select id="account-dream-mode" v-if="accountMode" :disabled="saving" :value="Array.isArray(modelValue.dreamPurchaseList) ? 'account' : 'common'" @change="updateDreamMode">
            <option value="common">使用模板采购清单</option>
            <option value="account">使用账号专属清单</option>
          </select>
          <p v-if="accountMode" class="m-0 text-xs text-muted-foreground">{{ selectedTemplate?.settings.dreamPurchaseEnable ? '已启用梦境购买' : '模板未启用梦境购买' }} · {{ effectiveDreamList.length }} 项</p>
          <p v-if="accountMode && effectiveDreamList.length" class="m-0 text-xs text-muted-foreground">{{ dreamItemNames }}</p>
          <Button v-if="!accountMode || Array.isArray(modelValue.dreamPurchaseList)" size="sm" variant="outline" :disabled="saving" @click="showDreamDialog = true">
            <SlidersHorizontal :size="14"></SlidersHorizontal>
            配置梦境商品（{{ modelValue.dreamPurchaseList?.length || 0 }} 项）
          </Button>
        </div>

        <div v-if="!accountMode" class="switch-list">
          <div v-for="field in switchFields" :key="field.key" class="switch-row">
            <Label :for="`batch-settings-${field.key}`">{{ field.label }}</Label>
            <div class="switch-actions">
              <Button
                v-if="field.key === 'blackMarketPurchase' && showBlackMarketConfig"
                size="sm"
                variant="outline"
                :disabled="saving"
                @click="openBlackMarketConfig"
              >
                <SlidersHorizontal :size="14"></SlidersHorizontal>
                {{ blackMarketLoading ? "读取中" : "配置商品" }}
              </Button>
              <Switch
                :id="`batch-settings-${field.key}`"
                :model-value="modelValue[field.key]"
                @update:model-value="updateBoolean(field.key, $event)"
              ></Switch>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)">取消</Button>
        <Button :disabled="saving || blackMarketLoading" @click="emit('save')">
          {{ saving ? "保存中..." : saveLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog :open="showBlackMarketDialog" @update:open="showBlackMarketDialog = $event">
    <DialogContent class="flex max-h-[88vh] max-w-2xl flex-col overflow-hidden">
      <DialogHeader>
        <DialogTitle>黑市采购配置</DialogTitle>
        <DialogDescription class="sr-only">黑市采购商品与折扣设置</DialogDescription>
      </DialogHeader>

      <BatchBlackMarketConfig
        class="min-h-0 overflow-y-auto"
        :disabled="saving"
        :error="blackMarketError"
        :loading="blackMarketLoading"
        :model-value="blackMarketDraft"
        @retry="emit('retryBlackMarket')"
        @update:model-value="blackMarketDraft = $event"
      ></BatchBlackMarketConfig>

      <DialogFooter>
        <Button variant="outline" :disabled="saving" @click="showBlackMarketDialog = false">
          取消
        </Button>
        <Button
          :disabled="saving || blackMarketLoading || !blackMarketDraft"
          @click="confirmBlackMarketConfig"
        >
          确认配置
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  <BatchDreamPurchaseDialog
    v-model:open="showDreamDialog"
    :model-value="modelValue.dreamPurchaseList || []"
    @save="saveDreamSelection"
  ></BatchDreamPurchaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { getTemplateTaskSummary, TEMPLATE_TASK_FIELDS } from "@/utils/taskTemplateConfig";
import type { TaskTemplate } from "@/utils/taskTemplateConfig";
import { merchantConfig } from "@/utils/dreamConstants";
import { SlidersHorizontal } from "@lucide/vue";
import BatchBlackMarketConfig from "@/components/Batch/BatchBlackMarketConfig.vue";
import BatchDreamPurchaseDialog from "@/components/Batch/BatchDreamPurchaseDialog.vue";
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
import type { BlackMarketPurchaseConfig } from "@/utils/blackMarketPurchase";
import { normalizeBlackMarketPurchaseConfig } from "@/utils/blackMarketPurchase";

interface SelectOption {
  label: string;
  value: number;
}

interface TaskSettings {
  [key: string]: any;
  templateId?: string;
  arenaEnable: boolean;
  arenaFormation: number;
  blackMarketPurchase: boolean;
  bossFormation: number;
  bossTimes: number;
  claimBottle: boolean;
  claimEmail: boolean;
  claimHangUp: boolean;
  freeGachaEnable: boolean;
  openBox: boolean;
  payRecruit: boolean;
  towerFormation: number;
  dreamPurchaseList?: string[] | null;
}

type NumberField = "arenaFormation" | "towerFormation" | "bossFormation" | "bossTimes";
type BooleanField = Exclude<keyof TaskSettings, NumberField | "dreamPurchaseList">;

const props = withDefaults(defineProps<{
  accountMode?: boolean;
  templates?: TaskTemplate[];
  impactCount?: number;
  blackMarketConfig?: BlackMarketPurchaseConfig | null;
  blackMarketError?: string;
  blackMarketLoading?: boolean;
  bossTimesOptions: SelectOption[];
  formationOptions: SelectOption[];
  modelValue: TaskSettings;
  name?: string;
  open: boolean;
  saveLabel?: string;
  saving?: boolean;
  showBlackMarketConfig?: boolean;
  showName?: boolean;
  title: string;
}>(), {
  accountMode: false,
  templates: () => [],
  impactCount: 0,
  name: "",
  blackMarketConfig: null,
  blackMarketError: "",
  blackMarketLoading: false,
  saveLabel: "保存设置",
  saving: false,
  showBlackMarketConfig: false,
  showName: false,
});

const emit = defineEmits<{
  "retryBlackMarket": [];
  "save": [];
  "update:blackMarketConfig": [value: BlackMarketPurchaseConfig];
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

const switchFields = TEMPLATE_TASK_FIELDS;
const selectedTemplate = computed(() => props.templates.find((template) => template.id === props.modelValue.templateId));
const taskSummary = computed(() => getTemplateTaskSummary(selectedTemplate.value?.settings || {}));
const effectiveDreamList = computed(() => props.modelValue.dreamPurchaseList ?? selectedTemplate.value?.settings.dreamPurchaseList ?? []);
const dreamItemNames = computed(() => effectiveDreamList.value.map((key: string) => {
  const [merchantId, index] = key.split("-").map(Number);
  return merchantConfig[merchantId]?.items[index] || key;
}).join("、"));
const selectTemplate = (event: Event) => emit("update:modelValue", { ...props.modelValue, templateId: (event.target as HTMLSelectElement).value });

const updateNumber = (field: NumberField, event: Event) => {
  const value = Number((event.target as HTMLSelectElement).value);
  emit("update:modelValue", { ...props.modelValue, [field]: value });
};

const updateBoolean = (field: BooleanField, value: boolean) => {
  emit("update:modelValue", { ...props.modelValue, [field]: value });
};

const showBlackMarketDialog = ref(false);
const showDreamDialog = ref(false);
const saveDreamSelection = (selection: string[]) => {
  emit("update:modelValue", { ...props.modelValue, dreamPurchaseList: [...selection] });
};
const updateDreamMode = (event: Event) => {
  emit("update:modelValue", {
    ...props.modelValue,
    dreamPurchaseList: (event.target as HTMLSelectElement).value === "account" ? [] : null,
  });
};
const blackMarketDraft = ref<BlackMarketPurchaseConfig | null>(null);

const openBlackMarketConfig = () => {
  blackMarketDraft.value = props.blackMarketConfig
    ? normalizeBlackMarketPurchaseConfig(props.blackMarketConfig)
    : null;
  showBlackMarketDialog.value = true;
};

const confirmBlackMarketConfig = () => {
  if (!blackMarketDraft.value)
    return;
  const config = normalizeBlackMarketPurchaseConfig(blackMarketDraft.value);
  if (config.purchaseCnt < 1)
    config.purchaseCnt = 1;
  emit("update:blackMarketConfig", config);
  showBlackMarketDialog.value = false;
};

watch(
  () => props.blackMarketConfig,
  (config) => {
    if (showBlackMarketDialog.value && config)
      blackMarketDraft.value = normalizeBlackMarketPurchaseConfig(config);
  },
);

watch(
  () => props.open,
  (open) => {
    if (!open) {
      showBlackMarketDialog.value = false;
      showDreamDialog.value = false;
    }
  },
);
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

.switch-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
