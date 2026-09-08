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
        <div
          class="flex h-[38px] items-center gap-1 rounded-md border border-border bg-background p-1"
        >
          <button
            class="flex h-full items-center gap-2 whitespace-nowrap rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_88%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 max-md:px-3"
            type="button"
            :disabled="isRunning || selectedTokens.length === 0"
            @click="startBatch"
          >
            <Play class="h-4 w-4"></Play>
            {{ isRunning ? "执行中..." : "开始执行" }}
          </button>
          <button
            aria-label="日常模板"
            class="flex h-full items-center gap-2 whitespace-nowrap rounded-sm px-3 text-sm font-semibold transition-colors hover:bg-muted"
            type="button"
            @click="showTemplateManagerModal = true"
          >
            <DocumentTextOutline class="h-4 w-4"></DocumentTextOutline>
            日常模板
          </button>
          <button
            class="flex h-full items-center gap-2 whitespace-nowrap rounded-sm px-4 text-sm font-semibold text-error transition-colors hover:bg-[color-mix(in_srgb,var(--error)_10%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 max-md:px-3"
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
        <button
          aria-label="定时任务"
          class="flex h-[38px] shrink-0 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
          type="button"
          @click="schedulerManagerRef?.openList()"
        >
          <CalendarOutline class="h-4 w-4"></CalendarOutline>
          定时任务
        </button>
        <div
          class="flex h-[38px] items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1"
          data-testid="batch-tool-cluster"
        >
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
            aria-label="运行设置"
            class="batch-tool-button"
            title="运行设置"
            type="button"
            @click="openBatchSettings"
          >
            <Settings class="h-5 w-5"></Settings>
          </button>
        </div>
        <button
          class="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted"
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
          v-model:selected-tokens="selectedTokens"
          :groups="tokenGroups"
          :is-opening-games="isOpeningGames"
          :is-running="isRunning"
          :selected-groups="selectedGroups"
          :sort-config="sortConfig"
          :sort-options="batchSortOptions"
          :template-names="accountTemplateNames"
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
      account-mode
      show-black-market-config
      :black-market-config="blackMarketConfig"
      :black-market-error="blackMarketError"
      :black-market-loading="blackMarketLoading"
      :boss-times-options="bossTimesOptions"
      :formation-options="formationOptions"
      :model-value="currentSettings"
      :open="showSettingsModal && !showTemplateManagerModal"
      :saving="blackMarketSaving"
      :templates="taskTemplates"
      :title="`账号执行配置 - ${currentSettingsTokenName}`"
      @retry-black-market="loadCurrentBlackMarketConfig"
      @save="saveSettings"
      @update:black-market-config="blackMarketConfig = $event"
      @update:model-value="Object.assign(currentSettings, $event)"
      @update:open="showSettingsModal = $event"
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

    <BatchRuntimeSettingsDialog
      :model-value="batchSettings"
      :open="showBatchSettingsModal"
      @save="saveBatchSettings"
      @update:model-value="Object.assign(batchSettings, $event)"
      @update:open="showBatchSettingsModal = $event"
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
  reactive,
  ref,
  watch,
} from "vue";
import {
  batchSelectedTokenIds,
  tokenGroups,
  useTokenStore,
} from "@/stores/tokenStore";
import { useAppMessage } from "@/composables/useAppMessage";
import { useBatchActivityAvailability } from "@/composables/useBatchActivityAvailability";
import { useBatchBlackMarketConfig } from "@/composables/useBatchBlackMarketConfig";
import { useBatchConfigTransfer } from "@/composables/useBatchConfigTransfer";
import { useBatchDailyRunner } from "@/composables/useBatchDailyRunner";
import { useBatchGameLauncher } from "@/composables/useBatchGameLauncher";
import { useBatchRecipientLookup } from "@/composables/useBatchRecipientLookup";
import { useBatchRuntimeSettings } from "@/composables/useBatchRuntimeSettings";
import { useBatchScheduler } from "@/composables/useBatchScheduler";
import { useBatchScheduledTaskExecution } from "@/composables/useBatchScheduledTaskExecution";
import { useBatchTaskModules } from "@/composables/useBatchTaskModules";
import { useBatchTokenSort } from "@/composables/useBatchTokenSort";
import { useBatchWarGuess } from "@/composables/useBatchWarGuess";
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
import { loadAccountTaskBinding, loadTaskTemplates, migrateTaskAccounts, resolveAccountTaskSettings, saveAccountTaskBinding, SYSTEM_TEMPLATE_ID } from "@/utils/taskTemplateConfig";
import BatchRuntimeSettingsDialog from "@/components/Batch/BatchRuntimeSettingsDialog.vue";
import BatchSchedulerManager from "@/components/Batch/BatchSchedulerManager.vue";
import BatchTaskSettingsDialog from "@/components/Batch/BatchTaskSettingsDialog.vue";
import BatchTemplateManager from "@/components/Batch/BatchTemplateManager.vue";
import BatchWarGuessDialog from "@/components/Batch/BatchWarGuessDialog.vue";
import {
  CalendarDays as CalendarOutline,
  Download as CloudDownloadOutline,
  Upload as CloudUploadOutline,
  FileText as DocumentTextOutline,
  Play,
  Settings,
  Square as Stop,
  Terminal as TerminalOutline,
} from "@lucide/vue";
import { DEFAULT_WEIRD_TOWER_MAX_CLIMB } from "@/utils/towerClimbLimit.js";

// Import batch task modules
import {
  bossTimesOptions,
  // Constants
  boxTypeOptions,
  calculateMonthProgress,
  createConnectionManager,
  fishTypeOptions,
  formationOptions,
  getTodayStartSec,
  isTodayAvailable,
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

const {
  fetchWarGuessRank,
  handleWarGuessCheer,
  openWarGuessModal,
  selectedWarGuessLegionId,
  showWarGuessModal,
  warGuessCoin,
  warGuessList,
  warGuessLoading,
} = useBatchWarGuess({
  addLog: (entry) => addLog(entry),
  cheer: (legionId, coin) => batchWarGuessCheer(legionId, coin),
  message,
  selectedTokens,
  tokenStore,
  tokens,
});

// Settings Modal State
const showSettingsModal = ref(false);
const currentSettingsTokenId = ref(null);
const currentSettingsTokenName = ref("");
const currentSettings = reactive({
  templateId: SYSTEM_TEMPLATE_ID,
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
  freeGachaEnable: true,
  dreamPurchaseList: null,
});

const showTemplateManagerModal = ref(false);
const taskTemplates = ref([]);
const accountTemplateNames = ref({});
const refreshTemplateBindings = () => {
  try {
    migrateTaskAccounts(tokens.value);
    taskTemplates.value = loadTaskTemplates();
    accountTemplateNames.value = Object.fromEntries(tokens.value.map((token) => {
      const binding = loadAccountTaskBinding(token.id);
      return [token.id, taskTemplates.value.find((item) => item.id === binding.templateId)?.name || "模板缺失"];
    }));
  } catch (error) {
    message.error(`模板配置读取失败：${error.message}`);
  }
};
watch(() => tokens.value.map((token) => token.id).join(","), refreshTemplateBindings, { immediate: true });
watch(showTemplateManagerModal, (open) => {
  if (!open)
    refreshTemplateBindings();
});
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
    message.success("运行设置已保存");
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

// 注: boxTypeOptions, fishTypeOptions 已从 @/utils/batch 导入

const openHelperModal = (type) => {
  helperType.value = type;
  showHelperModal.value = true;
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

// 注: formationOptions, bossTimesOptions 已从 @/utils/batch 导入

const loadSettings = (tokenId) => {
  try {
    return resolveAccountTaskSettings(tokenId);
  } catch (error) {
    console.error("Failed to load settings:", error);
    throw error;
  }
};

const {
  blackMarketConfig,
  blackMarketError,
  blackMarketLoading,
  blackMarketSaving,
  loadBlackMarketConfig,
  resetBlackMarketConfig,
  saveBlackMarketConfig,
} = useBatchBlackMarketConfig({
  ensureConnection: (tokenId) => ensureConnection(tokenId),
  releaseConnectionSlot: () => releaseConnectionSlot(),
  tokenStore,
});

const loadCurrentBlackMarketConfig = () => {
  if (currentSettingsTokenId.value)
    void loadBlackMarketConfig(currentSettingsTokenId.value);
};

const openSettings = (token) => {
  currentSettingsTokenId.value = token.id;
  currentSettingsTokenName.value = token.name;
  refreshTemplateBindings();
  const saved = loadAccountTaskBinding(token.id);
  Object.assign(currentSettings, saved);
  resetBlackMarketConfig();
  showSettingsModal.value = true;
  void loadBlackMarketConfig(token.id);
};

const saveSettings = async () => {
  const tokenId = currentSettingsTokenId.value;
  if (!tokenId || blackMarketSaving.value)
    return;

  try {
    await saveBlackMarketConfig(tokenId);
    saveAccountTaskBinding(tokenId, { templateId: currentSettings.templateId, dreamPurchaseList: currentSettings.dreamPurchaseList });
    refreshTemplateBindings();
    message.success(`已保存 ${currentSettingsTokenName.value} 的设置`);
    showSettingsModal.value = false;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    message.error(`保存黑市采购配置失败：${reason}`);
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

const connectionManager = createConnectionManager({
  tokenStore,
  batchSettings,
  addLog,
});
const { connectionQueue, releaseConnectionSlot } = connectionManager;
const ensureConnection = (tokenId, maxRetries = 2) =>
  connectionManager.ensureConnection(tokenId, tokens.value, maxRetries);

const { startBatch, stopBatch } = useBatchDailyRunner({
  addLog,
  batchSettings,
  connectionQueue,
  currentRunningTokenId,
  ensureConnection,
  isRunning,
  message,
  releaseConnectionSlot,
  selectedTokens,
  shouldStop,
  tokenStatus,
  tokenStore,
  tokens,
});

const {
  executeScheduledTask,
  executingTaskIds,
  manualExecuteTask,
} = useBatchScheduledTaskExecution({
  addLog,
  arenaActivityOpen: isarenaActivityOpen,
  dreamActivityOpen: ismengjingActivityOpen,
  getTaskFunction: (taskName) => getScheduledTaskFunction(taskName),
  isRunning,
  message,
  selectedTokens,
  shouldStop,
  tokenStore,
  tokens,
  weirdTowerActivityOpen: isWeirdTowerActivityOpen,
});

const { taskCountdowns } = useBatchScheduler({
  addLog,
  batchSettings,
  executeScheduledTask,
  isRunning,
  scheduledTasks,
});

const {
  clearRecipientError,
  isQueryingRecipient,
  queryRecipientInfo,
  recipientIdError,
  recipientIdInput,
  recipientInfo,
} = useBatchRecipientLookup({
  selectedTokens,
  tokens,
  tokenStore,
  ensureConnection,
  releaseConnectionSlot,
  addLog,
  message,
});

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
const taskModules = useBatchTaskModules({
  createTaskDeps,
  openHelperModal,
  openLegacyGift: () => {
    showLegacyGiftModal.value = true;
  },
  openWarGuessModal,
});
const {
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
  batchUseGenieTickets,
  batchFreeGacha,
  batchUseGachaCoins,
  legion_storebuygoods,
  legionStoreBuySkinCoins,
  store_purchase,
  collection_claimfreereward,
  batchLegacyClaim,
  batchLegacyGiftSendEnhanced,
  batchmengjing,
  batchBuyDreamItems,
  batcharenafight,
  batchTopUpFish,
  batchTopUpArena,
} = taskModules;

const { batchFunctionActions } = taskModules;

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
    batchUseGenieTickets,
    batchFreeGacha,
    batchUseGachaCoins,
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
</script>

<style scoped>
.batch-tool-button {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 100%;
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
  }
}
</style>
