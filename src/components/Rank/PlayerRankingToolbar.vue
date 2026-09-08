<template>
  <div class="header-section">
    <div class="header-left">
      <img class="header-icon" :alt="`${title}图标`" :src="iconSrc">
      <div class="header-title">
        <h2>{{ title }}</h2>
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
      导出图片
    </NButton>
  </div>
</template>

<script setup>
import { NButton, NIcon, NTag } from "naive-ui";
import { Copy, Refresh } from "@vicons/ionicons5";

defineProps({
  hasData: { type: Boolean, default: false },
  iconSrc: { type: String, required: true },
  loading: { type: Boolean, default: false },
  queryDate: { type: String, default: "" },
  title: { type: String, required: true },
});

const emit = defineEmits(["export", "refresh"]);
</script>

<style scoped lang="scss">
.header-section,
.function-section,
.header-left,
.stats-section,
.stat-item {
  display: flex;
  align-items: center;
}

.header-section,
.function-section {
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-light);
}

.header-section {
  justify-content: space-between;
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

.stat-item {
  gap: var(--spacing-sm);
}

.stat-label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.function-section {
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-secondary);
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

@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
  }

  .function-section {
    justify-content: flex-start;
    padding: var(--spacing-xs) var(--spacing-md);
  }
}
</style>
