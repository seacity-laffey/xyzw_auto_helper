<template>
  <header class="rank-header">
    <div class="title-block">
      <img alt="盐场" src="/icons/moonPalace.png">
      <div>
        <h2>盐场匹配信息</h2>
        <p>俱乐部匹配排行与阵容分析</p>
      </div>
    </div>

    <div class="summary-block">
      <div class="date-picker">
        <span>查询日期</span>
        <Button
          aria-haspopup="dialog"
          size="sm"
          variant="outline"
          :aria-expanded="calendarOpen"
          @click="toggleCalendar"
        >
          <CalendarDays></CalendarDays>
          {{ date }}
        </Button>
        <div v-if="calendarOpen" aria-label="选择查询日期" class="calendar-panel" role="dialog">
          <div class="calendar-heading">
            <Button
              aria-label="上个月"
              size="icon"
              title="上个月"
              variant="ghost"
              @click="changeMonth(-1)"
            >
              <ChevronLeft></ChevronLeft>
            </Button>
            <strong>{{ calendarTitle }}</strong>
            <Button
              aria-label="下个月"
              size="icon"
              title="下个月"
              variant="ghost"
              @click="changeMonth(1)"
            >
              <ChevronRight></ChevronRight>
            </Button>
          </div>
          <div aria-hidden="true" class="calendar-weekdays">
            <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
          </div>
          <div class="calendar-grid">
            <button
              v-for="day in calendarDays"
              :key="day.key"
              type="button"
              :class="{
                selected: day.value === date,
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
      <Badge variant="outline">{{ clubCount }} 个俱乐部</Badge>
    </div>
  </header>

  <div class="rank-actions">
    <fieldset class="export-methods">
      <legend>导出内容</legend>
      <label>
        <Checkbox
          :model-value="exportMethods.includes('1')"
          @update:model-value="toggleExportMethod('1', $event === true)"
        ></Checkbox>
        表格
      </label>
      <label>
        <Checkbox
          :model-value="exportMethods.includes('2')"
          @update:model-value="toggleExportMethod('2', $event === true)"
        ></Checkbox>
        图片
      </label>
    </fieldset>

    <div class="action-buttons">
      <Button size="sm" variant="outline" :disabled="loading" @click="emit('refresh')">
        <RefreshCw :class="{ spinning: loading }"></RefreshCw>
        刷新
      </Button>
      <Button size="sm" variant="outline" :disabled="!hasData || loading" @click="emit('export')">
        <Download></Download>
        导出
      </Button>
      <Button
        size="sm"
        :disabled="!hasData || loading"
        :variant="editMode ? 'secondary' : 'outline'"
        @click="emit('toggleEdit')"
      >
        <Pencil></Pencil>
        {{ editMode ? "退出编辑" : "调整排名" }}
      </Button>
      <Button size="sm" variant="outline" :disabled="!hasData || loading" @click="emit('sortRed')">
        <ListRestart></ListRestart>
        红淬排序
      </Button>
      <Button
        v-if="scoreEnabled"
        size="sm"
        variant="outline"
        :disabled="!hasData || loading"
        @click="emit('sortScore')"
      >
        <ArrowDownWideNarrow></ArrowDownWideNarrow>
        积分排序
      </Button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import {
  ArrowDownWideNarrow,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  ListRestart,
  Pencil,
  RefreshCw,
} from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const props = defineProps({
  clubCount: { type: Number, default: 0 },
  date: { type: String, required: true },
  editMode: { type: Boolean, default: false },
  exportMethods: { type: Array, default: () => [] },
  hasData: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  scoreEnabled: { type: Boolean, default: false },
});

const emit = defineEmits([
  "dateChange",
  "export",
  "refresh",
  "sortRed",
  "sortScore",
  "toggleEdit",
  "update:exportMethods",
]);

const calendarOpen = ref(false);
const calendarMonth = ref(props.date.slice(0, 7));
const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

const parseDate = (value) => {
  const [year, month, day] = String(value).replaceAll("-", "/").split("/").map(Number);
  return new Date(year, month - 1, day || 1);
};

const formatDate = (value) => {
  const pad = (number) => String(number).padStart(2, "0");
  return `${value.getFullYear()}/${pad(value.getMonth() + 1)}/${pad(value.getDate())}`;
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
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + index);
    const value = formatDate(current);
    return {
      disabled: ![0, 6].includes(current.getDay()),
      key: `${value}-${index}`,
      label: current.getDate(),
      outside: current.getMonth() !== month - 1,
      value,
    };
  });
});

watch(
  () => props.date,
  (value) => {
    if (!calendarOpen.value)
      calendarMonth.value = value.slice(0, 7);
  },
);

const toggleCalendar = () => {
  calendarMonth.value = props.date.slice(0, 7);
  calendarOpen.value = !calendarOpen.value;
};

const changeMonth = (offset) => {
  const date = parseDate(`${calendarMonth.value}/01`);
  date.setMonth(date.getMonth() + offset);
  calendarMonth.value = formatDate(date).slice(0, 7);
};

const selectDate = (value) => {
  calendarOpen.value = false;
  emit("dateChange", value);
};

const toggleExportMethod = (method, checked) => {
  const next = new Set(props.exportMethods);
  if (checked)
    next.add(method);
  else
    next.delete(method);
  emit("update:exportMethods", [...next]);
};
</script>

<style scoped>
.rank-header,
.rank-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--background);
}

.title-block,
.summary-block,
.date-picker,
.action-buttons,
.export-methods,
.export-methods label {
  display: flex;
  align-items: center;
  gap: 9px;
}

.title-block img {
  width: 38px;
  height: 38px;
  object-fit: contain;
}

.title-block h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.title-block p {
  margin: 2px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
}

.date-picker {
  position: relative;
}

.date-picker > span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.calendar-panel {
  position: absolute;
  top: calc(100% + 7px);
  right: 0;
  z-index: 50;
  width: 250px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--popover, var(--background));
  box-shadow: 0 10px 28px rgb(0 0 0 / 12%);
}

.calendar-heading {
  display: grid;
  grid-template-columns: 32px 1fr 32px;
  align-items: center;
  margin-bottom: 7px;
  text-align: center;
}

.calendar-heading [data-slot="button"] {
  width: 30px;
  height: 30px;
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 3px;
}

.calendar-weekdays {
  margin-bottom: 4px;
  color: var(--muted-foreground);
  font-size: 11px;
  text-align: center;
}

.calendar-grid button {
  width: 30px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
  font-size: 12px;
}

.calendar-grid button:hover:not(:disabled) {
  border-color: var(--border);
  background: var(--accent);
}

.calendar-grid button.outside {
  color: var(--muted-foreground);
  opacity: 0.55;
}

.calendar-grid button.selected {
  background: var(--primary);
  color: var(--primary-foreground);
}

.calendar-grid button:disabled {
  color: var(--muted-foreground);
  opacity: 0.3;
  cursor: not-allowed;
}

.rank-actions {
  padding-block: 10px;
  background: var(--muted);
}

.export-methods {
  margin: 0;
  padding: 0;
  border: 0;
}

.export-methods legend {
  float: left;
  margin-right: 3px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.export-methods label {
  cursor: pointer;
  font-size: 12px;
}

.action-buttons {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .rank-header,
  .rank-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-block,
  .action-buttons {
    width: 100%;
    justify-content: flex-start;
  }

  .calendar-panel {
    right: auto;
    left: 0;
  }
}

@media (max-width: 520px) {
  .summary-block {
    align-items: flex-start;
    flex-direction: column;
  }

  .action-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .action-buttons [data-slot="button"] {
    width: 100%;
  }
}
</style>
