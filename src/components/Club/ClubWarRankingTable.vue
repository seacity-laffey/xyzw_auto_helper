<template>
  <div v-if="loading" class="loading-state" role="status">
    <LoaderCircle></LoaderCircle>
    <span>正在加载盐场匹配数据</span>
  </div>
  <div v-else-if="hasData" class="table-container">
    <NDataTable
      class="salt-table"
      size="small"
      :bordered="true"
      :columns="columns"
      :data="rows"
      :row-class-name="rowClassName"
      :scroll-x="1380"
    ></NDataTable>
  </div>
  <div v-else class="empty-state">
    <Inbox></Inbox>
    <span>暂无盐场匹配数据</span>
  </div>
</template>

<script setup>
import { Inbox, LoaderCircle } from "@lucide/vue";
import { NDataTable } from "naive-ui";

defineProps({
  columns: { type: Array, required: true },
  hasData: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  rowClassName: { type: Function, required: true },
  rows: { type: Array, default: () => [] },
});
</script>

<style scoped>
.table-container {
  width: 100%;
  min-height: 240px;
  flex: 1;
  overflow: auto;
  background: var(--background);
}

.loading-state,
.empty-state {
  display: grid;
  min-height: 240px;
  flex: 1;
  place-items: center;
  align-content: center;
  gap: 9px;
  background: var(--background);
  color: var(--muted-foreground);
  font-size: 12px;
}

.loading-state svg,
.empty-state svg {
  width: 24px;
  height: 24px;
}

.loading-state svg {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
