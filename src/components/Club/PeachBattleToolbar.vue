<template>
  <div class="toolbar">
    <div class="left">
      <span class="title">查询日期:</span>
      <div class="peach-date-dropdown">
        <NTag
          class="peach-date-tag"
          type="info"
          @click="toggleCalendar"
        >
          {{ queryDate }}
        </NTag>
        <div v-if="calendarOpen" class="peach-calendar-panel">
          <div class="peach-calendar-header">
            <button type="button" @click="changeMonth(-1)">&lt;</button>
            <span>{{ calendarTitle }}</span>
            <button type="button" @click="changeMonth(1)">&gt;</button>
          </div>
          <div class="peach-calendar-weekdays">
            <span v-for="day in weekdays" :key="day">{{ day }}</span>
          </div>
          <div class="peach-calendar-grid">
            <button
              v-for="day in calendarDays"
              :key="day.key"
              type="button"
              :class="{
                selected: day.value === queryDate,
                disabled: day.disabled,
                outside: day.outside,
              }"
              :disabled="day.disabled"
              @click="selectDate(day.value)"
            >
              {{ day.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="right">
      <NButton
        class="action-btn batch-duel-btn"
        size="small"
        type="warning"
        :disabled="!hasOpponents || batchDuelRunning"
        :loading="batchDuelRunning"
        @click="emit('batchDuel')"
      >
        <template #icon><NIcon><Flash></Flash></NIcon></template>
        一键切磋5次
      </NButton>
      <NButton
        class="action-btn export-btn"
        size="small"
        :disabled="!hasOpponents"
        @click="emit('export')"
      >
        <template #icon><NIcon><Copy></Copy></NIcon></template>
        导出图片
      </NButton>
      <NButton
        class="refresh-btn"
        size="small"
        :disabled="loading"
        @click="emit('refresh')"
      >
        <template #icon><NIcon><Refresh></Refresh></NIcon></template>
        刷新
      </NButton>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { Copy, Flash, Refresh } from "@vicons/ionicons5";
import { NButton, NIcon, NTag } from "naive-ui";

const props = defineProps({
  batchDuelRunning: { type: Boolean, default: false },
  hasOpponents: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  queryDate: { type: String, required: true },
});

const emit = defineEmits(["batchDuel", "export", "refresh", "selectDate"]);
const calendarOpen = ref(false);
const calendarMonth = ref(props.queryDate.slice(0, 7));
const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

const parseDateText = (value) => {
  const [year, month, day] = String(value || props.queryDate)
    .split("/")
    .map(Number);
  return new Date(year, month - 1, day || 1);
};

const formatDate = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};

const calendarTitle = computed(() => {
  const [year, month] = calendarMonth.value.split("/");
  return `${year}年${month}月`;
});

const calendarDays = computed(() => {
  const [year, month] = calendarMonth.value.split("/").map(Number);
  const firstDate = new Date(year, month - 1, 1);
  const startDate = new Date(firstDate);
  startDate.setDate(firstDate.getDate() - firstDate.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const value = formatDate(date);
    return {
      key: `${value}-${index}`,
      label: date.getDate(),
      value,
      disabled: date.getDay() !== 0,
      outside: date.getMonth() !== month - 1,
    };
  });
});

const toggleCalendar = () => {
  calendarMonth.value = props.queryDate.slice(0, 7);
  calendarOpen.value = !calendarOpen.value;
};

const changeMonth = (offset) => {
  const date = parseDateText(`${calendarMonth.value}/01`);
  date.setMonth(date.getMonth() + offset);
  calendarMonth.value = formatDate(date).slice(0, 7);
};

const selectDate = (value) => {
  calendarOpen.value = false;
  emit("selectDate", value);
};
</script>

<style scoped lang="scss">
.toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 0 8px;
}

.left,
.right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  color: #666;
  font-size: 14px;
}

.peach-date-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
}

:deep(.peach-date-tag) {
  min-width: 96px;
  justify-content: center;
  cursor: pointer;
  user-select: none;
}

.peach-calendar-panel {
  position: absolute;
  z-index: 30;
  top: calc(100% + 6px);
  left: 0;
  width: 238px;
  padding: 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.peach-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;

  button {
    width: 26px;
    height: 26px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
  }
}

.peach-calendar-weekdays,
.peach-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.peach-calendar-weekdays {
  margin-bottom: 4px;
  color: #6b7280;
  font-size: 12px;
  text-align: center;
}

.peach-calendar-grid button {
  height: 28px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: #fff;
  color: #1f2937;
  cursor: pointer;

  &.outside {
    color: #c0c4cc;
  }

  &.selected {
    background: #1677ff;
    color: #fff;
  }

  &.disabled {
    background: #f5f5f5;
    color: #c0c4cc;
    cursor: not-allowed;
  }
}

@media (max-width: 640px) {
  .toolbar {
    align-items: stretch;
    flex-direction: column;
    padding: 0;
  }

  .right {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
