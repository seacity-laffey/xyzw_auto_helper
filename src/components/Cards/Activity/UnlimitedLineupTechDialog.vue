<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>俱乐部科技</DialogTitle>
        <DialogDescription>已保存阵容对应的科技等级</DialogDescription>
      </DialogHeader>

      <div v-if="techData" class="tech-groups">
        <section
          v-for="type in TECH_TYPES"
          :key="type"
          class="tech-group"
        >
          <h4>{{ LEGION_TECH_TYPE_NAME[type] }}</h4>
          <dl class="tech-items">
            <div
              v-for="techId in LEGION_TECH_TYPE_MAP[type]"
              :key="techId"
              class="tech-item"
            >
              <dt>{{ LEGION_TECH_NAME[techId] }}</dt>
              <dd>
                {{ techData[techId] || 0 }}/{{ LEGION_TECH_MAX_LEVEL[techId] }}
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <p v-else class="empty-state">暂无科技数据</p>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">
          关闭
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import {
  LEGION_TECH_MAX_LEVEL,
  LEGION_TECH_NAME,
  LEGION_TECH_TYPE_MAP,
  LEGION_TECH_TYPE_NAME,
} from "@/utils/heroList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

defineProps({
  open: { type: Boolean, default: false },
  techData: { type: Object, default: null },
});

const emit = defineEmits(["update:open"]);
const TECH_TYPES = [1, 2, 3, 4, 5, 6];
</script>

<style scoped>
.tech-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 24px;
}

.tech-group {
  min-width: 0;
  border-top: 1px solid var(--border);
  padding-top: 10px;
}

.tech-group h4 {
  margin: 0 0 8px;
  color: var(--foreground);
  font-size: 13px;
  font-weight: 650;
}

.tech-items {
  display: grid;
  gap: 1px;
  margin: 0;
  background: var(--border);
}

.tech-item {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 8px;
  background: var(--background);
  font-size: 12px;
}

.tech-item dt {
  min-width: 0;
  overflow: hidden;
  color: var(--foreground);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tech-item dd {
  margin: 0;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.empty-state {
  margin: 28px 0;
  color: var(--muted-foreground);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 640px) {
  .tech-groups {
    grid-template-columns: 1fr;
  }
}
</style>
