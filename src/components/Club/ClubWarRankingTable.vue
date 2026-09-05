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

<style scoped lang="scss">
.table-container {
  width: 100%;
  min-height: 240px;
  flex: 1;
  overflow: auto;
  background: var(--background);
}

.table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: var(--muted);
}

.table-container::-webkit-scrollbar-thumb {
  border: 2px solid var(--muted);
  border-radius: 6px;
  background: var(--muted-foreground);
}

.table-container :deep(.n-data-table-th),
.table-container :deep(.n-data-table-td),
.table-container :deep(.n-data-table-cell) {
  padding-inline: 4px !important;
}

.table-container :deep(.n-data-table-th) {
  border-color: var(--border) !important;
  background: var(--muted) !important;
  color: var(--foreground) !important;
  text-align: center !important;
  white-space: nowrap !important;
}

.table-container :deep(.n-data-table-th .n-data-table-th__title) {
  justify-content: center !important;
  font-weight: 650 !important;
}

.table-container :deep(.n-data-table-th:not(:last-child)),
.table-container :deep(.n-data-table-td:not(:last-child)) {
  border-right: 1px dashed var(--border) !important;
}

.table-container :deep(.n-data-table-table) {
  width: 100% !important;
  min-width: 1380px !important;
  table-layout: fixed !important;
}

.table-container :deep(.n-data-table-th:last-child),
.table-container :deep(.n-data-table-td:last-child),
.table-container :deep(.n-data-table-td:last-child .n-data-table-cell) {
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

.table-container :deep(.rank-badge) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--background);
  color: var(--foreground);
  font-size: 12px;
  font-weight: 650;
  line-height: 1;
}

.table-container :deep(.salt-alliance-tag) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 24px;
  padding-inline: 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 650;
  line-height: 1;
  white-space: nowrap;
}

.table-container :deep(.salt-club-name-cell) {
  width: 100%;
  min-width: 146px;
  min-height: 42px;
  padding: 3px 6px;
  border: 1px solid transparent;
  border-radius: 6px;
}

.table-container :deep(.salt-club-name-cell.is-current-club) {
  border-color: #eb2f96;
  background: #fff0f6;
  box-shadow: inset 0 0 0 1px rgba(235, 47, 150, 0.12);
}

.table-container :deep(.salt-club-main-row) {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.table-container :deep(.salt-club-name-text) {
  min-width: 0;
  overflow: hidden;
  color: var(--foreground);
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-container :deep(.current-club-badge-row) {
  display: flex;
  justify-content: flex-end;
  margin-top: -8px;
  padding-right: 2px;
}

.table-container :deep(.current-club-badge) {
  padding: 2px 5px;
  border-radius: 4px;
  background: #eb2f96;
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.table-container :deep(.alliance-tag-dalianmeng) {
  border-color: rgba(82, 196, 26, 0.2);
  background: rgba(82, 196, 26, 0.14);
  color: #237804;
}

.table-container :deep(.alliance-tag-mengmeng) {
  border-color: rgba(250, 173, 20, 0.22);
  background: rgba(250, 173, 20, 0.16);
  color: #8a5400;
}

.table-container :deep(.alliance-tag-zhengyi) {
  border-color: rgba(245, 34, 45, 0.2);
  background: rgba(245, 34, 45, 0.13);
  color: #b71924;
}

.table-container :deep(.alliance-tag-longmeng) {
  border-color: rgba(114, 46, 209, 0.2);
  background: rgba(114, 46, 209, 0.13);
  color: #531dab;
}

.table-container :deep(.alliance-tag-ximeng) {
  border-color: rgba(19, 194, 194, 0.2);
  background: rgba(19, 194, 194, 0.14);
  color: #087d82;
}

.table-container :deep(.alliance-tag-unknown),
.table-container :deep(.alliance-tag-other) {
  border-color: var(--border);
  background: var(--background);
  color: var(--muted-foreground);
}

.table-container :deep(img) {
  max-width: none;
}

.table-container :deep(.salt-alliance-row) {
  border-bottom: 1px solid var(--border);
}

.table-container :deep(.salt-alliance-group-row),
.table-container :deep(.salt-fetch-time-footer-row),
.table-container :deep(.salt-alliance-group-row > td),
.table-container :deep(.salt-fetch-time-footer-row > td),
.table-container :deep(.salt-alliance-group-row .n-data-table-td),
.table-container :deep(.salt-fetch-time-footer-row .n-data-table-td),
.table-container :deep(.salt-fetch-time-footer-row .n-data-table-cell),
.table-container :deep(.salt-alliance-group-row .n-data-table-cell) {
  background: var(--background) !important;
}

.table-container :deep(.salt-alliance-group-row > td),
.table-container :deep(.salt-fetch-time-footer-row > td) {
  height: 38px !important;
  border-inline: 0 !important;
}

.table-container :deep(.salt-alliance-group-row .n-data-table-td:not(:last-child)),
.table-container :deep(.salt-fetch-time-footer-row .n-data-table-td:not(:last-child)),
.table-container :deep(.salt-fetch-time-footer-row > td:not(:last-child)),
.table-container :deep(.salt-alliance-group-row > td:not(:last-child)) {
  border-right: 0 !important;
}

.table-container :deep(.salt-fetch-time-footer) {
  width: 100%;
  padding-right: 8px;
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
}

.table-container :deep(.salt-alliance-group-title) {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-inline: 8px;
  font-size: 15px;
  font-weight: 650;
  text-align: center;
  white-space: nowrap;
}

.table-container :deep(.salt-alliance-group-line) {
  display: block;
  width: 3px;
  height: 20px;
  border-radius: 2px;
  background: currentColor;
  color: var(--muted-foreground);
  font-size: 0;
}

.table-container :deep(.salt-alliance-group-label) {
  display: inline-flex;
  height: 24px;
  align-items: center;
  padding-inline: 9px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--background);
  color: var(--foreground);
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
}

@each $index, $color, $background in
  (0, #237804, rgba(82, 196, 26, 0.035)),
  (1, #ad6800, rgba(250, 173, 20, 0.04)),
  (2, #cf1322, rgba(245, 34, 45, 0.03)),
  (3, #531dab, rgba(114, 46, 209, 0.03)),
  (4, #087d82, rgba(19, 194, 194, 0.035)),
  (5, #6b7280, #ffffff) {
  .table-container :deep(.salt-alliance-group-row-#{$index} .salt-alliance-group-line) {
    color: $color;
  }

  .table-container :deep(.salt-alliance-row-#{$index}),
  .table-container :deep(.salt-alliance-row-#{$index} > td),
  .table-container :deep(.salt-alliance-row-#{$index} .n-data-table-td),
  .table-container :deep(.salt-alliance-row-#{$index} .n-data-table-cell) {
    background: $background !important;
  }
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
