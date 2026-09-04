<template>
  <Dialog v-model:open="listOpen">
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
          </div>
        </div>

        <div v-if="form.runType === 'daily'" class="field-row">
          <Label for="schedule-run-time">运行时间</Label>
          <Input id="schedule-run-time" type="time" v-model="form.runTime"></Input>
        </div>

        <div v-else class="field-row">
          <Label for="schedule-cron">Cron 表达式</Label>
          <Input id="schedule-cron" placeholder="分 时 日 月 周" v-model="form.cronExpression"></Input>
          <div v-if="form.cronExpression" class="cron-result" :class="cronValidation.valid ? 'valid' : 'invalid'">
            <span>{{ cronValidation.message }}</span>
            <ol v-if="cronValidation.valid && cronNextRuns.length">
              <li v-for="run in cronNextRuns" :key="run">{{ run }}</li>
            </ol>
          </div>
        </div>

        <section class="selection-section">
          <div class="section-heading">
            <Label>选择账号</Label>
            <div>
              <Button size="sm" variant="ghost" @click="form.selectedTokens = tokens.map(token => token.id)">全选</Button>
              <Button size="sm" variant="ghost" @click="form.selectedTokens = []">清空</Button>
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
              <span>{{ token.name || "未命名账号" }}</span>
            </label>
          </div>
        </section>

        <section class="selection-section">
          <div class="section-heading">
            <Label>选择任务</Label>
            <div>
              <Button size="sm" variant="ghost" @click="form.selectedTasks = availableTasks.map(task => task.value)">全选</Button>
              <Button size="sm" variant="ghost" @click="form.selectedTasks = []">清空</Button>
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
import { availableTasks, calculateNextRuns, validateCronExpression } from "@/utils/batch";

interface ScheduledTask {
  cronExpression: string;
  enabled: boolean;
  id: string;
  name: string;
  runTime: string | null;
  runType: "cron" | "daily";
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
  cronExpression: "",
  enabled: true,
  name: "",
  runTime: "",
  runType: "daily" as const,
  selectedTasks: [] as string[],
  selectedTokens: [] as string[],
});

const listOpen = ref(false);
const editorOpen = ref(false);
const editingTaskId = ref<string | null>(null);
const deleteTarget = ref<ScheduledTask | null>(null);
const selectedGroupIds = ref<string[]>([]);
const activeTaskGroup = ref("daily");
const form = reactive<ReturnType<typeof createEmptyForm> & { runType: "cron" | "daily" }>(createEmptyForm());

const enabledCount = computed(() => props.tasks.filter((task) => task.enabled).length);
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

const openList = () => {
  listOpen.value = true;
};

const openEdit = (task: ScheduledTask) => {
  editingTaskId.value = task.id;
  Object.assign(form, {
    cronExpression: task.cronExpression || "",
    enabled: task.enabled,
    name: task.name,
    runTime: task.runTime || "",
    runType: task.runType,
    selectedTasks: [...task.selectedTasks],
    selectedTokens: [...task.selectedTokens],
  });
  selectedGroupIds.value = [];
  editorOpen.value = true;
};

const setRunType = (type: "cron" | "daily") => {
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
  if (!form.selectedTokens.length)
    return emit("notify", { text: "请选择至少一个账号", type: "warning" });
  if (!form.selectedTasks.length)
    return emit("notify", { text: "请选择至少一个任务", type: "warning" });

  const isNew = !editingTaskId.value;
  emit("save", {
    isNew,
    task: {
      cronExpression: form.runType === "cron" ? form.cronExpression.trim() : "",
      enabled: form.enabled,
      id: editingTaskId.value || `task_${Date.now()}`,
      name: form.name.trim(),
      runTime: form.runType === "daily" ? form.runTime : null,
      runType: form.runType,
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
  task.runType === "daily" ? `每天 ${task.runTime}` : task.cronExpression;

defineExpose({ openList, openNew });
</script>

<style scoped>
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
