<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-4xl overflow-hidden">
      <DialogHeader>
        <DialogTitle>月赛助威</DialogTitle>
        <DialogDescription>
          选择一个俱乐部，并设置本次消耗的拍手器数量。
        </DialogDescription>
      </DialogHeader>

      <div class="guess-toolbar">
        <Label for="war-guess-coin">拍手器</Label>
        <Input
          id="war-guess-coin"
          class="w-28"
          type="number"
          :max="20"
          :min="1"
          :model-value="coin"
          @update:model-value="updateCoin"
        ></Input>
        <Button
          :disabled="!selectedId || running"
          @click="emit('cheer')"
        >
          助威
        </Button>
        <Button variant="outline" :disabled="loading" @click="emit('refresh')">
          {{ loading ? "刷新中" : "刷新数据" }}
        </Button>
      </div>

      <div class="table-viewport">
        <table>
          <thead>
            <tr>
              <th class="selection-column"><span class="sr-only">选择</span></th>
              <th>ID</th>
              <th>头像</th>
              <th>区服</th>
              <th>俱乐部</th>
              <th>战力</th>
              <th>红淬</th>
              <th>已助威</th>
              <th>总热度</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.id"
              :class="{ selected: selectedId === row.id }"
              @click="emit('update:selectedId', row.id)"
            >
              <td class="selection-column">
                <input
                  name="war-guess-club"
                  type="radio"
                  :aria-label="`选择${row.name || row.id}`"
                  :checked="selectedId === row.id"
                  @change="emit('update:selectedId', row.id)"
                >
              </td>
              <td>{{ row.id }}</td>
              <td>
                <img v-if="row.logo" alt="" class="club-logo" :src="row.logo">
                <span v-else>-</span>
              </td>
              <td>{{ row.serverId ?? "-" }}</td>
              <td>{{ row.name || "-" }}</td>
              <td>{{ formatPower(row.power) }}</td>
              <td>{{ row.quenchNum ?? 0 }}</td>
              <td>{{ row.guessNum ?? 0 }}</td>
              <td>{{ formatPower(row.totalNum) }}</td>
            </tr>
            <tr v-if="!rows.length && !loading">
              <td class="empty-row" colspan="9">暂无助威数据</td>
            </tr>
          </tbody>
        </table>
        <div v-if="loading" class="loading-state">正在获取助威数据</div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">关闭</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WarGuessRow {
  guessNum?: number;
  id: number | string;
  logo?: string;
  name?: string;
  power?: number;
  quenchNum?: number;
  serverId?: number | string;
  totalNum?: number;
}

defineProps<{
  coin: number;
  loading: boolean;
  open: boolean;
  rows: WarGuessRow[];
  running: boolean;
  selectedId: number | string | null;
}>();

const emit = defineEmits<{
  "cheer": [];
  "refresh": [];
  "update:coin": [value: number];
  "update:open": [value: boolean];
  "update:selectedId": [value: number | string];
}>();

const formatPower = (power?: number) => {
  const value = Number(power) || 0;
  if (value >= 100000000)
    return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000)
    return `${(value / 10000).toFixed(2)}万`;
  return String(value);
};

const updateCoin = (value: string | number) => {
  const nextValue = Number(value);
  if (Number.isFinite(nextValue))
    emit("update:coin", nextValue);
};
</script>

<style scoped>
.guess-toolbar {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.table-viewport {
  position: relative;
  min-height: 240px;
  max-height: 430px;
  overflow: auto;
  border: 1px solid var(--border);
}

table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 12px;
}

th,
td {
  height: 42px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  white-space: nowrap;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--muted);
  color: var(--muted-foreground);
  font-weight: 600;
}

tbody tr {
  cursor: pointer;
}

tbody tr:hover,
tbody tr.selected {
  background: var(--accent);
}

.selection-column {
  width: 40px;
  text-align: center;
}

.club-logo {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.empty-row,
.loading-state {
  color: var(--muted-foreground);
  text-align: center;
}

.loading-state {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--background) 82%, transparent);
  font-size: 13px;
}
</style>
