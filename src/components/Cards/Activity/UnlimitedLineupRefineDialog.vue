<template>
  <n-modal
    preset="card"
    style="width: 600px; max-width: 90vw"
    :bordered="false"
    :show="open"
    :title="title"
    @update:show="emit('update:open', $event)"
  >
    <n-spin :show="loading">
      <div v-if="parts.length" class="refine-modal-content">
        <section
          v-for="part in parts"
          :key="part.id"
          class="equip-refine-section"
        >
          <header class="equip-header">
            <span class="equip-name">{{ part.name }}</span>
            <span class="equip-level">Lv.{{ part.level }}</span>
            <span v-if="part.hasEquipment" class="equip-bonus">
              +{{ part.bonus }} {{ part.bonusLabel }}
            </span>
          </header>
          <div class="slots-container">
            <div
              v-for="slot in part.slots"
              :key="slot.id"
              class="slot-item"
              :class="{
                locked: slot.isLocked,
                [`color-${slot.colorId}`]: slot.colorId > 0,
              }"
            >
              <span class="slot-label">孔{{ slot.id }}</span>
              <span v-if="slot.attrName" class="slot-attr">
                <span class="attr-name">{{ slot.attrName }}</span>
                <span class="attr-value">+{{ slot.attrNum }}%</span>
              </span>
              <span v-else class="slot-empty">未淬炼</span>
              <n-tag v-if="slot.isLocked" size="small" type="warning">
                锁定
              </n-tag>
            </div>
          </div>
        </section>
      </div>
      <div v-else class="no-equipment">
        暂无装备数据
      </div>
    </n-spin>
  </n-modal>
</template>

<script setup lang="ts">
interface RefineSlot {
  attrName: string | null;
  attrNum: number;
  colorId: number;
  id: number;
  isLocked: boolean;
}

interface RefinePart {
  bonus: number;
  bonusLabel: string;
  hasEquipment: boolean;
  id: number;
  level: number;
  name: string;
  slots: RefineSlot[];
}

defineProps<{
  loading: boolean;
  open: boolean;
  parts: RefinePart[];
  title: string;
}>();

const emit = defineEmits<{
  "update:open": [open: boolean];
}>();
</script>

<style scoped lang="scss">
.refine-modal-content {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.equip-refine-section {
  padding: var(--spacing-sm);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.equip-header {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  padding-bottom: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-light);
}

.equip-name {
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}

.equip-level {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.equip-bonus {
  margin-left: auto;
  color: var(--primary-color);
  font-size: var(--font-size-xs);
}

.slots-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.slot-item {
  display: flex;
  padding: var(--spacing-xs) var(--spacing-sm);
  gap: var(--spacing-sm);
  align-items: center;
  background: var(--bg-primary);
  border-left: 3px solid var(--border-light);
  border-radius: var(--border-radius-small);

  &.locked {
    background: var(--primary-color-light);
    border-left-color: var(--primary-color);
  }

  &.color-1 {
    background: rgba(255, 255, 255, 0.1);
    border-left-color: #ffffff;
  }

  &.color-2 {
    background: rgba(76, 175, 80, 0.1);
    border-left-color: #4caf50;
  }

  &.color-3 {
    background: rgba(33, 150, 243, 0.1);
    border-left-color: #2196f3;
  }

  &.color-4 {
    background: rgba(156, 39, 176, 0.1);
    border-left-color: #9c27b0;
  }

  &.color-5 {
    background: rgba(255, 152, 0, 0.1);
    border-left-color: #ff9800;
  }

  &.color-6 {
    background: rgba(244, 67, 54, 0.1);
    border-left-color: #f44336;
  }
}

.slot-label {
  min-width: 30px;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.slot-attr {
  display: flex;
  flex: 1;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}

.attr-name {
  color: var(--text-primary);
}

.attr-value {
  color: var(--primary-color);
  font-weight: var(--font-weight-medium);
}

.slot-empty {
  flex: 1;
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
}

.no-equipment {
  padding: var(--spacing-lg);
  color: var(--text-secondary);
  text-align: center;
}
</style>
