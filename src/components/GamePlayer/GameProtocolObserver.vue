<template>
  <aside class="observer-panel">
    <header class="observer-header">
      <div class="observer-heading">
        <strong>协议观察器</strong>
        <span>{{ observing ? "正在记录" : "已停止" }} · {{ total }} 条</span>
      </div>
      <div class="observer-actions">
        <button
          v-if="!observing"
          class="observer-action primary-action"
          title="开始记录"
          type="button"
          @click="$emit('start')"
        >
          <PlayOutline></PlayOutline>
        </button>
        <button
          v-else
          class="observer-action danger-action"
          title="停止记录"
          type="button"
          @click="$emit('stop')"
        >
          <StopOutline></StopOutline>
        </button>
        <button
          class="observer-action"
          title="清空记录"
          type="button"
          @click="$emit('clear')"
        >
          <TrashOutline></TrashOutline>
        </button>
        <button
          class="observer-action"
          title="导出 JSON"
          type="button"
          :disabled="total === 0"
          @click="$emit('export')"
        >
          <DownloadOutline></DownloadOutline>
        </button>
        <button
          class="observer-action"
          title="关闭面板"
          type="button"
          @click="$emit('close')"
        >
          <CloseOutline></CloseOutline>
        </button>
      </div>
    </header>

    <div aria-label="协议类型" class="observer-filters" role="tablist">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        :class="{ active: activeFilter === filter.value }"
        @click="$emit('update:activeFilter', filter.value)"
      >
        {{ filter.label }}
      </button>
    </div>

    <div class="observer-content">
      <div aria-label="协议记录" class="observer-list">
        <button
          v-for="entry in entries"
          :key="entry.id"
          class="observer-entry"
          type="button"
          :class="{ selected: selectedEntryId === entry.id }"
          @click="$emit('select', entry.id)"
        >
          <span
            class="entry-direction"
            :class="`direction-${entry.direction}`"
          >
            {{ getDirectionLabel(entry.direction) }}
          </span>
          <span class="entry-summary">
            <strong>{{ getEntryTitle(entry) }}</strong>
            <small>{{ getEntryMeta(entry) }}</small>
          </span>
          <span class="entry-size">{{ formatBytes(entry.payload?.byteLength) }}</span>
        </button>
        <div v-if="entries.length === 0" class="observer-empty">
          {{ observing ? "等待游戏请求" : "点击开始后操作游戏" }}
        </div>
      </div>

      <section v-if="selectedEntryText" class="observer-detail">
        <header>
          <strong>消息详情</strong>
          <button
            class="observer-action"
            title="复制当前消息"
            type="button"
            @click="$emit('copy')"
          >
            <CopyOutline></CopyOutline>
          </button>
        </header>
        <pre>{{ selectedEntryText }}</pre>
      </section>
    </div>
  </aside>
</template>

<script setup>
import {
  CloseOutline,
  CopyOutline,
  DownloadOutline,
  PlayOutline,
  StopOutline,
  TrashOutline,
} from "@vicons/ionicons5";

defineProps({
  activeFilter: { type: String, required: true },
  entries: { type: Array, default: () => [] },
  filters: { type: Array, default: () => [] },
  observing: Boolean,
  selectedEntryId: { type: [String, Number], default: null },
  selectedEntryText: { type: String, default: "" },
  total: { type: Number, default: 0 },
});

defineEmits([
  "clear",
  "close",
  "copy",
  "export",
  "select",
  "start",
  "stop",
  "update:activeFilter",
]);

const getDirectionLabel = (direction) =>
  ({ in: "IN", out: "OUT", event: "EVT" })[direction] || "-";

const getEntryPath = (url) => {
  if (!url)
    return "";
  try {
    return new URL(url, window.location.href).pathname;
  } catch {
    return String(url);
  }
};

const getEntryTitle = (entry) =>
  entry.decoded?.cmd
  || entry.event
  || `${entry.method || ""} ${getEntryPath(entry.url)}`.trim()
  || entry.transport.toUpperCase();

const getEntryMeta = (entry) => {
  const time = new Date(entry.timestamp).toLocaleTimeString("zh-CN", {
    hour12: false,
  });
  const status = entry.status ? ` · ${entry.status}` : "";
  return `${entry.accountName} · ${entry.transport.toUpperCase()} · ${time}${status}`;
};

const formatBytes = (value = 0) => {
  if (value < 1024)
    return `${value} B`;
  if (value < 1024 * 1024)
    return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};
</script>

<style scoped>
.observer-panel {
  position: fixed;
  z-index: 30;
  top: 56px;
  right: 0;
  bottom: 0;
  display: flex;
  width: min(620px, 48vw);
  min-width: 420px;
  flex-direction: column;
  color: #e8eaed;
  background: #17191c;
  border-left: 1px solid #3a3e44;
  box-shadow: -8px 0 24px rgb(0 0 0 / 28%);
}

.observer-header,
.observer-detail > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #303338;
}

.observer-header {
  min-height: 58px;
  padding: 8px 10px 8px 14px;
  gap: 12px;
}

.observer-heading {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.observer-heading strong {
  font-size: 13px;
}

.observer-heading span {
  color: #9ba1a9;
  font-size: 11px;
}

.observer-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
}

.observer-action {
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  place-items: center;
  color: #d8dbe0;
  background: #25282d;
  border: 1px solid #3a3e44;
  border-radius: 5px;
  cursor: pointer;
}

.observer-action:hover:not(:disabled) {
  background: #34383e;
}

.observer-action:disabled {
  opacity: 0.4;
  cursor: default;
}

.observer-action svg {
  width: 16px;
  height: 16px;
}

.primary-action {
  color: #9ce0b6;
  background: #214332;
  border-color: #347a56;
}

.danger-action {
  color: #ffaaa6;
  background: #4b2828;
  border-color: #8a4141;
}

.observer-filters {
  display: flex;
  flex: 0 0 auto;
  padding: 8px 10px;
  gap: 1px;
  border-bottom: 1px solid #303338;
}

.observer-filters button {
  min-height: 28px;
  padding: 0 12px;
  color: #aeb3ba;
  font-size: 11px;
  background: #25282d;
  border: 0;
  cursor: pointer;
}

.observer-filters button:first-child {
  border-radius: 5px 0 0 5px;
}

.observer-filters button:last-child {
  border-radius: 0 5px 5px 0;
}

.observer-filters button.active {
  color: #fff;
  background: #49505a;
}

.observer-content {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-rows: minmax(180px, 1fr) minmax(180px, 0.85fr);
}

.observer-list {
  min-height: 0;
  overflow: auto;
  border-bottom: 1px solid #3a3e44;
}

.observer-entry {
  display: grid;
  width: 100%;
  min-height: 48px;
  padding: 6px 10px;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #272a2e;
  cursor: pointer;
}

.observer-entry:hover,
.observer-entry.selected {
  background: #272b30;
}

.observer-entry.selected {
  box-shadow: inset 3px 0 #55c982;
}

.entry-direction {
  font-size: 10px;
  font-weight: 700;
}

.direction-in { color: #f1a45c; }
.direction-out { color: #68cf91; }
.direction-event { color: #8db9ee; }

.entry-summary {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.entry-summary strong,
.entry-summary small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-summary strong {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  font-weight: 600;
}

.entry-summary small,
.entry-size {
  color: #8e949c;
  font-size: 10px;
}

.observer-empty {
  display: grid;
  min-height: 140px;
  place-items: center;
  color: #858b93;
  font-size: 12px;
}

.observer-detail {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.observer-detail > header {
  min-height: 42px;
  padding: 5px 10px 5px 14px;
}

.observer-detail > header strong {
  font-size: 12px;
}

.observer-detail pre {
  min-height: 0;
  flex: 1;
  margin: 0;
  padding: 12px 14px;
  overflow: auto;
  color: #d7dce2;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 640px) {
  .observer-panel {
    width: 100%;
    min-width: 0;
  }
}
</style>
