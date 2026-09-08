<template>
  <section class="account-card panel">
    <div class="account-toolbar">
      <Input
        class="search-input"
        placeholder="搜索账号"
        :model-value="searchKeyword"
        @update:model-value="emit('update:searchKeyword', $event)"
      ></Input>
      <label class="checkbox-field">
        <Checkbox
          :model-value="someVisibleSelected ? 'indeterminate' : allVisibleSelected"
          @update:model-value="emit('toggleAll', $event === true)"
        ></Checkbox>
        <span>全选</span>
      </label>
      <div v-if="groups.length" class="group-list">
        <button
          v-for="group in groups"
          :key="group.id"
          class="group-chip"
          type="button"
          :class="{ selected: group.selected }"
          :style="group.style"
          @click="emit('toggleGroup', group.id)"
        >
          {{ group.name }}
        </button>
      </div>
    </div>

    <div v-if="tokens.length" class="token-grid">
      <div
        v-for="token in tokens"
        :key="token.id"
        class="token-cell"
        :class="{ selected: token.selected }"
      >
        <Checkbox
          :model-value="token.selected"
          @click.stop
          @update:model-value="emit('toggleToken', token.id, $event === true)"
        ></Checkbox>
        <span class="token-server" :title="token.server || '未知区服'">
          {{ token.server || "未知区服" }}
        </span>
        <span class="token-sep">-</span>
        <span class="token-name" :title="token.name || token.id">
          {{ token.name || token.id }}
        </span>
        <span
          class="status-dot"
          :class="token.statusClass"
          :title="token.statusTitle"
        ></span>
      </div>
    </div>
    <div v-else class="empty-state">暂无账号</div>
  </section>
</template>

<script setup>
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

defineProps({
  allVisibleSelected: { type: Boolean, default: false },
  groups: { type: Array, default: () => [] },
  searchKeyword: { type: String, default: "" },
  someVisibleSelected: { type: Boolean, default: false },
  tokens: { type: Array, default: () => [] },
});

const emit = defineEmits([
  "toggleAll",
  "toggleGroup",
  "toggleToken",
  "update:searchKeyword",
]);
</script>

<style scoped>
.panel {
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
}

.account-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account-toolbar,
.checkbox-field,
.group-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.checkbox-field {
  gap: 7px;
  color: var(--foreground);
  font-size: 13px;
  cursor: pointer;
}

.search-input {
  width: 180px;
}

.group-list {
  gap: 6px;
}

.group-chip {
  padding: 3px 8px;
  border: 1px solid;
  border-radius: var(--radius);
  background: var(--background);
  font-size: 11px;
  line-height: 1.4;
  cursor: pointer;
}

.token-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.token-cell {
  display: flex;
  min-height: 0;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  font-size: 12px;
  line-height: 1.4;
  transition: border-color 0.2s, background 0.2s;
}

.token-cell:hover { border-color: var(--input); }
.token-cell.selected { border-color: var(--foreground); background: var(--muted); }

.token-server,
.token-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.token-server {
  max-width: 140px;
  color: var(--muted-foreground);
  font-weight: 500;
}

.token-name {
  flex: 1;
  color: var(--foreground);
  font-weight: 600;
}

.token-sep { color: var(--text-tertiary); }

.status-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border: 1px solid rgb(0 0 0 / 5%);
  border-radius: 50%;
  background: var(--input);
}

.status-gray { background: var(--input); }
.status-green { background: var(--success); }
.status-red { background: var(--error); }
.status-blue {
  animation: pulse 1.2s ease-in-out infinite;
  background: var(--info);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--info) 20%, transparent);
}

.empty-state {
  display: grid;
  min-height: 56px;
  place-items: center;
  color: var(--muted-foreground);
  font-size: 13px;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--info) 20%, transparent); }
  50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--info) 5%, transparent); }
}

@media (max-width: 1100px) {
  .token-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 760px) {
  .token-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .token-grid { grid-template-columns: 1fr; }
  .search-input { width: min(180px, 100%); }
}
</style>
