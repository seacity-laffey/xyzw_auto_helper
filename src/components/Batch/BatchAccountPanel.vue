<template>
  <section class="account-panel" data-testid="batch-account-panel">
    <header class="panel-header">
      <div class="panel-title">
        <span><Users :size="18"></Users></span>
        <h3>账号工具</h3>
      </div>
      <div class="panel-actions">
        <small>已选 {{ selectedTokens.length }}/{{ tokens.length }}</small>
        <Button
          size="sm"
          :disabled="isRunning || isOpeningGames || selectedTokens.length === 0"
          @click="emit('openGames')"
        >
          <Gamepad2 :size="14"></Gamepad2>
          {{ isOpeningGames ? "准备中..." : "打开游戏" }}
        </Button>
        <Button size="sm" variant="outline" @click="emit('manageGroups')">
          <SlidersHorizontal :size="14"></SlidersHorizontal>
          管理分组
        </Button>
        <Button
          class="collapse-button"
          size="icon"
          variant="ghost"
          :aria-expanded="!collapsed"
          :aria-label="collapsed ? '展开账号工具' : '折叠账号工具'"
          :title="collapsed ? '展开账号工具' : '折叠账号工具'"
          @click="collapsed = !collapsed"
        >
          <ChevronDown v-if="collapsed" :size="17"></ChevronDown>
          <ChevronUp v-else :size="17"></ChevronUp>
        </Button>
      </div>
    </header>

    <div v-show="!collapsed" class="panel-content">
      <div v-if="groups.length" class="group-row">
        <span>分组</span>
        <button
          v-for="group in groups"
          :key="group.id"
          class="group-button"
          type="button"
          :aria-pressed="selectedGroups.includes(group.id)"
          :style="groupStyle(group)"
          @click="emit('toggleGroup', group.id)"
        >
          {{ group.name }} ({{ getGroupTokenCount(group) }})
        </button>
        <button
          v-if="selectedGroups.length"
          class="clear-groups"
          type="button"
          @click="emit('clearGroups')"
        >
          清除分组选择
        </button>
      </div>

      <div class="selection-toolbar">
        <div class="sort-control" data-testid="batch-sort-controls">
          <button
            v-for="item in sortOptions"
            :key="item.value"
            class="sort-button"
            type="button"
            :class="{ active: sortConfig.field === item.value }"
            @click="emit('sort', item.value)"
          >
            {{ item.label }} {{ getSortIcon(item.value) }}
          </button>
        </div>
        <label class="checkbox-field">
          <Checkbox
            :model-value="isIndeterminate ? 'indeterminate' : isAllSelected"
            @update:model-value="toggleAll"
          ></Checkbox>
          <span>全选</span>
        </label>
      </div>

      <div class="token-grid">
        <article
          v-for="token in tokens"
          :key="token.id"
          class="token-card"
          data-testid="batch-token-card"
          :class="{ selected: selectedTokens.includes(token.id) }"
        >
          <label class="token-select">
            <Checkbox
              :model-value="selectedTokens.includes(token.id)"
              @update:model-value="(checked) => toggleToken(token.id, checked === true)"
            ></Checkbox>
            <span class="status-dot" :class="tokenStatus[token.id] || 'waiting'"></span>
            <span class="token-name">{{ getTokenDisplayName(token) }}<small v-if="templateNames?.[token.id]" class="block truncate" :title="templateNames[token.id]">模板：{{ templateNames[token.id] }}</small></span>
            <small>{{ getStatusText(token.id) }}</small>
          </label>
          <Button
            class="settings-button"
            size="icon"
            variant="ghost"
            :aria-label="`设置${getTokenDisplayName(token)}`"
            :title="`设置${getTokenDisplayName(token)}`"
            @click="emit('openSettings', token)"
          >
            <Settings :size="15"></Settings>
          </Button>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getTokenDisplayName } from "@/utils/roleTokenMetadata.js";
import { computed, ref } from "vue";
import { ChevronDown, ChevronUp, Gamepad2, Settings, SlidersHorizontal, Users } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface BatchToken {
  id: string;
  name?: string;
}

interface TokenGroup {
  id: string;
  name: string;
  color: string;
  tokenIds?: string[];
}

interface SortOption {
  label: string;
  value: string;
}

interface SortConfig {
  direction: "asc" | "desc";
  field: string;
}

const props = defineProps<{
  templateNames?: Record<string, string>;
  groups: TokenGroup[];
  isOpeningGames: boolean;
  isRunning: boolean;
  selectedGroups: string[];
  selectedTokens: string[];
  sortConfig: SortConfig;
  sortOptions: SortOption[];
  tokenStatus: Record<string, string>;
  tokens: BatchToken[];
}>();

const emit = defineEmits<{
  "clearGroups": [];
  "manageGroups": [];
  "openGames": [];
  "openSettings": [token: BatchToken];
  "sort": [field: string];
  "toggleGroup": [groupId: string];
  "update:selectedTokens": [tokenIds: string[]];
}>();
const collapsed = ref(false);

const isAllSelected = computed(
  () => props.tokens.length > 0 && props.selectedTokens.length === props.tokens.length,
);
const isIndeterminate = computed(
  () => props.selectedTokens.length > 0 && props.selectedTokens.length < props.tokens.length,
);

const toggleAll = (checked: boolean | "indeterminate") => {
  emit("update:selectedTokens", checked === true ? props.tokens.map((token) => token.id) : []);
};

const toggleToken = (tokenId: string, checked: boolean) => {
  const selected = new Set(props.selectedTokens);
  if (checked)
    selected.add(tokenId);
  else
    selected.delete(tokenId);
  emit("update:selectedTokens", [...selected]);
};

const getGroupTokenCount = (group: TokenGroup) => {
  const tokenIds = new Set(props.tokens.map((token) => token.id));
  return (group.tokenIds || []).filter((tokenId) => tokenIds.has(tokenId)).length;
};

const groupStyle = (group: TokenGroup) => {
  const selected = props.selectedGroups.includes(group.id);
  return {
    borderColor: group.color,
    backgroundColor: selected ? group.color : "transparent",
    color: selected ? "#fff" : group.color,
  };
};

const getSortIcon = (field: string) => {
  if (props.sortConfig.field !== field)
    return "";
  return props.sortConfig.direction === "asc" ? "↑" : "↓";
};

const getStatusText = (tokenId: string) => {
  const labels: Record<string, string> = {
    completed: "已完成",
    failed: "失败",
    running: "执行中",
    waiting: "等待中",
  };
  return labels[props.tokenStatus[tokenId]] || "等待中";
};
</script>

<style scoped>
.account-panel {
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
}

.panel-header,
.panel-title,
.panel-actions,
.selection-toolbar,
.group-row,
.checkbox-field,
.token-select {
  display: flex;
  align-items: center;
}

.panel-header {
  min-height: 62px;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
}

.panel-title,
.panel-actions {
  gap: 10px;
}

.panel-title > span {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: var(--radius);
  background: var(--muted);
}

.panel-title h3 {
  margin: 0;
  color: var(--foreground);
  font-size: 15px;
  font-weight: 600;
}

.panel-actions small,
.token-select small {
  color: var(--muted-foreground);
  font-size: 11px;
}

.panel-content {
  display: grid;
  max-height: 300px;
  gap: 14px;
  overflow-y: auto;
  padding: 18px 20px;
}

.group-row {
  flex-wrap: wrap;
  gap: 8px;
}

.group-row > span {
  margin-right: 2px;
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 600;
}

.group-button {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid;
  border-radius: var(--radius);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.clear-groups {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--destructive);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.selection-toolbar {
  justify-content: space-between;
  gap: 12px;
}

.sort-control {
  display: flex;
  max-width: 100%;
  overflow-x: auto;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
}

.sort-button {
  min-width: max-content;
  height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--muted-foreground);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.sort-button.active {
  background: var(--primary);
  color: var(--primary-foreground);
  font-weight: 600;
}

.checkbox-field {
  flex: 0 0 auto;
  gap: 7px;
  color: var(--foreground);
  font-size: 13px;
}

.token-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.token-card {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 56px;
  align-items: center;
  padding: 9px 42px 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  transition: border-color 150ms ease, background 150ms ease;
}

.token-card:hover,
.token-card.selected {
  border-color: var(--input);
  background: var(--muted);
}

.token-select {
  min-width: 0;
  flex: 1;
  gap: 9px;
  cursor: pointer;
}

.status-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: var(--primary);
}

.status-dot.failed {
  background: var(--destructive);
}

.status-dot.running {
  background: var(--warning);
}

.status-dot.completed {
  background: var(--success);
}

.token-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--foreground);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-button {
  position: absolute;
  top: 50%;
  right: 6px;
  width: 30px;
  height: 30px;
  transform: translateY(-50%);
}

@media (max-width: 1280px) {
  .token-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .panel-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 12px 14px;
  }

  .panel-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .panel-actions small {
    margin-right: auto;
  }

  .panel-content {
    max-height: none;
    padding: 14px;
  }

  .selection-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .sort-control {
    width: 100%;
  }

  .token-grid {
    grid-template-columns: 1fr;
  }
}
</style>
