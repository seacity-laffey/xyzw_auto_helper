<template>
  <aside class="bin-manager-panel">
    <header class="panel-header">
      <div class="panel-heading">
        <strong>上号器</strong>
        <span>{{ entries.length }} 个本机 BIN</span>
      </div>
      <button
        aria-label="关闭上号器"
        class="icon-action"
        title="关闭上号器"
        type="button"
        @click="$emit('close')"
      >
        <CloseOutline></CloseOutline>
      </button>
    </header>

    <div class="bin-manager-content">
      <label class="bin-target-field">
        <span>目标窗口</span>
        <select
          :value="targetId"
          @change="$emit('update:targetId', $event.target.value)"
        >
          <option
            v-for="option in gameOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <div class="bin-manager-actions">
        <button type="button" @click="$emit('import')">
          <CloudUploadOutline></CloudUploadOutline>
          导入 BIN
        </button>
        <button type="button" @click="$emit('reload')">
          <RefreshOutline></RefreshOutline>
          刷新窗口
        </button>
        <button class="danger-action" type="button" @click="$emit('clear')">
          <TrashOutline></TrashOutline>
          清空 BIN
        </button>
      </div>

      <p v-if="status" class="bin-manager-status">{{ status }}</p>

      <div class="bin-entry-list">
        <div v-for="entry in entries" :key="entry.id" class="bin-entry">
          <div>
            <strong>{{ entry.name || entry.id }}</strong>
            <small>{{ formatBinEntrySize(entry) }}</small>
          </div>
          <span v-if="entry.id === targetId">当前窗口</span>
        </div>
        <div v-if="!entries.length" class="panel-empty">暂无本机 BIN</div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import {
  CloseOutline,
  CloudUploadOutline,
  RefreshOutline,
  TrashOutline,
} from "@vicons/ionicons5";

defineProps({
  entries: { type: Array, default: () => [] },
  gameOptions: { type: Array, default: () => [] },
  status: { type: String, default: "" },
  targetId: { type: [String, Number], default: null },
});

defineEmits(["clear", "close", "import", "reload", "update:targetId"]);

const formatBytes = (value = 0) => {
  if (value < 1024)
    return `${value} B`;
  if (value < 1024 * 1024)
    return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const formatBinEntrySize = (entry) => {
  if (typeof entry.size === "string" && /[a-z]/i.test(entry.size))
    return entry.size;
  return formatBytes(entry.byteLength || Number(entry.size) || 0);
};
</script>

<style scoped>
.bin-manager-panel {
  position: fixed;
  z-index: 31;
  top: 64px;
  right: 12px;
  display: flex;
  width: min(360px, calc(100vw - 24px));
  max-height: calc(100vh - 76px);
  flex-direction: column;
  overflow: hidden;
  color: #e8eaed;
  background: #17191c;
  border: 1px solid #3a3e44;
  border-radius: 6px;
  box-shadow: 0 10px 30px rgb(0 0 0 / 36%);
}

.panel-header {
  display: flex;
  min-height: 58px;
  padding: 8px 10px 8px 14px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #303338;
}

.panel-heading {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.panel-heading strong {
  font-size: 13px;
}

.panel-heading span,
.bin-manager-status {
  color: #9ba1a9;
  font-size: 11px;
}

.icon-action {
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

.icon-action:hover,
.bin-manager-actions button:hover {
  background: #34383e;
}

.icon-action svg {
  width: 16px;
  height: 16px;
}

.bin-manager-content {
  display: grid;
  min-height: 0;
  gap: 12px;
  padding: 14px;
}

.bin-target-field {
  display: grid;
  gap: 6px;
  color: #aeb3ba;
  font-size: 11px;
}

.bin-target-field select {
  height: 34px;
  padding: 0 9px;
  color: #f5f5f5;
  background: #25282d;
  border: 1px solid #3a3e44;
  border-radius: 5px;
  font: inherit;
}

.bin-manager-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.bin-manager-actions button {
  display: inline-flex;
  min-height: 32px;
  padding: 0 10px;
  align-items: center;
  gap: 6px;
  color: #e8eaed;
  background: #25282d;
  border: 1px solid #3a3e44;
  border-radius: 5px;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.bin-manager-actions button.danger-action {
  color: #ffaaa6;
  background: #4b2828;
  border-color: #8a4141;
}

.bin-manager-actions svg {
  width: 14px;
  height: 14px;
}

.bin-manager-status {
  margin: 0;
}

.bin-entry-list {
  min-height: 80px;
  overflow-y: auto;
  border-top: 1px solid #303338;
}

.bin-entry {
  display: flex;
  min-height: 48px;
  padding: 7px 2px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid #272a2e;
}

.bin-entry > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.bin-entry strong,
.bin-entry small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bin-entry strong {
  font-size: 12px;
}

.bin-entry small,
.bin-entry > span {
  color: #8e949c;
  font-size: 10px;
}

.panel-empty {
  display: grid;
  min-height: 140px;
  place-items: center;
  color: #858b93;
  font-size: 12px;
}
</style>
