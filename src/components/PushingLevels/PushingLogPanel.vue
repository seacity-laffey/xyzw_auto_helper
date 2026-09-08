<template>
  <section class="log-card panel">
    <div class="log-header">
      <div class="log-title">
        <strong>推图日志</strong>
        <Badge variant="outline">{{ total }}/2000 条</Badge>
      </div>
      <div class="log-actions">
        <label class="checkbox-field">
          <Checkbox v-model="autoScrollModel"></Checkbox>
          <span>自动滚动</span>
        </label>
        <label class="checkbox-field">
          <Checkbox v-model="onlyErrorsModel"></Checkbox>
          <span>只看错误</span>
        </label>
        <Button size="sm" variant="outline" @click="emit('clear')">清空</Button>
      </div>
    </div>
    <div class="log-filter">
      <span class="log-filter-label">筛选账号：</span>
      <select class="native-select log-filter-select" v-model="filterModel">
        <option value="">全部账号</option>
        <option v-for="option in filterOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <Button
        size="sm"
        variant="outline"
        :disabled="!filterModel"
        @click="filterModel = null"
      >
        清除筛选
      </Button>
      <span class="log-filter-count">共 {{ logs.length }} 条</span>
    </div>
    <div ref="container" class="log-container">
      <div
        v-for="(log, index) in logs"
        :key="index"
        class="log-item"
        :class="log.type"
      >
        <span class="log-time">{{ log.time }}</span>
        <span class="log-name">[{{ log.tokenName }}]</span>
        <span class="log-msg">{{ log.msg }}</span>
      </div>
      <div v-if="!logs.length" class="empty-state log-empty">暂无日志</div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const props = defineProps({
  autoScroll: { type: Boolean, default: true },
  filterOptions: { type: Array, default: () => [] },
  filterTokenId: { type: [String, Number], default: null },
  logs: { type: Array, default: () => [] },
  onlyErrors: { type: Boolean, default: false },
  total: { type: Number, default: 0 },
});

const emit = defineEmits([
  "clear",
  "update:autoScroll",
  "update:filterTokenId",
  "update:onlyErrors",
]);
const container = ref(null);
const autoScrollModel = computed({
  get: () => props.autoScroll,
  set: (value) => emit("update:autoScroll", value),
});
const filterModel = computed({
  get: () => props.filterTokenId,
  set: (value) => emit("update:filterTokenId", value),
});
const onlyErrorsModel = computed({
  get: () => props.onlyErrors,
  set: (value) => emit("update:onlyErrors", value),
});

watch(
  () => [props.logs.length, props.onlyErrors, props.filterTokenId],
  () => {
    if (!props.autoScroll)
      return;
    nextTick(() => {
      if (container.value) {
        container.value.scrollTo({
          top: container.value.scrollHeight,
          behavior: "smooth",
        });
      }
    });
  },
);
</script>

<style scoped>
.panel {
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
}

.log-card { min-height: 320px; }
.log-header,
.log-actions,
.log-title,
.log-filter,
.checkbox-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.log-header {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.log-title,
.checkbox-field { gap: 7px; }
.checkbox-field { color: var(--foreground); font-size: 13px; cursor: pointer; }
.log-filter { gap: 8px; margin-bottom: 8px; }
.log-filter-label { flex-shrink: 0; color: var(--muted-foreground); font-size: 12px; }
.log-filter-select { width: 200px; }
.log-filter-count { color: var(--text-tertiary); font-size: 11px; }

.native-select {
  height: 36px;
  padding: 0 30px 0 10px;
  border: 1px solid var(--input);
  border-radius: var(--radius);
  outline: none;
  background: var(--background);
  color: var(--foreground);
}

.native-select:focus-visible { border-color: var(--ring); box-shadow: 0 0 0 1px var(--ring); }
.log-container { height: 300px; overflow-y: auto; padding: 2px; font-family: Consolas, "Courier New", monospace; font-size: 12px; }
.log-item { display: grid; grid-template-columns: 74px minmax(110px, 180px) minmax(0, 1fr); gap: 8px; padding: 3px 6px; border-radius: 4px; color: var(--foreground); }
.log-item.success { color: var(--success); }
.log-item.warning { color: var(--warning); }
.log-item.error { background: color-mix(in srgb, var(--error) 8%, transparent); color: var(--error); }
.log-name, .log-msg { overflow-wrap: anywhere; }
.empty-state { display: grid; min-height: 56px; place-items: center; color: var(--muted-foreground); font-size: 13px; }
.log-empty { min-height: 240px; }

@media (max-width: 640px) {
  .log-item { grid-template-columns: 64px minmax(80px, 110px) minmax(0, 1fr); }
  .log-filter-select { width: 100px; }
}
</style>
