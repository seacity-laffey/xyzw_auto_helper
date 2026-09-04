<template>
  <div
    class="batch-daily-tasks h-screen min-h-screen overflow-hidden bg-background p-0 text-foreground max-md:h-auto max-md:min-h-[calc(100vh-56px)] max-md:overflow-visible"
  >
    <header
      class="flex min-h-20 items-center justify-between gap-6 border-b border-border bg-background px-6 py-3 max-xl:flex-wrap max-md:gap-4 max-md:px-3"
      data-testid="batch-control-header"
    >
      <div
        class="flex min-w-0 items-center gap-8 max-md:w-full max-md:justify-between max-md:gap-3"
      >
        <div class="shrink-0 max-md:hidden">
          <h2
            class="m-0 whitespace-nowrap text-2xl font-extrabold text-on-surface max-md:text-xl"
          >
            批量日常任务
          </h2>
          <div class="mt-1 flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-primary"></span>
            <span class="text-[10px] font-bold uppercase text-primary">
              系统就绪 · {{ scheduledTasks.length }} 个定时任务
            </span>
          </div>
        </div>
        <div
          class="h-10 w-px bg-[color-mix(in_srgb,var(--outline-variant)_30%,transparent)] max-md:hidden"
        ></div>
        <button
          class="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          type="button"
          :aria-expanded="showAccountTools"
          @click="showAccountTools = !showAccountTools"
        >
          <PeopleOutline class="h-4 w-4"></PeopleOutline>
          <span>账号工具</span>
          <small class="text-muted-foreground">{{ selectedTokens.length }}/{{ tokens.length }}</small>
        </button>
        <div
          class="flex items-center gap-1 rounded-md border border-border bg-background p-1"
        >
          <button
            class="flex items-center gap-2 whitespace-nowrap rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_88%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 max-md:px-3"
            type="button"
            :disabled="isRunning || selectedTokens.length === 0"
            @click="startBatch"
          >
            <Play class="h-4 w-4"></Play>
            {{ isRunning ? "执行中..." : "开始执行" }}
          </button>
          <button
            class="flex items-center gap-2 whitespace-nowrap rounded-sm px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-[color-mix(in_srgb,var(--error)_10%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 max-md:px-3"
            type="button"
            :disabled="!isRunning"
            @click="stopBatch"
          >
            <Stop class="h-4 w-4"></Stop>
            停止
          </button>
        </div>
      </div>

      <div class="flex items-center gap-3 max-md:w-full max-md:justify-end">
        <div
          class="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1"
          data-testid="batch-tool-cluster"
        >
          <button
            aria-label="新增定时任务"
            class="batch-tool-button"
            title="新增定时任务"
            type="button"
            @click="schedulerManagerRef?.openNew()"
          >
            <Add class="h-5 w-5"></Add>
          </button>
          <button
            aria-label="查看定时任务"
            class="batch-tool-button"
            title="查看定时任务"
            type="button"
            @click="schedulerManagerRef?.openList()"
          >
            <CalendarOutline class="h-5 w-5"></CalendarOutline>
          </button>
          <button
            aria-label="任务模板"
            class="batch-tool-button"
            title="任务模板"
            type="button"
            @click="showTemplateManagerModal = true"
          >
            <DocumentTextOutline class="h-5 w-5"></DocumentTextOutline>
          </button>
          <span
            class="mx-1 h-5 w-px bg-[color-mix(in_srgb,var(--outline-variant)_20%,transparent)]"
          ></span>
          <button
            aria-label="导出配置"
            class="batch-tool-button"
            title="导出配置"
            type="button"
            @click="exportConfig"
          >
            <CloudUploadOutline class="h-5 w-5"></CloudUploadOutline>
          </button>
          <input
            ref="configImportInput"
            accept=".json"
            class="sr-only"
            type="file"
            @change="handleConfigImportChange"
          >
          <button
            aria-label="导入配置"
            class="batch-tool-button"
            title="导入配置"
            type="button"
            @click="configImportInput?.click()"
          >
            <CloudDownloadOutline class="h-5 w-5"></CloudDownloadOutline>
          </button>
          <span
            class="mx-1 h-5 w-px bg-[color-mix(in_srgb,var(--outline-variant)_20%,transparent)]"
          ></span>
          <button
            aria-label="批量设置"
            class="batch-tool-button"
            title="批量设置"
            type="button"
            @click="openBatchSettings"
          >
            <Settings class="h-5 w-5"></Settings>
          </button>
        </div>
        <button
          class="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted"
          type="button"
          :aria-label="showLogPanel ? '隐藏日志面板' : '显示日志面板'"
          :title="showLogPanel ? '隐藏日志面板' : '显示日志面板'"
          @click="showLogPanel = !showLogPanel"
        >
          <TerminalOutline
            class="h-5 w-5 transition-transform duration-300"
            :class="showLogPanel ? 'rotate-0' : 'rotate-180'"
          ></TerminalOutline>
        </button>
      </div>
    </header>

    <div
      class="grid h-[calc(100%-80px)] min-h-0 gap-y-6 overflow-hidden p-6 transition-[grid-template-columns,column-gap] duration-300 ease-out max-lg:h-auto max-lg:overflow-visible max-md:gap-y-4 max-md:p-3"
      data-testid="batch-workspace"
      :class="
        showLogPanel
          ? 'grid-cols-[minmax(0,1fr)_384px] gap-x-6 max-xl:grid-cols-[minmax(0,1fr)_340px] max-lg:grid-cols-1 max-md:gap-x-0'
          : 'grid-cols-[minmax(0,1fr)_0px] gap-x-0 max-lg:grid-cols-1'
      "
    >
      <div
        class="flex min-w-0 flex-col gap-6 overflow-hidden max-lg:overflow-visible max-md:gap-4"
      >
        <BatchAccountPanel
          v-if="showAccountTools"
          v-model:selected-tokens="selectedTokens"
          :groups="tokenGroups"
          :is-opening-games="isOpeningGames"
          :is-running="isRunning"
          :selected-groups="selectedGroups"
          :sort-config="sortConfig"
          :sort-options="batchSortOptions"
          :token-status="tokenStatus"
          :tokens="sortedTokens"
          @clear-groups="clearAllGroupSelection"
          @manage-groups="showGroupManageModal = true"
          @open-games="openSelectedGames"
          @open-settings="openSettings"
          @sort="toggleSort"
          @toggle-group="toggleGroupSelection"
        ></BatchAccountPanel>

        <BatchFunctionPanel
          v-model:weird-tower-max-climb="weirdTowerMaxClimb"
          :arena-activity-open="isarenaActivityOpen"
          :dream-activity-open="ismengjingActivityOpen"
          :is-running="isRunning"
          :selected-count="selectedTokens.length"
          :war-guess-activity-open="isWarGuessActivityOpen"
          :war-guess-activity-tip="warGuessActivityTip"
          :weird-tower-activity-open="isWeirdTowerActivityOpen"
          @action="handleBatchFunctionAction"
        ></BatchFunctionPanel>
      </div>

      <BatchExecutionLog
        :completed-count="completedTokenCount"
        :current-token-name="currentRunningTokenName"
        :failed-count="failedTokenCount"
        :is-running="isRunning"
        :logs="logs"
        :max-entries="batchSettings.maxLogEntries || 1000"
        :progress="currentProgress"
        :visible="showLogPanel"
        @clear="clearLogs"
        @copy="copyLogs"
      ></BatchExecutionLog>
    </div>

    <BatchTaskSettingsDialog
      v-model:open="showSettingsModal"
      :boss-times-options="bossTimesOptions"
      :formation-options="formationOptions"
      :model-value="currentSettings"
      :title="`任务设置 - ${currentSettingsTokenName}`"
      @save="saveSettings"
      @update:model-value="Object.assign(currentSettings, $event)"
    ></BatchTaskSettingsDialog>

    <BatchTemplateManager
      v-model:open="showTemplateManagerModal"
      :boss-times-options="bossTimesOptions"
      :formation-options="formationOptions"
      :groups="tokenGroups"
      :tokens="sortedTokens"
      @notify="handleTemplateNotice"
    ></BatchTemplateManager>

    <BatchSchedulerManager
      ref="schedulerManagerRef"
      :countdowns="taskCountdowns"
      :executing-task-ids="executingTaskIds"
      :groups="tokenGroups"
      :tasks="scheduledTasks"
      :tokens="sortedTokens"
      @delete="deleteTask"
      @execute="manualExecuteTask"
      @manage-groups="showGroupManageModal = true"
      @notify="handleSchedulerNotice"
      @save="saveScheduledTask"
      @toggle="toggleTaskEnabled"
    ></BatchSchedulerManager>

    <BatchLegacyGiftDialog
      v-model:open="showLegacyGiftModal"
      v-model:password="securityPassword"
      v-model:quantity="giftQuantity"
      v-model:recipient-id="recipientIdInput"
      :error="recipientIdError"
      :querying="isQueryingRecipient"
      :recipient-info="recipientInfo"
      @input-change="clearRecipientError"
      @query="queryRecipientInfo"
      @submit="confirmLegacyGift"
    ></BatchLegacyGiftDialog>

    <BatchHelperDialog
      v-model:open="showHelperModal"
      :box-type-options="boxTypeOptions"
      :fish-type-options="fishTypeOptions"
      :model-value="helperSettings"
      :type="helperType"
      @execute="executeHelper"
      @update:model-value="Object.assign(helperSettings, $event)"
    ></BatchHelperDialog>

    <BatchDreamPurchaseDialog
      v-model:open="showDreamBuyModal"
      :model-value="batchSettings.dreamPurchaseList"
      @save="saveDreamBuyConfig"
    ></BatchDreamPurchaseDialog>

    <BatchRuntimeSettingsDialog
      v-model:open="showBatchSettingsModal"
      :box-type-options="boxTypeOptions"
      :fish-type-options="fishTypeOptions"
      :model-value="batchSettings"
      @configure-dream="openDreamBuyModal"
      @save="saveBatchSettings"
      @update:model-value="Object.assign(batchSettings, $event)"
    ></BatchRuntimeSettingsDialog>

    <BatchWarGuessDialog
      v-model:coin="warGuessCoin"
      v-model:open="showWarGuessModal"
      v-model:selected-id="selectedWarGuessLegionId"
      :loading="warGuessLoading"
      :rows="warGuessList"
      :running="isRunning"
      @cheer="handleWarGuessCheer"
      @refresh="fetchWarGuessRank"
    ></BatchWarGuessDialog>

    <BatchGroupManagerDialog
      v-model:open="showGroupManageModal"
      @notify="handleGroupNotice"
    ></BatchGroupManagerDialog>
  </div>
</template>

<script setup>
// Import required dependencies
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import {
  batchSelectedTokenIds,
  tokenGroups,
  useTokenStore,
} from "@/stores/tokenStore";
import { $emit } from "@/stores/events/index";
import { DailyTaskRunner } from "@/utils/dailyTaskRunner";
import { useAppMessage } from "@/composables/useAppMessage";
import { useBatchActivityAvailability } from "@/composables/useBatchActivityAvailability";
import { useBatchConfigTransfer } from "@/composables/useBatchConfigTransfer";
import { useBatchGameLauncher } from "@/composables/useBatchGameLauncher";
import { useBatchRuntimeSettings } from "@/composables/useBatchRuntimeSettings";
import { useBatchTokenSort } from "@/composables/useBatchTokenSort";
import {
  sanitizeScheduledTask,
  useScheduledTaskStorage,
} from "@/composables/useScheduledTaskStorage";
import BatchAccountPanel from "@/components/Batch/BatchAccountPanel.vue";
import BatchExecutionLog from "@/components/Batch/BatchExecutionLog.vue";
import BatchFunctionPanel from "@/components/Batch/BatchFunctionPanel.vue";
import BatchHelperDialog from "@/components/Batch/BatchHelperDialog.vue";
import BatchGroupManagerDialog from "@/components/Batch/BatchGroupManagerDialog.vue";
import BatchLegacyGiftDialog from "@/components/Batch/BatchLegacyGiftDialog.vue";
import BatchDreamPurchaseDialog from "@/components/Batch/BatchDreamPurchaseDialog.vue";
import BatchRuntimeSettingsDialog from "@/components/Batch/BatchRuntimeSettingsDialog.vue";
import BatchSchedulerManager from "@/components/Batch/BatchSchedulerManager.vue";
import BatchTaskSettingsDialog from "@/components/Batch/BatchTaskSettingsDialog.vue";
import BatchTemplateManager from "@/components/Batch/BatchTemplateManager.vue";
import BatchWarGuessDialog from "@/components/Batch/BatchWarGuessDialog.vue";
import {
  Plus as Add,
  CalendarDays as CalendarOutline,
  Download as CloudDownloadOutline,
  Upload as CloudUploadOutline,
  FileText as DocumentTextOutline,
  Users as PeopleOutline,
  Play,
  Settings,
  Square as Stop,
  Terminal as TerminalOutline,
} from "@lucide/vue";
import { DEFAULT_WEIRD_TOWER_MAX_CLIMB } from "@/utils/towerClimbLimit.js";

// Import batch task modules
import {
  availableTasks,
  bossTimesOptions,
  // Constants
  boxTypeOptions,
  calculateMonthProgress,
  calculateNextExecutionTime,
  // Task factories
  createTasksArena,
  createTasksBottle,
  createTasksDungeon,
  createTasksHangUp,
  createTasksItem,
  createTasksLegacy,
  createTasksStore,
  createTasksTower,
  fishTypeOptions,
  formationOptions,
  formatTimeDifference,
  getTodayStartSec,
  isTodayAvailable,
  matchesCronExpression,
  pickArenaTargetId,
} from "@/utils/batch";

// Initialize token store, message service, and task runner
const tokenStore = useTokenStore();
const message = useAppMessage();
const weirdTowerMaxClimb = ref(DEFAULT_WEIRD_TOWER_MAX_CLIMB);
const configImportInput = ref(null);

const tokens = computed(() => tokenStore.gameTokens);
const {
  sortConfig,
  sortOptions: batchSortOptions,
  sortedTokens,
  toggleSort,
} = useBatchTokenSort(tokens);
const {
  arenaActivityOpen: isarenaActivityOpen,
  dreamActivityOpen: ismengjingActivityOpen,
  warGuessActivityOpen: isWarGuessActivityOpen,
  warGuessActivityTip,
  weirdTowerActivityOpen: isWeirdTowerActivityOpen,
} = useBatchActivityAvailability();

const selectedTokens = batchSelectedTokenIds;
const showAccountTools = ref(false);
const { isOpeningGames, openSelectedGames } = useBatchGameLauncher(
  tokens,
  selectedTokens,
);
const tokenStatus = ref({}); // { tokenId: 'waiting' | 'running' | 'completed' | 'failed' }
const isRunning = ref(false);
const shouldStop = ref(false);

watch(
  tokens,
  (currentTokens) => {
    const validTokenIds = new Set(currentTokens.map((token) => token.id));
    selectedTokens.value = selectedTokens.value.filter((tokenId) =>
      validTokenIds.has(tokenId),
    );
  },
  { immediate: true },
);

// =====================
// Token分组管理状态
// =====================
const showGroupManageModal = ref(false);
const selectedGroups = ref([]); // 选中的分组ID列表

const handleGroupNotice = ({ type, text }) => {
  message[type](text);
};

// ======================
// War Guess Feature
// ======================
const showWarGuessModal = ref(false);
const warGuessList = ref([]);
const warGuessLoading = ref(false);
const warGuessCoin = ref(20);
const selectedWarGuessLegionId = ref(null);

const openWarGuessModal = () => {
  showWarGuessModal.value = true;
  // Reset selection
  selectedWarGuessLegionId.value = null;
  warGuessList.value = [];

  // Auto fetch if tokens selected
  if (selectedTokens.value.length > 0) {
    fetchWarGuessRank();
  }
};

const fetchWarGuessRank = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号用于获取月赛助威数据");
    return;
  }

  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find((t) => t.id === tokenId);

  warGuessLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在使用 ${token.name} 获取月赛助威数据...`,
      type: "info",
    });

    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
      tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      await new Promise((r) => setTimeout(r, 2000)); // Wait for connection
    }

    // Fetch rank
    const res = await tokenStore.sendMessageWithPromise(
      tokenId,
      "warguess_getrank",
      { bfId: "" },
      5000,
    );

    if (res && res.list) {
      let list = [];
      if (Array.isArray(res.list)) {
        list = res.list;
      } else {
        list = Object.values(res.list);
      }

      // Sort by totalNum desc
      warGuessList.value = list
        .sort((a, b) => (b.totalNum || 0) - (a.totalNum || 0))
        .slice(0, 20);
    } else {
      message.warning("获取月赛助威数据为空");
    }
  } catch (error) {
    console.error("Fetch rank error:", error);
    message.error(`获取月赛助威数据失败: ${error.message}`);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `获取月赛助威数据失败: ${error.message}`,
      type: "error",
    });
  } finally {
    warGuessLoading.value = false;
  }
};

const handleWarGuessCheer = async () => {
  if (!selectedWarGuessLegionId.value) {
    message.warning("请先选择一个俱乐部");
    return;
  }
  // Close modal
  showWarGuessModal.value = false;
  // Call the batch function
  await batchWarGuessCheer(selectedWarGuessLegionId.value, warGuessCoin.value);
};

// Settings Modal State
const showSettingsModal = ref(false);
const currentSettingsTokenId = ref(null);
const currentSettingsTokenName = ref("");
const currentSettings = reactive({
  arenaFormation: 1,
  towerFormation: 1,
  bossFormation: 1,
  bossTimes: 2,
  claimBottle: true,
  payRecruit: true,
  openBox: true,
  arenaEnable: true,
  claimHangUp: true,
  claimEmail: true,
  blackMarketPurchase: true,
});

const showTemplateManagerModal = ref(false);
const handleTemplateNotice = ({ type, text }) => {
  message[type](text);
};

// Helper Modal State
const showHelperModal = ref(false);
const helperType = ref("box"); // 'box' | 'fish' | 'recruit'
const helperSettings = reactive({
  boxType: 2001,
  fishType: 1,
  count: 100,
  targetPoints: 1000,
});

// Batch Settings State
const showBatchSettingsModal = ref(false);
const { batchSettings, loadBatchSettings, persistBatchSettings }
  = useBatchRuntimeSettings();

const saveBatchSettings = () => {
  if (persistBatchSettings()) {
    message.success("定时批量任务设置已保存");
    showBatchSettingsModal.value = false;
  } else {
    message.error("保存设置失败");
  }
};

// Open batch settings modal
const openBatchSettings = () => {
  loadBatchSettings();
  showBatchSettingsModal.value = true;
};

// ======================
// Legacy Gift Feature
// ======================

// Legacy Gift Modal State
const showLegacyGiftModal = ref(false);
const recipientIdInput = ref("");
const recipientIdError = ref("");
const recipientInfo = ref(null);
const isQueryingRecipient = ref(false);
const giftQuantity = ref(10);
const securityPassword = ref(""); // 安全密码

// ======================
// Scheduled Tasks Feature
// ======================

const schedulerManagerRef = ref(null);

const handleSchedulerNotice = ({ type, text }) => {
  message[type](text);
};

const {
  deleteTask,
  saveScheduledTask,
  saveScheduledTasks,
  scheduledTasks,
  toggleTaskEnabled,
} = useScheduledTaskStorage({
  addLog: (entry) => addLog(entry),
  notify: (type, text) => message[type](text),
});

// Track executing tasks for UI loading state
const executingTaskIds = ref([]);

// Manual execute task
const manualExecuteTask = async (task) => {
  if (executingTaskIds.value.includes(task.id))
    return;

  // Reset stop flag if not running, to allow manual execution
  if (!isRunning.value && shouldStop.value) {
    shouldStop.value = false;
  }

  executingTaskIds.value.push(task.id);
  try {
    message.info(`开始执行任务: ${task.name}`);
    await executeScheduledTask(task);
    message.success(`任务 ${task.name} 执行完成`);
  } catch (e) {
    console.error(`执行任务 ${task.name} 失败:`, e);
    message.error(`任务 ${task.name} 执行失败`);
  } finally {
    executingTaskIds.value = executingTaskIds.value.filter(
      (id) => id !== task.id,
    );
  }
};

// ======================
// Import/Export Config
// ======================
const { exportConfig, importConfigFile } = useBatchConfigTransfer({
  batchSettings,
  persistBatchSettings,
  sanitizeScheduledTask,
  saveScheduledTasks,
  scheduledTasks,
  tokens,
});

const handleConfigImportChange = async (event) => {
  const input = event.target;
  const file = input.files?.[0];
  if (!file)
    return;
  await importConfigFile(file);
  input.value = "";
};

// ======================
// Scheduled Tasks Countdown
// ======================

// 注: parseCronField, calculateNextExecutionTime, formatTimeDifference 已从 @/utils/batch 导入

// Task countdowns ref
const taskCountdowns = ref({});
const nextExecutionTimes = ref({});

// Update countdowns for all tasks
const updateCountdowns = () => {
  const now = Date.now();

  scheduledTasks.value.forEach((task) => {
    if (!task.enabled) {
      // Clear countdown for disabled tasks
      delete taskCountdowns.value[task.id];
      return;
    }

    if (
      !nextExecutionTimes.value[task.id]
      || nextExecutionTimes.value[task.id] <= now
    ) {
      // Calculate next execution time if not set or passed
      nextExecutionTimes.value[task.id] = calculateNextExecutionTime(task);
    }

    if (nextExecutionTimes.value[task.id]) {
      const timeDiff = nextExecutionTimes.value[task.id] - now;
      taskCountdowns.value[task.id] = {
        remainingTime: Math.max(0, timeDiff),
        formatted: formatTimeDifference(Math.max(0, timeDiff)),
        isNearExecution: timeDiff < 5 * 60 * 1000, // Less than 5 minutes
      };
    }
  });
};

// Start countdown interval
let countdownInterval = null;

const startCountdown = () => {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update countdowns immediately
  updateCountdowns();

  // Update countdowns every second
  countdownInterval = setInterval(updateCountdowns, 1000);
};

// ======================
// Scheduled Tasks Scheduler
// ======================

// Watch for changes to scheduledTasks for debugging
watch(
  scheduledTasks,
  () => {
    // Reset countdowns when tasks change
    nextExecutionTimes.value = {};
    taskCountdowns.value = {};
    updateCountdowns();
  },
  { deep: true },
);

// Task scheduler variables - moved to component level scope
const intervalId = ref(null);
let lastTaskExecution = null;
let healthCheckInterval = null;
const pageLoadTime = Date.now();

// Health check for the scheduler
const healthCheck = () => {
  // If interval is not running, restart it
  if (!intervalId.value) {
    console.error(
      `[${new Date().toISOString()}] Task scheduler interval is not running, restarting...`,
    );
    startScheduler();
  }

  // Add a safety mechanism to prevent isRunning from being stuck
  if (isRunning.value) {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000; // 10 minutes ago
    if (lastTaskExecution && lastTaskExecution < tenMinutesAgo) {
      console.error(
        `[${new Date().toISOString()}] isRunning has been true for more than 10 minutes, resetting to false`,
      );
      isRunning.value = false;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "=== 检测到任务执行超时，已重置isRunning状态 ===",
        type: "warning",
      });
    }
  }

  // Check for page refresh
  if (batchSettings.enableRefresh && batchSettings.refreshInterval > 0) {
    const elapsedMinutes = (Date.now() - pageLoadTime) / 1000 / 60;
    if (elapsedMinutes >= batchSettings.refreshInterval) {
      if (!isRunning.value) {
        console.log(
          `[${new Date().toISOString()}] Refreshing page as scheduled (Interval: ${batchSettings.refreshInterval}m, Elapsed: ${elapsedMinutes.toFixed(1)}m)`,
        );
        window.location.reload();
      } else {
        console.log(
          `[${new Date().toISOString()}] Scheduled refresh postponed due to running task`,
        );
      }
    }
  }
};

// Start the scheduler
const startScheduler = () => {
  // Clear any existing interval first
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }

  // Check every 10 seconds instead of 60 seconds for more timely task execution
  intervalId.value = setInterval(() => {
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("zh-CN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // Don't skip all tasks if isRunning is true, just skip individual task execution if already running
      const tasksToRun = scheduledTasks.value.filter((task) => task.enabled);

      if (tasksToRun.length === 0) {
        return;
      }

      tasksToRun.forEach((task) => {
        let shouldRun = false;

        if (task.runType === "daily") {
          // Check if current time matches the scheduled time
          const taskTime = task.runTime;
          const nowTime = now.toLocaleTimeString("zh-CN", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          });
          shouldRun = nowTime === taskTime;
        } else if (task.runType === "cron") {
          // Improved cron expression parsing using shared utility
          try {
            shouldRun = matchesCronExpression(task.cronExpression, now);
          } catch (error) {
            console.error(
              `[${new Date().toISOString()}] Error parsing cron expression ${task.cronExpression}:`,
              error,
            );
            addLog({
              time: currentTime,
              message: `=== 解析定时任务 ${task.name} 的Cron表达式失败: ${error.message} ===`,
              type: "error",
            });
            return;
          }
        }

        if (shouldRun) {
          // Check if the task was already executed in the last minute to avoid duplicate execution
          const taskExecutionKey = `${task.id}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;
          const lastExecutionKey = localStorage.getItem(
            `lastTaskExecution_${task.id}`,
          );

          if (lastExecutionKey !== taskExecutionKey) {
            // Update last execution time
            localStorage.setItem(
              `lastTaskExecution_${task.id}`,
              taskExecutionKey,
            );

            // Execute the task
            lastTaskExecution = Date.now();
            executeScheduledTask(task);
          } else {
            // Only log once per minute to avoid spamming logs
            // But since we check every 10s, this might log multiple times if we don't track logged state
            // For now, we can skip logging "already executed" to keep logs clean
          }
        }
      });
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error in task scheduler:`,
        error,
      );
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务调度服务发生错误: ${error.message} ===`,
        type: "error",
      });
    }
  }, 10000); // Check every 10 seconds
};

// Token刷新等待处理函数
const handleTokenRefreshWaiting = (data) => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `Token刷新限流等待中，预计等待 ${data.waitSeconds} 秒（队列: ${data.queueSize}）`,
    type: "warning",
  });
};

// Debug: Log initial state when component mounts
onMounted(() => {
  // Start the task scheduler after all functions are initialized
  scheduleTaskExecution();
  // Start countdown timer
  startCountdown();
  // 监听Token刷新等待事件
  $emit.on("token:refresh:waiting", handleTokenRefreshWaiting);
});

// Cleanup countdown interval on unmount
onBeforeUnmount(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // 移除Token刷新等待事件监听
  $emit.off("token:refresh:waiting", handleTokenRefreshWaiting);

  // Cleanup task scheduler intervals
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "=== 定时任务调度服务已停止 ===",
      type: "info",
    });
  }

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
});

// Task scheduler - ensure it runs properly
const scheduleTaskExecution = () => {
  // Log the start of the scheduler
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "=== 定时任务调度服务已启动 ===",
    type: "info",
  });

  // Start the scheduler
  startScheduler();

  // Health check every 5 minutes instead of 1 hour for more frequent safety checks
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  healthCheckInterval = setInterval(healthCheck, 5 * 60 * 1000);

  // Initial health check
  healthCheck();
};

// Verify task dependencies - 只验证基础依赖，WebSocket连接由具体任务函数处理
const verifyTaskDependencies = async (task) => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始验证定时任务 ${task.name} 的依赖 ===`,
    type: "info",
  });

  // Verify localStorage is available
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "✅ localStorage可用",
      type: "info",
    });
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `❌ localStorage不可用: ${error.message}`,
      type: "error",
    });
    return false;
  }

  // Verify token store is available
  if (!tokenStore || !tokenStore.gameTokens) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "❌ Token存储不可用",
      type: "error",
    });
    return false;
  }

  // Verify task functions exist
  for (const taskName of task.selectedTasks) {
    const taskFunction = getScheduledTaskFunction(taskName);
    if (typeof taskFunction !== "function") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `❌ 任务函数不存在: ${taskName}`,
        type: "error",
      });
      return false;
    }
  }

  // 直接使用所有选中的token，WebSocket连接由具体任务函数内部管理
  // ensureConnection函数会自动处理并行连接和连接池管理
  const connectedTokens = task.selectedTokens.map((tokenId) => {
    const tokenName
      = tokenStore.gameTokens.find((t) => t.id === tokenId)?.name || tokenId;
    return { id: tokenId, name: tokenName };
  });

  // Log connection status
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `✅ 将使用 ${connectedTokens.length} 个账号执行任务`,
    type: "info",
  });

  // Store connected tokens for execution
  task.connectedTokens = connectedTokens.map((t) => t.id);

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 定时任务 ${task.name} 的依赖验证通过，将执行 ${connectedTokens.length} 个账号 ===`,
    type: "success",
  });
  return true;
};

// Execute a scheduled task with dependency verification
const executeScheduledTask = async (task) => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始执行定时任务: ${task.name} ===`,
    type: "info",
  });

  try {
    // Verify dependencies before executing task
    const dependenciesValid = await verifyTaskDependencies(task);
    if (!dependenciesValid) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 依赖验证失败，取消执行 ===`,
        type: "error",
      });
      return;
    }

    // Filter out tokens that don't exist in current tokens.value
    const availableTokens = (
      task.connectedTokens || task.selectedTokens
    ).filter((tokenId) => {
      return tokens.value.some((t) => t.id === tokenId);
    });

    const missingTokens = (task.connectedTokens || task.selectedTokens).filter(
      (tokenId) => {
        return !tokens.value.some((t) => t.id === tokenId);
      },
    );

    if (missingTokens.length > 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚠️  跳过不存在的Token: ${missingTokens.join(", ")}`,
        type: "warning",
      });
    }

    if (availableTokens.length === 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 没有可用的Token，取消执行 ===`,
        type: "error",
      });
      return;
    }

    // Always use the latest selectedTokens from the task that exist in current tokens.value
    selectedTokens.value = [...availableTokens];

    // Execute selected tasks in parallel
    const taskPromises = task.selectedTasks.map(async (taskName) => {
      if (shouldStop.value)
        return;

      if (
        ["batchmengjing", "batchBuyDreamItems"].includes(taskName)
        && !ismengjingActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在梦境开放时间)`,
          type: "warning",
        });
        return;
      }

      if (
        ["batchTopUpArena", "batcharenafight"].includes(taskName)
        && !isarenaActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在竞技场开放时间)`,
          type: "warning",
        });
        return;
      }

      if (
        [
          "climbWeirdTower",
          "batchUseItems",
          "batchMergeItems",
          "batchClaimFreeEnergy",
        ].includes(taskName)
        && !isWeirdTowerActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在怪异塔开放时间)`,
          type: "warning",
        });
        return;
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `执行任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName}`,
        type: "info",
      });

      // Call the task function from the explicit scheduled task registry
      const taskFunction = getScheduledTaskFunction(taskName);
      if (typeof taskFunction === "function") {
        // For batch operations, pass isScheduledTask = true
        // 具体的batch任务函数内部会使用ensureConnection管理并行连接
        if (
          [
            "batchOpenBox",
            "batchOpenBoxByPoints",
            "batchFish",
            "batchRecruit",
            "batchLegacyGiftSendEnhanced",
          ].includes(taskName)
        ) {
          await taskFunction(true);
        } else {
          await taskFunction();
        }
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `任务函数不存在: ${taskName}`,
          type: "error",
        });
      }
    });

    // Wait for all tasks to complete
    await Promise.all(taskPromises);

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行完成: ${task.name} ===`,
      type: "success",
    });
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行失败: ${error.message} ===`,
      type: "error",
    });
    console.error(
      `[${new Date().toISOString()}] Error executing scheduled task ${task.name}:`,
      error,
    );
  }
};

// 注: boxTypeOptions, fishTypeOptions 已从 @/utils/batch 导入

const openHelperModal = (type) => {
  helperType.value = type;
  showHelperModal.value = true;
};

// 批量功法残卷赠送相关方法
const clearRecipientError = () => {
  recipientIdError.value = "";
};

const queryRecipientInfo = async () => {
  // 1. 输入验证
  if (!recipientIdInput.value || recipientIdInput.value === "") {
    recipientIdError.value = "请输入接收者ID";
    return;
  }

  const recipientId = Number(recipientIdInput.value);
  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    recipientIdError.value = "请输入有效的数字ID";
    return;
  }

  // 2. 检查选中账号
  if (selectedTokens.value.length === 0) {
    recipientIdError.value = "请先选择要操作的角色";
    return;
  }

  // 3. 初始化状态
  isQueryingRecipient.value = true;
  recipientIdError.value = "";
  recipientInfo.value = null;

  const firstTokenId = selectedTokens.value[0];
  const token = tokens.value.find((t) => t.id === firstTokenId);

  // 记录开始查询
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始查询接收者信息: 使用账号 ${token.name} (ID: ${firstTokenId}) ===`,
    type: "info",
  });

  try {
    // 确保WebSocket连接
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在建立WebSocket连接...`,
      type: "info",
    });

    // 使用现有的ensureConnection函数，它已经包含了重连机制
    await ensureConnection(firstTokenId);

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `WebSocket连接成功`,
      type: "success",
    });

    // 发送查询命令
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在发送查询命令，接收者ID: ${recipientId}`,
      type: "info",
    });

    // 延长超时时间到10秒，确保有足够时间处理
    const resp = await tokenStore.sendMessageWithPromise(
      firstTokenId,
      "rank_getroleinfo",
      {
        bottleType: 0,
        includeBottleTeam: false,
        isSearch: false,
        roleId: recipientId,
      },
      10000,
    );

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `查询命令发送成功，正在处理响应...`,
      type: "info",
    });

    // 处理查询结果
    console.log("rank_getroleinfo 响应结果:", resp);

    // 兼容不同的响应结构
    const roleData = resp?.role || resp?.roleInfo;

    if (roleData) {
      // 构建完整的角色信息，移除等级和VIP字段
      recipientInfo.value = {
        roleId: roleData.roleId || roleData.role?.roleId,
        name: roleData.name || roleData.role?.name,
        // 添加头像URL
        avatarUrl:
          resp?.roleInfo?.headImg
          || roleData?.headImg
          || roleData?.role?.headImg
          || "",
        // 战力转换为亿为单位
        power: (function (p) {
          const billion = 100000000;
          return (p / billion).toFixed(2);
        })(roleData.power || roleData.role?.power || 0),
        powerUnit: "亿",
        // 扩展更多角色信息
        serverName: roleData.serverName || roleData.role?.serverName || "",
        legionName: resp?.legionInfo?.name || "",
        legionId: resp?.legionInfo?.id || 0,
      };

      // 格式化角色名，处理特殊字符
      const displayName = recipientInfo.value.name || "未知角色";

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 查询成功: 找到角色 ${displayName} (ID: ${recipientInfo.value.roleId})，战力: ${recipientInfo.value.power}${recipientInfo.value.powerUnit} ===`,
        type: "success",
      });

      message.success("查询成功");
    } else {
      const errorMsg = "未找到该角色信息";
      recipientIdError.value = errorMsg;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 查询失败: ${errorMsg} ===`,
        type: "error",
      });

      message.error(errorMsg);
    }
  } catch (error) {
    // 详细的错误处理
    console.error("查询接收者信息失败:", error);

    let errorMsg = "查询失败";
    let logType = "error";

    // 根据错误类型提供更友好的错误信息
    if (error.message.includes("连接失败")) {
      errorMsg = "WebSocket连接失败，请检查网络或账号状态";
    } else if (
      error.message.includes("timeout")
      || error.message.includes("超时")
    ) {
      errorMsg = "查询超时，请稍后重试";
      logType = "warning";
    } else if (error.message.includes("200160")) {
      errorMsg = "功法系统未开启";
    } else {
      errorMsg = `查询失败: ${error.message}`;
    }

    recipientIdError.value = errorMsg;

    // 记录错误日志
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== ${errorMsg} ===`,
      type: logType,
    });

    // 显示用户友好的错误提示
    message.error(errorMsg);
  } finally {
    isQueryingRecipient.value = false;

    // 记录查询完成
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 查询操作完成 ===`,
      type: "info",
    });
  }
};

const confirmLegacyGift = async () => {
  if (!recipientIdInput.value || !recipientInfo.value) {
    message.error("请先查询并确认接收者信息");
    return;
  }

  if (!securityPassword.value) {
    message.error("请输入安全密码");
    return;
  }

  // 调用增强版批量赠送功能
  await batchLegacyGiftSendEnhanced();

  // 关闭模态框
  showLegacyGiftModal.value = false;
  // 清空安全密码
  securityPassword.value = "";
};

const executeHelper = () => {
  if (helperType.value !== "pointsBox") {
    if (helperSettings.count % 10 !== 0 || helperSettings.count < 10) {
      message.warning("消耗数量必须是10的整数倍，最小为10");
      return;
    }
  }
  showHelperModal.value = false;
  if (helperType.value === "box") {
    batchOpenBox();
  } else if (helperType.value === "fish") {
    batchFish();
  } else if (helperType.value === "recruit") {
    batchRecruit();
  } else if (helperType.value === "pointsBox") {
    batchOpenBoxByPoints();
  }
};

// Dream Buy Modal Logic
const showDreamBuyModal = ref(false);

const openDreamBuyModal = () => {
  showDreamBuyModal.value = true;
};

const saveDreamBuyConfig = (selection) => {
  batchSettings.dreamPurchaseList = selection;
  saveBatchSettings();
  message.success("梦境购买配置已保存");
};

// 注: formationOptions, bossTimesOptions 已从 @/utils/batch 导入

const loadSettings = (tokenId) => {
  try {
    const raw = localStorage.getItem(`daily-settings:${tokenId}`);
    const defaultSettings = {
      arenaFormation: 1,
      towerFormation: 1,
      bossFormation: 1,
      bossTimes: 2,
      claimBottle: true,
      payRecruit: true,
      openBox: true,
      arenaEnable: true,
      claimHangUp: true,
      claimEmail: true,
      blackMarketPurchase: true,
    };
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return null;
  }
};

const openSettings = (token) => {
  currentSettingsTokenId.value = token.id;
  currentSettingsTokenName.value = token.name;
  const saved = loadSettings(token.id);
  Object.assign(currentSettings, saved);
  showSettingsModal.value = true;
};

const saveSettings = () => {
  if (currentSettingsTokenId.value) {
    localStorage.setItem(
      `daily-settings:${currentSettingsTokenId.value}`,
      JSON.stringify(currentSettings),
    );
    message.success(`已保存 ${currentSettingsTokenName.value} 的设置`);
    showSettingsModal.value = false;
  }
};

const currentRunningTokenId = ref(null);
const currentProgress = ref(0);
const logs = ref([]);
const showLogPanel = ref(true);
const completedTokenCount = computed(
  () =>
    Object.values(tokenStatus.value).filter((status) => status === "completed").length,
);
const failedTokenCount = computed(
  () =>
    Object.values(tokenStatus.value).filter((status) => status === "failed").length,
);

const currentRunningTokenName = computed(() => {
  const t = tokens.value.find((x) => x.id === currentRunningTokenId.value);
  return t ? t.name : "";
});

// =====================
// Token分组管理相关方法
// =====================

/**
 * 切换分组选择状态
 */
const toggleGroupSelection = (groupId) => {
  const index = selectedGroups.value.indexOf(groupId);
  if (index > -1) {
    selectedGroups.value.splice(index, 1);
  } else {
    selectedGroups.value.push(groupId);
  }

  // 更新selectedTokens
  updateSelectedTokensFromGroups();
};

/**
 * 根据选中的分组更新selectedTokens
 */
const updateSelectedTokensFromGroups = () => {
  const tokenIds = new Set();

  selectedGroups.value.forEach((groupId) => {
    const validTokenIds = tokenStore.getValidGroupTokenIds(groupId);
    validTokenIds.forEach((id) => tokenIds.add(id));
  });

  selectedTokens.value = Array.from(tokenIds);
};

/**
 * 一键清除所有分组选择
 */
const clearAllGroupSelection = () => {
  selectedGroups.value = [];
  selectedTokens.value = [];
};

// 注: pickArenaTargetId, FISH_TARGET, ARENA_TARGET, getTodayStartSec, isTodayAvailable, calculateMonthProgress 已从 @/utils/batch 导入

const addLog = (log) => {
  logs.value.push(log);

  const maxLogEntries = batchSettings.maxLogEntries || 1000;
  if (logs.value.length > maxLogEntries) {
    logs.value = logs.value.slice(-maxLogEntries);
  }
};

const copyLogs = () => {
  if (logs.value.length === 0) {
    message.warning("没有可复制的日志");
    return;
  }
  const logText = logs.value
    .map((log) => `${log.time} ${log.message}`)
    .join("\n");
  navigator.clipboard
    .writeText(logText)
    .then(() => {
      message.success("日志已复制到剪贴板");
    })
    .catch((err) => {
      message.error(`复制日志失败: ${err.message}`);
    });
};

const clearLogs = () => {
  logs.value = [];
  message.success("日志已清空");
};

const waitForConnection = async (
  tokenId,
  timeout = batchSettings.connectionTimeout,
) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connected")
      return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

// 全局连接队列控制 - 限制并发连接数
const connectionQueue = { active: 0 };

const waitForConnectionSlot = async () => {
  while (connectionQueue.active >= batchSettings.maxActive) {
    await new Promise((r) => setTimeout(r, 1000));
  }
  connectionQueue.active++;
};

const releaseConnectionSlot = () => {
  if (connectionQueue.active > 0) {
    connectionQueue.active--;
  }
};

const ensureConnection = async (tokenId, maxRetries = 2) => {
  const latestToken = tokens.value.find((t) => t.id === tokenId);
  if (!latestToken) {
    throw new Error(`Token not found: ${tokenId}`);
  }

  const status = tokenStore.getWebSocketStatus(tokenId);
  let connected = status === "connected";

  if (!connected) {
    // 等待连接槽位，限制并发连接数
    await waitForConnectionSlot();

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在连接... (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
      type: "info",
    });

    tokenStore.createWebSocketConnection(
      tokenId,
      latestToken.token,
      latestToken.wsUrl,
    );
    connected = await waitForConnection(tokenId);

    if (!connected && maxRetries > 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `连接超时，尝试重连...`,
        type: "warning",
      });

      tokenStore.closeWebSocketConnection(tokenId);
      await new Promise((r) => setTimeout(r, batchSettings.reconnectDelay));

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在重连...`,
        type: "info",
      });

      const refreshedToken = tokens.value.find((t) => t.id === tokenId);
      tokenStore.createWebSocketConnection(
        tokenId,
        refreshedToken.token,
        refreshedToken.wsUrl,
      );

      connected = await waitForConnection(tokenId);
    }

    if (!connected) {
      // 连接失败，释放槽位
      releaseConnectionSlot();
      throw new Error("连接失败 (重试后仍超时)");
    }
  }

  // 连接成功，槽位保持占用，直到任务完成后手动释放

  // Initialize Game Data (Critical for Battle Version and Session)
  try {
    // Fetch Role Info first (Standard flow)
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
      5000,
    );

    // Fetch Battle Version
    const res = await tokenStore.sendMessageWithPromise(
      tokenId,
      "fight_startlevel",
      {},
      5000,
    );
    if (res?.battleData?.version) {
      tokenStore.setBattleVersion(res.battleData.version);
    }
  } catch (e) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `初始化数据失败: ${e.message}`,
      type: "warning",
    });
  }

  return true;
};

const createTaskDeps = () => ({
  selectedTokens,
  tokens,
  tokenStatus,
  isRunning,
  shouldStop,
  ensureConnection,
  releaseConnectionSlot,
  connectionQueue,
  batchSettings,
  tokenStore,
  addLog,
  message,
  currentRunningTokenId,
  // 延迟配置
  delayConfig: {
    command: batchSettings.commandDelay,
    task: batchSettings.taskDelay,
    action: batchSettings.actionDelay,
    battle: batchSettings.battleDelay,
    refresh: batchSettings.refreshDelay,
    long: batchSettings.longDelay,
  },
  // 其他特定依赖
  logs,
  nextTick,
  // 设置相关
  currentSettings,
  helperSettings,
  weirdTowerMaxClimb,
  // 功法赠送相关
  recipientIdInput,
  recipientInfo,
  securityPassword,
  giftQuantity,
  // 竞技场相关辅助函数
  pickArenaTargetId,
  getTodayStartSec,
  isTodayAvailable,
  calculateMonthProgress,
  // 配置加载函数
  loadSettings,
});

// 初始化任务模块
const tasksHangUp = createTasksHangUp(createTaskDeps());
const {
  claimHangUpRewards,
  batchAddHangUpTime,
  batchStudy,
  batchclubsign,
  batchWarGuessCheer,
} = tasksHangUp;

const tasksBottle = createTasksBottle(createTaskDeps());
const { resetBottles, batchlingguanzi } = tasksBottle;

const tasksTower = createTasksTower(createTaskDeps());
const {
  climbTower,
  climbWeirdTower,
  batchClaimFreeEnergy,
  skinChallenge,
  batchUseItems,
  batchMergeItems,
} = tasksTower;

const tasksItem = createTasksItem(createTaskDeps());
const {
  batchOpenBox,
  batchOpenBoxByPoints,
  batchClaimBoxPointReward,
  batchFish,
  batchRecruit,
  batchHeroUpgrade,
  batchBookUpgrade,
  batchClaimStarRewards,
  batchClaimPeachTasks,
  batchGenieSweep,
} = tasksItem;

const tasksDungeon = createTasksDungeon(createTaskDeps());
const { batchmengjing, batchBuyDreamItems } = tasksDungeon;

const tasksArena = createTasksArena(createTaskDeps());
const { batcharenafight, batchTopUpFish, batchTopUpArena } = tasksArena;

const tasksStore = createTasksStore(createTaskDeps());
const {
  legion_storebuygoods,
  legionStoreBuySkinCoins,
  store_purchase,
  collection_claimfreereward,
} = tasksStore;

const tasksLegacy = createTasksLegacy(createTaskDeps());
const { batchLegacyClaim, batchLegacyGiftSendEnhanced } = tasksLegacy;

const batchFunctionActions = {
  claimHangUpRewards,
  batchAddHangUpTime,
  resetBottles,
  batchlingguanzi,
  batchclubsign,
  batchStudy,
  batcharenafight,
  storePurchase: store_purchase,
  claimCollectionReward: collection_claimfreereward,
  batchGenieSweep,
  climbTower,
  batchmengjing,
  skinChallenge,
  claimPeachTasks: batchClaimPeachTasks,
  buyDreamItems: batchBuyDreamItems,
  climbWeirdTower,
  useWeirdTowerItems: batchUseItems,
  mergeWeirdTowerItems: batchMergeItems,
  claimWeirdTowerEnergy: batchClaimFreeEnergy,
  openBoxes: () => openHelperModal("box"),
  openPointBoxes: () => openHelperModal("pointsBox"),
  claimBoxPointReward: batchClaimBoxPointReward,
  fish: () => openHelperModal("fish"),
  recruit: () => openHelperModal("recruit"),
  heroUpgrade: batchHeroUpgrade,
  bookUpgrade: batchBookUpgrade,
  claimStarRewards: batchClaimStarRewards,
  buyHolyBeastItems: legion_storebuygoods,
  buySkinCoins: legionStoreBuySkinCoins,
  claimLegacy: batchLegacyClaim,
  openLegacyGift: () => {
    showLegacyGiftModal.value = true;
  },
  topUpFish: batchTopUpFish,
  topUpArena: batchTopUpArena,
  openWarGuess: openWarGuessModal,
};

const handleBatchFunctionAction = (action) => {
  batchFunctionActions[action]?.();
};

const getScheduledTaskFunction = (taskName) => {
  const taskRegistry = {
    startBatch,
    claimHangUpRewards,
    batchAddHangUpTime,
    batchStudy,
    batchclubsign,
    batchWarGuessCheer,
    resetBottles,
    batchlingguanzi,
    climbTower,
    climbWeirdTower,
    batchClaimFreeEnergy,
    skinChallenge,
    batchUseItems,
    batchMergeItems,
    batchOpenBox,
    batchOpenBoxByPoints,
    batchClaimBoxPointReward,
    batchFish,
    batchRecruit,
    batchHeroUpgrade,
    batchBookUpgrade,
    batchClaimStarRewards,
    batchClaimPeachTasks,
    batchGenieSweep,
    batchmengjing,
    batchBuyDreamItems,
    batcharenafight,
    batchTopUpFish,
    batchTopUpArena,
    legion_storebuygoods,
    legionStoreBuySkinCoins,
    store_purchase,
    collection_claimfreereward,
    batchLegacyClaim,
    batchLegacyGiftSendEnhanced,
  };

  return taskRegistry[taskName];
};

const startBatch = async () => {
  if (selectedTokens.value.length === 0)
    return;

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  // 并行执行任务，但通过connectionQueue限制并发连接数
  const taskPromises = selectedTokens.value.map(async (tokenId) => {
    if (shouldStop.value)
      return;

    tokenStatus.value[tokenId] = "running";

    let retryCount = 0;
    const MAX_RETRIES = 1;
    let success = false;

    while (retryCount <= MAX_RETRIES && !success) {
      if (shouldStop.value)
        break;

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        if (retryCount === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始执行: ${token.name} ===`,
            type: "info",
          });
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 尝试重试: ${token.name} (第${retryCount}次) ===`,
            type: "info",
          });
        }

        await ensureConnection(tokenId);

        // Create runner with delay settings
        const runner = new DailyTaskRunner(tokenStore, {
          commandDelay: batchSettings.commandDelay,
          taskDelay: batchSettings.taskDelay,
        });

        // Run tasks
        await runner.run(tokenId, {
          onLog: (log) => addLog(log),
          onProgress: () => {
            // 每个token维护自己的进度
          },
        });

        success = true;
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 执行完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        if (retryCount < MAX_RETRIES && !shouldStop.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行出错: ${error.message}，等待3秒后重试...`,
            type: "warning",
          });
          // Wait for potential token refresh in store
          await new Promise((r) => setTimeout(r, 3000));
          retryCount++;
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行失败: ${error.message}`,
            type: "error",
          });
        }
      } finally {
        // 完成后关闭连接并释放槽位
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    }
  });

  // 等待所有任务完成
  await Promise.all(taskPromises);

  // 等待所有任务完成后再继续
  await new Promise((r) => setTimeout(r, 1000));

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量任务执行结束");
};

const stopBatch = () => {
  shouldStop.value = true;
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "正在停止...",
    type: "warning",
  });
};
</script>

<style scoped>
.batch-tool-button {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  place-items: center;
  color: var(--on-surface-variant);
  border-radius: var(--radius);
  transition:
    color 160ms ease,
    background 160ms ease;
}

.batch-tool-button:hover {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}

@media (max-width: 768px) {
  .batch-tool-button {
    flex-basis: 34px;
    width: 34px;
    height: 34px;
  }
}
</style>
