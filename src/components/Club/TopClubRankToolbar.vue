<template>
  <div class="header-section">
    <div class="header-left">
      <img alt="俱乐部图标" class="header-icon" src="/icons/moonPalace.png">
      <div class="header-title">
        <h2>五百服Top俱乐部</h2>
      </div>
    </div>

    <div v-if="hasData" class="stats-section">
      <div class="stat-item">
        <span class="stat-label">查询日期:</span>
        <NTag type="info">{{ queryDate }}</NTag>
      </div>
    </div>
  </div>

  <div class="function-section">
    <NCheckboxGroup
      name="group-exportmethod"
      size="small"
      :value="exportMethods"
      @update:value="emit('update:exportMethods', $event)"
    >
      <NCheckbox value="1">表格导出</NCheckbox>
      <NCheckbox value="2">图片导出</NCheckbox>
    </NCheckboxGroup>

    <div class="function-right">
      <NButton
        class="action-btn refresh-btn"
        size="small"
        :disabled="loading"
        @click="emit('refresh')"
      >
        <template #icon>
          <NIcon><Refresh></Refresh></NIcon>
        </template>
        查询
      </NButton>
      <NButton
        class="action-btn export-btn"
        size="small"
        type="primary"
        :disabled="!hasData || loading"
        @click="emit('export')"
      >
        <template #icon>
          <NIcon><Copy></Copy></NIcon>
        </template>
        导出
      </NButton>
    </div>
  </div>
</template>

<script setup>
import { NButton, NCheckbox, NCheckboxGroup, NIcon, NTag } from "naive-ui";
import { Copy, Refresh } from "@vicons/ionicons5";

defineProps({
  exportMethods: { type: Array, default: () => [] },
  hasData: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  queryDate: { type: String, default: "" },
});

const emit = defineEmits(["export", "refresh", "update:exportMethods"]);
</script>

<style scoped lang="scss">
.header-section,
.function-section,
.header-left,
.stats-section,
.stat-item,
.function-right {
  display: flex;
  align-items: center;
}

.header-section,
.function-section {
  flex-shrink: 0;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-light);
}

.header-section {
  padding: var(--spacing-lg);
  background: var(--bg-primary);
}

.header-left {
  gap: var(--spacing-md);
}

.header-icon {
  width: 40px;
  height: 40px;
  box-sizing: border-box;
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-md);
  background: var(--bg-secondary);
  object-fit: contain;
}

.header-title h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.stats-section {
  gap: var(--spacing-lg);
}

.stat-item,
.function-right {
  gap: var(--spacing-sm);
}

.stat-label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.function-section {
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-secondary);
}

:deep(.n-checkbox-group) {
  display: flex;
  gap: var(--spacing-md);
}

.action-btn {
  padding: 6px 12px;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-medium);
}

.refresh-btn {
  border: 1px solid var(--border-medium);
  background: var(--bg-primary);
}

.export-btn {
  background: var(--primary-color);
  color: white;
}

@media (max-width: 1200px) {
  .header-section,
  .function-section {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .stats-section,
  .function-right {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .header-section {
    padding: var(--spacing-md);
  }

  .function-section {
    padding: var(--spacing-xs) var(--spacing-md);
  }
}
</style>
