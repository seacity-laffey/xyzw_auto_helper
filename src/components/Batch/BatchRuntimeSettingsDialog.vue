<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>任务设置</DialogTitle>
        <DialogDescription class="sr-only">
          配置批量任务数量、执行延迟和连接参数
        </DialogDescription>
      </DialogHeader>

      <div class="settings-columns">
        <div class="settings-column">
          <section class="settings-section">
            <h3>批量操作</h3>
            <div class="field-list">
              <div
                v-for="settingField in operationFields"
                :key="settingField.key"
                class="field-row"
              >
                <Label :for="`runtime-${settingField.key}`">
                  {{ settingField.label }}
                </Label>
                <Input
                  :id="`runtime-${settingField.key}`"
                  class="field-control"
                  type="number"
                  :max="settingField.max"
                  :min="settingField.min"
                  :model-value="numberValue(settingField.key)"
                  :step="settingField.step"
                  @update:model-value="updateNumber(settingField.key, Number($event))"
                ></Input>
              </div>

              <div
                v-for="selectField in selectFields"
                :key="selectField.key"
                class="field-row"
              >
                <Label :for="`runtime-${selectField.key}`">
                  {{ selectField.label }}
                </Label>
                <select
                  :id="`runtime-${selectField.key}`"
                  :value="modelValue[selectField.key]"
                  @change="updateSelect(selectField.key, $event)"
                >
                  <option
                    v-for="option in selectField.options"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>

              <div class="field-row">
                <span class="field-label">梦境商品</span>
                <Button size="sm" variant="outline" @click="emit('configureDream')">
                  配置<span v-if="modelValue.dreamPurchaseList.length">
                    （{{ modelValue.dreamPurchaseList.length }} 项）</span>
                </Button>
              </div>
            </div>
          </section>

          <section class="settings-section">
            <h3>功法赠送</h3>
            <div class="field-list">
              <div class="field-row">
                <Label for="runtime-receiver-id">接收者 ID</Label>
                <Input
                  id="runtime-receiver-id"
                  class="field-control"
                  inputmode="numeric"
                  placeholder="ID"
                  :model-value="modelValue.receiverId"
                  @update:model-value="updateReceiverId"
                ></Input>
              </div>
              <div class="field-row">
                <Label for="runtime-password">密码</Label>
                <Input
                  id="runtime-password"
                  class="field-control"
                  placeholder="密码"
                  type="password"
                  :model-value="modelValue.password"
                  @update:model-value="updateText('password', $event)"
                ></Input>
              </div>
            </div>
          </section>
        </div>

        <div class="settings-column">
          <section class="settings-section">
            <h3>延迟（毫秒）</h3>
            <div class="field-list">
              <div
                v-for="settingField in delayFields"
                :key="settingField.key"
                class="field-row"
              >
                <Label :for="`runtime-${settingField.key}`">
                  {{ settingField.label }}
                </Label>
                <Input
                  :id="`runtime-${settingField.key}`"
                  class="field-control"
                  type="number"
                  :max="settingField.max"
                  :min="settingField.min"
                  :model-value="numberValue(settingField.key)"
                  :step="settingField.step"
                  @update:model-value="updateNumber(settingField.key, Number($event))"
                ></Input>
              </div>
            </div>
          </section>

          <section class="settings-section">
            <h3>连接</h3>
            <div class="field-list">
              <div
                v-for="settingField in connectionFields"
                :key="settingField.key"
                class="field-row"
              >
                <Label :for="`runtime-${settingField.key}`">
                  {{ settingField.label }}
                </Label>
                <Input
                  :id="`runtime-${settingField.key}`"
                  class="field-control"
                  type="number"
                  :max="settingField.max"
                  :min="settingField.min"
                  :model-value="numberValue(settingField.key)"
                  :step="settingField.step"
                  @update:model-value="updateNumber(settingField.key, Number($event))"
                ></Input>
              </div>
            </div>
          </section>

          <section class="settings-section">
            <h3>系统</h3>
            <div class="field-list">
              <div
                v-for="settingField in systemFields"
                :key="settingField.key"
                class="field-row"
              >
                <Label :for="`runtime-${settingField.key}`">
                  {{ settingField.label }}
                </Label>
                <Input
                  :id="`runtime-${settingField.key}`"
                  class="field-control"
                  type="number"
                  :max="settingField.max"
                  :min="settingField.min"
                  :model-value="numberValue(settingField.key)"
                  :step="settingField.step"
                  @update:model-value="updateNumber(settingField.key, Number($event))"
                ></Input>
              </div>
              <div class="field-row">
                <Label for="runtime-refresh">定时刷新页面</Label>
                <Switch
                  id="runtime-refresh"
                  :model-value="modelValue.enableRefresh"
                  @update:model-value="updateBoolean('enableRefresh', $event)"
                ></Switch>
              </div>
              <div v-if="modelValue.enableRefresh" class="field-row">
                <Label for="runtime-refreshInterval">
                  {{ refreshIntervalField.label }}
                </Label>
                <Input
                  id="runtime-refreshInterval"
                  class="field-control"
                  type="number"
                  :max="refreshIntervalField.max"
                  :min="refreshIntervalField.min"
                  :model-value="numberValue('refreshInterval')"
                  :step="refreshIntervalField.step"
                  @update:model-value="updateNumber('refreshInterval', Number($event))"
                ></Input>
              </div>
            </div>
          </section>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button @click="emit('save')">保存设置</Button>
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

interface RuntimeSettings {
  actionDelay: number;
  battleDelay: number;
  boxCount: number;
  commandDelay: number;
  connectionTimeout: number;
  defaultBoxType: number;
  defaultFishType: number;
  dreamPurchaseList: string[];
  enableRefresh: boolean;
  fishCount: number;
  longDelay: number;
  maxActive: number;
  maxLogEntries: number;
  password: string;
  receiverId: number | string;
  reconnectDelay: number;
  recruitCount: number;
  refreshDelay: number;
  refreshInterval: number;
  targetBoxPoints: number;
  taskDelay: number;
  tokenListColumns: number;
}

type NumberKey = {
  [Key in keyof RuntimeSettings]: RuntimeSettings[Key] extends number ? Key : never;
}[keyof RuntimeSettings];
type SelectKey = "defaultBoxType" | "defaultFishType";
type TextKey = "password";

interface NumberFieldDefinition {
  key: NumberKey;
  label: string;
  max: number;
  min: number;
  step: number;
}

const props = defineProps<{
  boxTypeOptions: SelectOption[];
  fishTypeOptions: SelectOption[];
  modelValue: RuntimeSettings;
  open: boolean;
}>();

const emit = defineEmits<{
  "configureDream": [];
  "save": [];
  "update:modelValue": [value: RuntimeSettings];
  "update:open": [value: boolean];
}>();

const operationFields: NumberFieldDefinition[] = [
  { key: "boxCount", label: "开箱数量（10 倍）", min: 10, max: 10000, step: 10 },
  { key: "fishCount", label: "钓鱼数量（10 倍）", min: 10, max: 10000, step: 10 },
  { key: "recruitCount", label: "招募数量（10 倍）", min: 10, max: 10000, step: 10 },
  { key: "targetBoxPoints", label: "按积分开箱目标", min: 1, max: 1000000, step: 100 },
];
const delayFields: NumberFieldDefinition[] = [
  { key: "commandDelay", label: "命令延迟", min: 100, max: 2000, step: 100 },
  { key: "taskDelay", label: "任务间延迟", min: 100, max: 2000, step: 100 },
  { key: "actionDelay", label: "操作延迟", min: 100, max: 2000, step: 100 },
  { key: "battleDelay", label: "战斗延迟", min: 100, max: 2000, step: 100 },
  { key: "refreshDelay", label: "刷新延迟", min: 500, max: 3000, step: 100 },
  { key: "longDelay", label: "长延迟", min: 1000, max: 10000, step: 500 },
];
const connectionFields: NumberFieldDefinition[] = [
  { key: "maxActive", label: "最大并发数", min: 1, max: 20, step: 1 },
  { key: "connectionTimeout", label: "连接超时", min: 1000, max: 30000, step: 1000 },
  { key: "reconnectDelay", label: "重连等待", min: 100, max: 5000, step: 100 },
];
const systemFields: NumberFieldDefinition[] = [
  { key: "tokenListColumns", label: "列表每行数量", min: 1, max: 10, step: 1 },
  { key: "maxLogEntries", label: "最大日志条目", min: 100, max: 5000, step: 100 },
];
const refreshIntervalField: NumberFieldDefinition = {
  key: "refreshInterval",
  label: "刷新间隔（分钟）",
  min: 10,
  max: 1440,
  step: 30,
};

const selectFields: Array<{
  key: SelectKey;
  label: string;
  options: SelectOption[];
}> = [
  { key: "defaultBoxType", label: "默认宝箱类型", options: props.boxTypeOptions },
  { key: "defaultFishType", label: "默认鱼竿类型", options: props.fishTypeOptions },
];

const updateModel = (patch: Partial<RuntimeSettings>) => {
  emit("update:modelValue", { ...props.modelValue, ...patch });
};

const numberValue = (key: NumberKey) => Number(props.modelValue[key]);
const updateNumber = (key: NumberKey, value: number) => {
  if (Number.isFinite(value))
    updateModel({ [key]: value });
};
const updateSelect = (key: SelectKey, event: Event) => {
  updateNumber(key, Number((event.target as HTMLSelectElement).value));
};
const updateText = (key: TextKey, value: string | number) => {
  updateModel({ [key]: String(value) });
};
const updateReceiverId = (value: string | number) => {
  const normalized = String(value).replace(/\D/g, "");
  updateModel({ receiverId: normalized });
};
const updateBoolean = (key: "enableRefresh", value: boolean) => {
  updateModel({ [key]: value });
};
</script>

<style scoped>
.settings-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.settings-column,
.field-list {
  display: grid;
  gap: 12px;
}

.settings-section + .settings-section {
  margin-top: 20px;
}

.settings-section h3 {
  margin: 0 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  color: var(--foreground);
  font-size: 13px;
  font-weight: 650;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 142px;
  min-height: 36px;
  align-items: center;
  gap: 12px;
}

.field-row label,
.field-label {
  color: var(--muted-foreground);
  font-size: 13px;
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

@media (max-width: 700px) {
  .settings-columns {
    grid-template-columns: 1fr;
  }

  .field-row {
    grid-template-columns: minmax(0, 1fr) minmax(120px, 45%);
  }
}
</style>
