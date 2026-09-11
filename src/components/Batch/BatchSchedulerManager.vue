<template>
  <Dialog :open="listOpen && !editorOpen && !deleteTarget" @update:open="listOpen = $event">
    <DialogContent class="max-h-[88vh] max-w-3xl overflow-hidden p-0" data-testid="batch-schedule-list-dialog">
      <DialogHeader class="border-b border-border px-5 py-4 pr-14">
        <DialogTitle>定时任务</DialogTitle>
        <DialogDescription>共 {{ tasks.length }} 个任务，{{ enabledCount }} 个已启用</DialogDescription>
      </DialogHeader>

      <div class="list-toolbar">
        <Button size="sm" @click="openNew">
          <Plus :size="15"></Plus>
          新增任务
        </Button>
      </div>

      <div class="schedule-list">
        <section aria-label="系统定时模板" class="schedule-presets">
          <p>系统模板不可编辑或删除。使用模板后，选择账号并保存才会创建定时任务。</p>
          <article v-for="preset in BUILTIN_SCHEDULE_TEMPLATES" :key="preset.id" class="preset-item">
            <div><strong>{{ preset.name }}</strong><small>周六 19:50～21:00、周日 19:50～20:30 禁止上线</small></div>
            <Button size="sm" variant="outline" :aria-label="`使用模板：${preset.name}`" @click="openPreset(preset)">使用模板</Button>
          </article>
        </section>
        <article v-for="task in tasks" :key="task.id" class="schedule-item">
          <div class="task-heading">
            <div class="task-name">
              <strong>{{ task.name }}</strong>
              <Badge :variant="task.enabled ? 'default' : 'secondary'">
                {{ task.enabled ? "已启用" : "已禁用" }}
              </Badge>
            </div>
            <Switch
              :aria-label="`${task.enabled ? '禁用' : '启用'}任务${task.name}`"
              :model-value="task.enabled"
              @update:model-value="emit('toggle', task.id, $event)"
            ></Switch>
          </div>

          <dl class="task-details">
            <div><dt>计划</dt><dd>{{ scheduleLabel(task) }}</dd></div>
            <div>
              <dt>下次执行</dt>
              <dd :class="{ urgent: countdowns[task.id]?.isNearExecution }">
                {{ task.enabled ? countdowns[task.id]?.formatted || "计算中..." : "已禁用" }}
              </dd>
            </div>
            <div><dt>账号</dt><dd>{{ task.selectedTokens.length }} 个</dd></div>
            <div><dt>任务</dt><dd>{{ task.selectedTasks.length }} 个</dd></div>
            <div v-if="task.enabled && countdowns[task.id]?.nextExecutionAt" class="execution-time"><dt>执行时间</dt><dd>
              {{ formatExecutionTime(countdowns[task.id]!.nextExecutionAt!) }}
              <small v-if="countdowns[task.id]!.plannedAt !== countdowns[task.id]!.nextExecutionAt">避开禁止上线时段，原定 {{ formatExecutionTime(countdowns[task.id]!.plannedAt!) }}</small>
            </dd></div>
            <div v-if="task.blackoutWindows?.length" class="execution-time"><dt>禁止上线</dt><dd>{{ blackoutLabel(task.blackoutWindows) }}</dd></div>
          </dl>

          <div class="item-actions">
            <Button size="sm" variant="outline" @click="openEdit(task)">
              <Pencil :size="14"></Pencil>
              编辑
            </Button>
            <Button size="sm" variant="outline" @click="deleteTarget = task">
              <Trash2 :size="14"></Trash2>
              删除
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="executingTaskIds.includes(task.id)"
              @click="emit('execute', task)"
            >
              <Loader2 v-if="executingTaskIds.includes(task.id)" class="spin" :size="14"></Loader2>
              <Play v-else :size="14"></Play>
              {{ executingTaskIds.includes(task.id) ? "执行中" : "立即执行" }}
            </Button>
          </div>
        </article>
        <div v-if="!tasks.length" class="empty-state">暂无定时任务</div>
      </div>
    </DialogContent>
  </Dialog>

  <Dialog v-model:open="editorOpen">
    <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto" data-testid="batch-schedule-editor-dialog">
      <DialogHeader>
        <DialogTitle>{{ editingTaskId ? "编辑定时任务" : "新增定时任务" }}</DialogTitle>
        <DialogDescription>{{ form.selectedTokens.length }} 个账号 · {{ form.selectedTasks.length }} 个任务</DialogDescription>
      </DialogHeader>

      <div class="editor-form">
        <div class="field-row">
          <Label for="schedule-task-name">任务名称</Label>
          <Input id="schedule-task-name" placeholder="请输入任务名称" v-model="form.name"></Input>
        </div>

        <div class="field-row">
          <Label>运行类型</Label>
          <div aria-label="运行类型" class="mode-control" role="group">
            <button type="button" :aria-pressed="form.runType === 'daily'" @click="setRunType('daily')">
              每天固定时间
            </button>
            <button type="button" :aria-pressed="form.runType === 'cron'" @click="setRunType('cron')">
              Cron 表达式
            </button>
            <button type="button" :aria-pressed="form.runType === 'interval'" @click="setRunType('interval')">固定间隔</button>
          </div>
        </div>

        <div v-if="form.runType === 'daily'" class="field-row">
          <Label for="schedule-run-time">运行时间</Label>
          <Input id="schedule-run-time" type="time" v-model="form.runTime"></Input>
        </div>

        <div v-else-if="form.runType === 'cron'" class="field-row">
          <Label for="schedule-cron">Cron 表达式</Label>
          <Input id="schedule-cron" placeholder="分 时 日 月 周" v-model="form.cronExpression"></Input>
          <div v-if="form.cronExpression" class="cron-result" :class="cronValidation.valid ? 'valid' : 'invalid'">
            <span>{{ cronValidation.message }}</span>
            <ol v-if="cronValidation.valid && cronNextRuns.length">
              <li v-for="run in cronNextRuns" :key="run">{{ run }}</li>
            </ol>
          </div>
        </div>

        <div v-else class="field-row">
          <Label for="schedule-interval">间隔时长（分钟）</Label>
          <Input id="schedule-interval" type="number" v-model.number="form.intervalMinutes" :max="525600" :min="1"></Input>
          <p class="schedule-help">{{ intervalLabel(form.intervalMinutes) }}。首次从保存并启用时开始计时，提前执行不改变后续计划。</p>
        </div>

        <section class="selection-section">
          <div class="section-heading"><Label>禁止上线时段</Label><Button size="sm" variant="outline" @click="form.blackoutWindows.push({ weekday: 6, start: '20:00', end: '21:00' })">添加时段</Button></div>
          <p class="schedule-help">按本机时间，每周重复。落入时段的任务提前到时段开始前 5 分钟；结束时间早于开始时间表示跨天。</p>
          <div v-for="(window, index) in form.blackoutWindows" :key="index" class="blackout-row">
            <select class="parameter-select" v-model.number="window.weekday" :aria-label="`时段 ${index + 1} 星期`"><option v-for="(day, weekday) in weekdays" :key="weekday" :value="weekday">{{ day }}</option></select>
            <Input type="time" v-model="window.start" :aria-label="`时段 ${index + 1} 开始`"></Input>
            <span>至</span>
            <Input type="time" v-model="window.end" :aria-label="`时段 ${index + 1} 结束`"></Input>
            <Button size="sm" variant="ghost" :aria-label="`删除时段 ${index + 1}`" @click="form.blackoutWindows.splice(index, 1)"><Trash2 :size="14"></Trash2></Button>
          </div>
          <p v-if="nextPreview" class="schedule-help">下次执行：{{ formatExecutionTime(nextPreview.executeAt.getTime()) }}<template v-if="nextPreview.executeAt < nextPreview.plannedAt">（提前执行，原定 {{ formatExecutionTime(nextPreview.plannedAt.getTime()) }}）</template></p>
        </section>

        <section class="selection-section">
          <div class="section-heading">
            <Label>选择账号</Label>
            <div class="selection-actions">
              <Button size="sm" variant="outline" @click="form.selectedTokens = tokens.map(token => token.id)">全选</Button>
              <Button size="sm" variant="outline" @click="form.selectedTokens = []">清空</Button>
            </div>
          </div>

          <div v-if="groups.length" class="group-shortcuts">
            <span>分组</span>
            <button
              v-for="group in groups"
              :key="group.id"
              type="button"
              :aria-pressed="selectedGroupIds.includes(group.id)"
              :style="groupButtonStyle(group)"
              @click="toggleGroup(group)"
            >
              {{ group.name }}
            </button>
            <Button size="sm" variant="ghost" @click="emit('manageGroups')">管理分组</Button>
          </div>

          <div class="option-grid">
            <label v-for="token in tokens" :key="token.id" class="option-item">
              <Checkbox
                :model-value="form.selectedTokens.includes(token.id)"
                @update:model-value="toggleSelection(form.selectedTokens, token.id, $event === true)"
              ></Checkbox>
              <span>{{ getTokenDisplayName(token) }}</span>
            </label>
          </div>
        </section>

        <section class="selection-section">
          <div class="section-heading">
            <Label>选择任务</Label>
            <div class="selection-actions">
              <Button size="sm" variant="outline" @click="form.selectedTasks = availableTasks.map(task => task.value)">全选</Button>
              <Button size="sm" variant="outline" @click="form.selectedTasks = []">清空</Button>
            </div>
          </div>

          <div aria-label="任务分类" class="task-tabs" role="tablist">
            <button
              v-for="group in visibleTaskGroups"
              :key="group.name"
              role="tab"
              type="button"
              :aria-selected="activeTaskGroup === group.name"
              @click="activeTaskGroup = group.name"
            >
              {{ group.label }}
            </button>
          </div>

          <div class="option-grid">
            <label v-for="task in activeTasks" :key="task.value" class="option-item">
              <Checkbox
                :model-value="form.selectedTasks.includes(task.value)"
                @update:model-value="toggleSelection(form.selectedTasks, task.value, $event === true)"
              ></Checkbox>
              <span>{{ task.label }}</span>
            </label>
          </div>
        </section>
        <section v-if="parameterFields.length || form.selectedTasks.includes('batchLegacyGiftSendEnhanced')" class="selection-section">
          <Label>执行参数</Label>
          <div v-for="field in parameterFields" :key="field.key" class="field-row">
            <Label :for="`schedule-${field.key}`">{{ field.label }}</Label>
            <Input :id="`schedule-${field.key}`" type="number" v-model.number="form.parameters[field.key]" :max="field.max" :min="1"></Input>
          </div>
          <div v-if="form.selectedTasks.includes('batchOpenBox')" class="field-row">
            <Label for="schedule-box-type">宝箱类型</Label>
            <select id="schedule-box-type" class="parameter-select" v-model.number="form.parameters.defaultBoxType">
              <option v-for="option in boxTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div v-if="form.selectedTasks.includes('batchFish')" class="field-row">
            <Label for="schedule-fish-type">鱼竿类型</Label>
            <select id="schedule-fish-type" class="parameter-select" v-model.number="form.parameters.defaultFishType">
              <option v-for="option in fishTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <template v-if="form.selectedTasks.includes('batchLegacyGiftSendEnhanced')">
            <div class="field-row">
              <Label for="schedule-receiver">接收者 ID</Label>
              <Input id="schedule-receiver" v-model="form.parameters.receiverId"></Input>
            </div>
            <div class="field-row">
              <Label for="schedule-password">安全密码</Label>
              <Input id="schedule-password" autocomplete="new-password" type="password" v-model="form.parameters.password"></Input>
            </div>
            <div class="field-row">
              <Label for="schedule-gift-mode">赠送数量</Label>
              <select id="schedule-gift-mode" class="parameter-select" :value="form.parameters.giftQuantity === 0 ? 'all' : 'fixed'" @change="form.parameters.giftQuantity = ($event.target as HTMLSelectElement).value === 'all' ? 0 : 10">
                <option value="all">全部库存（每个账号最多 9999）</option>
                <option value="fixed">指定数量</option>
              </select>
              <Input v-if="form.parameters.giftQuantity !== 0" aria-label="指定赠送数量" type="number" v-model.number="form.parameters.giftQuantity" :max="9999" :min="1"></Input>
            </div>
          </template>
        </section>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="editorOpen = false">取消</Button>
        <Button @click="submitTask">保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog :open="Boolean(deleteTarget)" @update:open="!$event && (deleteTarget = null)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>删除定时任务</DialogTitle>
        <DialogDescription>确定删除“{{ deleteTarget?.name }}”吗？此操作不可撤销。</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="deleteTarget = null">取消</Button>
        <Button variant="destructive" @click="confirmDelete">删除</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { getTokenDisplayName } from "@/utils/roleTokenMetadata.js";
import { computed, reactive, ref } from "vue";
import { Loader2, Pencil, Play, Plus, Trash2 } from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import { availableTasks, boxTypeOptions, BUILTIN_SCHEDULE_TEMPLATES, calculateNextRuns, calculateNextScheduledRun, DEFAULT_SCHEDULE_BLACKOUTS, fishTypeOptions, validateBlackoutWindows, validateCronExpression } from "@/utils/batch";
import { createScheduledTaskParameters, validateScheduledTaskParameters } from "@/utils/scheduledTaskParameters";
import type { ScheduledTaskParameters } from "@/utils/scheduledTaskParameters";

type RunType = "cron" | "daily" | "interval";
interface BlackoutWindow { weekday: number; start: string; end: string }

interface ScheduledTask {
  parameters: ScheduledTaskParameters;
  cronExpression: string;
  enabled: boolean;
  id: string;
  name: string;
  runTime: string | null;
  runType: RunType;
  intervalMinutes?: number;
  intervalAnchor?: number;
  blackoutWindows?: BlackoutWindow[];
  selectedTasks: string[];
  selectedTokens: string[];
}

interface BatchToken {
  id: string;
  name?: string;
}

interface TokenGroup {
  color: string;
  id: string;
  name: string;
  tokenIds?: string[];
}

interface Countdown {
  formatted: string;
  isNearExecution: boolean;
  remainingTime: number;
  nextExecutionAt?: number;
  plannedAt?: number;
}

const props = defineProps<{
  countdowns: Record<string, Countdown | undefined>;
  executingTaskIds: string[];
  groups: TokenGroup[];
  tasks: ScheduledTask[];
  tokens: BatchToken[];
}>();

const emit = defineEmits<{
  delete: [taskId: string];
  execute: [task: ScheduledTask];
  manageGroups: [];
  notify: [notice: { text: string; type: "warning" }];
  save: [payload: { isNew: boolean; task: ScheduledTask }];
  toggle: [taskId: string, enabled: boolean];
}>();

const taskGroupDefinitions = [
  {
    label: "日常",
    name: "daily",
    tasks: [
      "startBatch",
      "claimHangUpRewards",
      "batchAddHangUpTime",
      "resetBottles",
      "batchlingguanzi",
      "batchclubsign",
      "batchStudy",
      "batcharenafight",
      "store_purchase",
      "collection_claimfreereward",
      "batchGenieSweep",
      "batchUseGenieTickets",
      "batchFreeGacha",
      "batchUseGachaCoins",
    ],
  },
  {
    label: "副本",
    name: "dungeon",
    tasks: ["climbTower", "batchmengjing", "skinChallenge", "batchClaimPeachTasks", "batchBuyDreamItems"],
  },
  {
    label: "怪异塔",
    name: "weirdTower",
    tasks: ["climbWeirdTower", "batchUseItems", "batchMergeItems", "batchClaimFreeEnergy"],
  },
  {
    label: "资源",
    name: "resource",
    tasks: [
      "batchOpenBox",
      "batchOpenBoxByPoints",
      "batchClaimBoxPointReward",
      "batchFish",
      "batchRecruit",
      "legion_storebuygoods",
    ],
  },
  { label: "功法", name: "legacy", tasks: ["batchLegacyClaim", "batchLegacyGiftSendEnhanced"] },
  { label: "月度", name: "monthly", tasks: ["batchTopUpFish", "batchTopUpArena"] },
];

const createEmptyForm = () => ({
  parameters: createScheduledTaskParameters(),
  cronExpression: "",
  enabled: true,
  name: "",
  runTime: "",
  runType: "daily" as RunType,
  intervalMinutes: 420,
  intervalAnchor: 0,
  blackoutWindows: [] as BlackoutWindow[],
  selectedTasks: [] as string[],
  selectedTokens: [] as string[],
});

const listOpen = ref(false);
const editorOpen = ref(false);
const editingTaskId = ref<string | null>(null);
const deleteTarget = ref<ScheduledTask | null>(null);
const selectedGroupIds = ref<string[]>([]);
const activeTaskGroup = ref("daily");
const form = reactive(createEmptyForm());

const enabledCount = computed(() => props.tasks.filter((task) => task.enabled).length);
const parameterFields = computed(() => ([
  { task: "batchOpenBox", key: "boxCount" as const, label: "开箱数量", max: 10000 },
  { task: "batchFish", key: "fishCount" as const, label: "钓鱼数量", max: 10000 },
  { task: "batchRecruit", key: "recruitCount" as const, label: "招募数量", max: 10000 },
  { task: "batchOpenBoxByPoints", key: "targetBoxPoints" as const, label: "按积分开箱目标", max: 1000000 },
]).filter((field) => form.selectedTasks.includes(field.task)));
const groupedTasks = computed(() => {
  const result: Record<string, typeof availableTasks> = {};
  const assigned = new Set<string>();
  taskGroupDefinitions.forEach((group) => {
    result[group.name] = availableTasks.filter((task) => group.tasks.includes(task.value));
    group.tasks.forEach((task) => assigned.add(task));
  });
  result.other = availableTasks.filter((task) => !assigned.has(task.value));
  return result;
});
const visibleTaskGroups = computed(() => [
  ...taskGroupDefinitions,
  ...(groupedTasks.value.other.length ? [{ label: "其他", name: "other", tasks: [] }] : []),
]);
const activeTasks = computed(() => groupedTasks.value[activeTaskGroup.value] || []);
const cronValidation = computed(() => validateCronExpression(form.cronExpression));
const cronNextRuns = computed(() => {
  if (!cronValidation.value.valid)
    return [];
  const fields = form.cronExpression.split(" ").filter(Boolean);
  if (fields.length !== 5)
    return [];
  return calculateNextRuns(fields[0], fields[1], fields[2], fields[3], fields[4], 5);
});

const weekdays = ["每周日", "每周一", "每周二", "每周三", "每周四", "每周五", "每周六"];
const intervalLabel = (minutes: number) => `每 ${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
const formatExecutionTime = (timestamp: number) => new Date(timestamp).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
const blackoutLabel = (windows: BlackoutWindow[]) => windows.map((window) => `${weekdays[window.weekday]} ${window.start}～${window.end}${window.end < window.start ? "（次日）" : ""}`).join("；");
const nextPreview = computed(() => {
  if (form.runType === "cron" && !cronValidation.value.valid)
    return null;
  const previous = props.tasks.find((task) => task.id === editingTaskId.value);
  const anchor = previous?.runType === "interval" && previous.intervalMinutes === form.intervalMinutes ? form.intervalAnchor : 0;
  return calculateNextScheduledRun({ ...form, intervalAnchor: anchor || Math.floor(Date.now() / 60000) * 60000 });
});

const resetForm = () => {
  Object.assign(form, createEmptyForm());
  editingTaskId.value = null;
  selectedGroupIds.value = [];
  activeTaskGroup.value = "daily";
};

const openNew = () => {
  resetForm();
  editorOpen.value = true;
};

const openPreset = (preset: typeof BUILTIN_SCHEDULE_TEMPLATES[number]) => {
  resetForm();
  form.name = preset.name;
  form.runType = "interval";
  form.intervalMinutes = preset.intervalMinutes;
  form.selectedTasks = [...preset.selectedTasks];
  activeTaskGroup.value = taskGroupDefinitions.find((group) => group.tasks.includes(preset.selectedTasks[0]))?.name || "daily";
  form.blackoutWindows = DEFAULT_SCHEDULE_BLACKOUTS.map((window) => ({ ...window }));
  editorOpen.value = true;
};

const openList = () => {
  listOpen.value = true;
};

const openEdit = (task: ScheduledTask) => {
  editingTaskId.value = task.id;
  Object.assign(form, {
    parameters: createScheduledTaskParameters(task.parameters),
    cronExpression: task.cronExpression || "",
    enabled: task.enabled,
    name: task.name,
    runTime: task.runTime || "",
    runType: task.runType,
    intervalMinutes: task.intervalMinutes || 420,
    intervalAnchor: task.intervalAnchor || 0,
    blackoutWindows: (task.blackoutWindows || []).map((window) => ({ ...window })),
    selectedTasks: [...task.selectedTasks],
    selectedTokens: [...task.selectedTokens],
  });
  selectedGroupIds.value = [];
  editorOpen.value = true;
};

const setRunType = (type: RunType) => {
  form.runType = type;
  if (type === "daily")
    form.cronExpression = "";
  else
    form.runTime = "";
};

const toggleSelection = (selection: string[], value: string, checked: boolean) => {
  const index = selection.indexOf(value);
  if (checked && index < 0)
    selection.push(value);
  if (!checked && index >= 0)
    selection.splice(index, 1);
};

const toggleGroup = (group: TokenGroup) => {
  const groupIds = (group.tokenIds || []).filter((id) => props.tokens.some((token) => token.id === id));
  const selectedIndex = selectedGroupIds.value.indexOf(group.id);
  if (selectedIndex >= 0) {
    selectedGroupIds.value.splice(selectedIndex, 1);
    form.selectedTokens = form.selectedTokens.filter((id) => !groupIds.includes(id));
    return;
  }
  selectedGroupIds.value.push(group.id);
  form.selectedTokens = [...new Set([...form.selectedTokens, ...groupIds])];
};

const groupButtonStyle = (group: TokenGroup) => {
  const selected = selectedGroupIds.value.includes(group.id);
  return {
    backgroundColor: selected ? group.color : "transparent",
    borderColor: group.color,
    color: selected ? "#fff" : group.color,
  };
};

const submitTask = () => {
  if (!form.name.trim())
    return emit("notify", { text: "请输入任务名称", type: "warning" });
  if (form.runType === "daily" && !form.runTime)
    return emit("notify", { text: "请选择运行时间", type: "warning" });
  if (form.runType === "cron" && !cronValidation.value.valid)
    return emit("notify", { text: cronValidation.value.message || "Cron 表达式无效", type: "warning" });
  if (form.runType === "interval" && (!Number.isInteger(form.intervalMinutes) || form.intervalMinutes < 1 || form.intervalMinutes > 525600))
    return emit("notify", { text: "间隔须为 1～525600 的整数分钟", type: "warning" });
  const blackoutError = validateBlackoutWindows(form.blackoutWindows);
  if (blackoutError)
    return emit("notify", { text: blackoutError, type: "warning" });
  if (!nextPreview.value)
    return emit("notify", { text: "该计划没有可执行时间，请调整计划或禁止上线时段", type: "warning" });
  if (!form.selectedTokens.length)
    return emit("notify", { text: "请选择至少一个账号", type: "warning" });
  if (!form.selectedTasks.length)
    return emit("notify", { text: "请选择至少一个任务", type: "warning" });

  const isNew = !editingTaskId.value;
  const parameterError = validateScheduledTaskParameters(form.selectedTasks, form.parameters);
  if (parameterError)
    return emit("notify", { text: parameterError, type: "warning" });
  const previous = props.tasks.find((task) => task.id === editingTaskId.value);
  const intervalAnchor = previous?.runType === "interval" && previous.intervalMinutes === form.intervalMinutes
    ? previous.intervalAnchor || 0
    : 0;
  emit("save", {
    isNew,
    task: {
      parameters: createScheduledTaskParameters(form.parameters),
      cronExpression: form.runType === "cron" ? form.cronExpression.trim() : "",
      enabled: form.enabled,
      id: editingTaskId.value || `task_${Date.now()}`,
      name: form.name.trim(),
      runTime: form.runType === "daily" ? form.runTime : null,
      runType: form.runType,
      intervalMinutes: form.runType === "interval" ? form.intervalMinutes : undefined,
      intervalAnchor: form.runType === "interval" ? (intervalAnchor || (form.enabled ? Math.floor(Date.now() / 60000) * 60000 : 0)) : undefined,
      blackoutWindows: form.blackoutWindows.map((window) => ({ ...window })),
      selectedTasks: [...form.selectedTasks],
      selectedTokens: [...form.selectedTokens],
    },
  });
  editorOpen.value = false;
  resetForm();
};

const confirmDelete = () => {
  if (!deleteTarget.value)
    return;
  emit("delete", deleteTarget.value.id);
  deleteTarget.value = null;
};

const scheduleLabel = (task: ScheduledTask) =>
  task.runType === "daily" ? `每天 ${task.runTime}` : task.runType === "interval" ? intervalLabel(task.intervalMinutes || 0) : task.cronExpression;

defineExpose({ openList, openNew });
</script>

<style scoped>
.selection-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.schedule-presets { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
.schedule-presets p, .schedule-help { color: var(--muted-foreground); font-size: 12px; line-height: 1.6; }
.preset-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
.preset-item strong { font-size: 13px; }
.preset-item small, .execution-time small { display: block; color: var(--muted-foreground); font-size: 11px; margin-top: 4px; }
.execution-time { grid-column: 1 / -1; }
.blackout-row { display: grid; grid-template-columns: 90px minmax(0, 1fr) auto minmax(0, 1fr) 32px; gap: 8px; align-items: center; }
@media (max-width: 480px) { .blackout-row { grid-template-columns: 80px minmax(0, 1fr) auto minmax(0, 1fr) 28px; gap: 4px; } }

.parameter-select {
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
  color: var(--foreground);
}
.list-toolbar {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
}

.schedule-list {
  min-height: 180px;
  max-height: 66vh;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.schedule-item {
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}

.task-heading,
.task-name,
.item-actions,
.section-heading,
.section-heading > div,
.group-shortcuts,
.option-item {
  display: flex;
  align-items: center;
}

.task-heading,
.section-heading {
  justify-content: space-between;
  gap: 12px;
}

.task-name,
.item-actions,
.section-heading > div {
  gap: 8px;
}

.task-name strong {
  font-size: 14px;
}

.task-details {
  display: grid;
  grid-template-columns: 1.5fr 1.5fr 0.7fr 0.7fr;
  gap: 12px;
  margin: 14px 0;
}

.task-details div {
  min-width: 0;
}

.task-details dt {
  color: var(--muted-foreground);
  font-size: 10px;
}

.task-details dd {
  margin: 3px 0 0;
  overflow: hidden;
  color: var(--foreground);
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-details dd.urgent {
  color: var(--destructive);
}

.item-actions {
  flex-wrap: wrap;
}

.spin {
  animation: spin 900ms linear infinite;
}

.empty-state {
  padding: 48px 16px;
  color: var(--muted-foreground);
  font-size: 13px;
  text-align: center;
}

.editor-form,
.field-row,
.selection-section {
  display: grid;
  gap: 12px;
}

.editor-form {
  gap: 18px;
}

.mode-control,
.task-tabs {
  display: flex;
  max-width: 100%;
  overflow-x: auto;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
}

.mode-control button,
.task-tabs button {
  min-width: max-content;
  height: 30px;
  padding: 0 11px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--muted-foreground);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.mode-control button[aria-pressed="true"],
.task-tabs button[aria-selected="true"] {
  background: var(--background);
  color: var(--foreground);
  font-weight: 600;
  box-shadow: 0 1px 2px rgb(0 0 0 / 7%);
}

.cron-result {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 12px;
}

.cron-result.valid {
  color: var(--success);
}

.cron-result.invalid {
  color: var(--destructive);
}

.cron-result ol {
  margin: 8px 0 0;
  padding-left: 22px;
  color: var(--muted-foreground);
  font-family: "JetBrains Mono", monospace;
}

.selection-section {
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.group-shortcuts {
  flex-wrap: wrap;
  gap: 7px;
}

.group-shortcuts > span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.group-shortcuts > button:not([data-slot="button"]) {
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid;
  border-radius: var(--radius);
  background: transparent;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.option-item {
  min-width: 0;
  min-height: 38px;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--foreground);
  font-size: 12px;
}

.option-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .task-details {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .option-grid {
    grid-template-columns: 1fr;
  }
}
</style>
