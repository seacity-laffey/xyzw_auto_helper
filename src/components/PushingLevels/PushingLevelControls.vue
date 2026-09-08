<template>
  <header class="page-header">
    <div>
      <h2>战斗推关</h2>
      <p>主线推图</p>
    </div>
    <div class="header-actions">
      <Button
        size="sm"
        variant="outline"
        :aria-expanded="accountToolsOpen"
        @click="emit('toggleAccountTools')"
      >
        账号工具 {{ selectedCount }}/{{ totalCount }}
      </Button>
      <label class="switch-field">
        <Switch v-model="autoContinueModel"></Switch>
        <span>{{ autoContinue ? "自动继续" : "手动停止" }}</span>
      </label>
      <Input
        class="retry-input"
        max="999999"
        min="1"
        type="number"
        v-model.number="maxRetriesModel"
      ></Input>
      <span class="retry-label">最大重试</span>
    </div>
  </header>

  <slot></slot>

  <section class="control-card panel">
    <div class="control-row">
      <div class="torch-field">
        <span class="torch-label">火把类型</span>
        <select class="native-select torch-select" v-model.number="torchItemModel">
          <option v-for="option in torchOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="torch-field">
        <span class="torch-label">使用数量（1-999）</span>
        <Input
          class="torch-input"
          max="999"
          min="1"
          type="number"
          v-model.number="torchQuantityModel"
        ></Input>
      </div>
      <Button size="sm" :disabled="!selectedCount || !hasAnyRunning" @click="emit('useTorch')">
        {{ torchRunning ? "使用中" : "使用火把" }}
      </Button>
      <Button size="sm" :disabled="!selectedCount || allSelectedRunning" @click="emit('start')">
        开始推图
      </Button>
      <Button size="sm" variant="destructive" :disabled="!hasSelectedRunning" @click="emit('stop')">
        全部停止
      </Button>
      <div class="control-spacer"></div>
      <span class="status-text">
        已选择 {{ selectedCount }} 个账号，正在推图 {{ runningCount }} 个账号
      </span>
      <Button size="sm" variant="outline" @click="emit('clearSelection')">清除选择</Button>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const props = defineProps({
  accountToolsOpen: { type: Boolean, default: false },
  allSelectedRunning: { type: Boolean, default: false },
  autoContinue: { type: Boolean, default: true },
  hasAnyRunning: { type: Boolean, default: false },
  hasSelectedRunning: { type: Boolean, default: false },
  maxRetries: { type: Number, default: 999999 },
  runningCount: { type: Number, default: 0 },
  selectedCount: { type: Number, default: 0 },
  torchItemId: { type: Number, default: 1008 },
  torchOptions: { type: Array, default: () => [] },
  torchQuantity: { type: Number, default: 150 },
  torchRunning: { type: Boolean, default: false },
  totalCount: { type: Number, default: 0 },
});

const emit = defineEmits([
  "clearSelection",
  "start",
  "stop",
  "toggleAccountTools",
  "update:autoContinue",
  "update:maxRetries",
  "update:torchItemId",
  "update:torchQuantity",
  "useTorch",
]);
const autoContinueModel = computed({
  get: () => props.autoContinue,
  set: (value) => emit("update:autoContinue", value),
});
const maxRetriesModel = computed({
  get: () => props.maxRetries,
  set: (value) => emit("update:maxRetries", value),
});
const torchItemModel = computed({
  get: () => props.torchItemId,
  set: (value) => emit("update:torchItemId", value),
});
const torchQuantityModel = computed({
  get: () => props.torchQuantity,
  set: (value) => emit("update:torchQuantity", value),
});
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header h2 { margin: 0; color: var(--foreground); font-size: 22px; font-weight: 700; }
.page-header p { margin: 2px 0 0; color: var(--muted-foreground); font-size: 13px; }
.header-actions, .control-row, .switch-field { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.switch-field { gap: 7px; color: var(--foreground); font-size: 13px; cursor: pointer; }
.retry-input { width: 110px; }
.retry-label { color: var(--muted-foreground); font-size: 13px; }
.panel { padding: 12px 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--background); }
.control-row { align-items: flex-end; }
.torch-field { display: flex; flex-direction: column; gap: 2px; color: var(--foreground); font-size: 11px; }
.torch-label { color: var(--muted-foreground); }
.torch-select, .torch-input { width: 120px; }
.native-select { height: 36px; padding: 0 30px 0 10px; border: 1px solid var(--input); border-radius: var(--radius); outline: none; background: var(--background); color: var(--foreground); }
.native-select:focus-visible { border-color: var(--ring); box-shadow: 0 0 0 1px var(--ring); }
.control-spacer { flex: 1; }
.status-text { color: var(--muted-foreground); font-size: 13px; white-space: nowrap; }

@media (max-width: 640px) {
  .page-header { align-items: flex-start; flex-direction: column; }
  .control-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: end; }
  .torch-select, .torch-input, .control-row button { width: 100%; }
  .control-spacer { display: none; }
  .status-text { grid-column: 1 / -1; white-space: normal; }
}
</style>
