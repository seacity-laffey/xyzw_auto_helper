<template>
  <div class="game-player">
    <header class="game-toolbar">
      <button class="toolbar-button" type="button" @click="goBack">
        <ArrowBackOutline></ArrowBackOutline>
        <span>返回</span>
      </button>

      <div class="game-summary">
        <strong>游戏窗口</strong>
        <span>{{ gameIds.length }} 个账号</span>
      </div>

      <div class="toolbar-actions">
        <button
          class="toolbar-button"
          type="button"
          :aria-expanded="binManagerOpen"
          :class="{ 'toolbar-button-active': binManagerOpen }"
          @click="toggleBinManager"
        >
          <LogInOutline></LogInOutline>
          <span>上号器</span>
        </button>
        <button
          v-if="gameIds.length > 1"
          class="toolbar-button"
          type="button"
          :aria-pressed="syncEnabled"
          :class="{ 'toolbar-button-active': syncEnabled }"
          @click="toggleInputSync"
        >
          <SyncOutline></SyncOutline>
          <span>{{ syncEnabled ? "同步已开启" : "同步操作" }}</span>
        </button>
        <button
          class="toolbar-button"
          type="button"
          :class="{ 'toolbar-button-active': observerOpen }"
          @click="toggleObserver"
        >
          <PulseOutline></PulseOutline>
          <span>协议观察器</span>
          <span v-if="observing" class="recording-dot"></span>
        </button>
        <button
          v-if="focusedId"
          class="toolbar-button"
          type="button"
          @click="focusedId = null"
        >
          查看全部
        </button>
      </div>
    </header>

    <aside v-if="observerOpen" class="observer-panel">
      <header class="observer-header">
        <div class="observer-heading">
          <strong>协议观察器</strong>
          <span>{{ observing ? "正在记录" : "已停止" }} ·
            {{ protocolEntries.length }} 条</span>
        </div>
        <div class="observer-actions">
          <button
            v-if="!observing"
            class="observer-action primary-action"
            title="开始记录"
            type="button"
            @click="startObservation"
          >
            <PlayOutline></PlayOutline>
          </button>
          <button
            v-else
            class="observer-action danger-action"
            title="停止记录"
            type="button"
            @click="stopObservation"
          >
            <StopOutline></StopOutline>
          </button>
          <button
            class="observer-action"
            title="清空记录"
            type="button"
            @click="clearObservation"
          >
            <TrashOutline></TrashOutline>
          </button>
          <button
            class="observer-action"
            title="导出 JSON"
            type="button"
            :disabled="protocolEntries.length === 0"
            @click="exportObservation"
          >
            <DownloadOutline></DownloadOutline>
          </button>
          <button
            class="observer-action"
            title="关闭面板"
            type="button"
            @click="observerOpen = false"
          >
            <CloseOutline></CloseOutline>
          </button>
        </div>
      </header>

      <div aria-label="协议类型" class="observer-filters" role="tablist">
        <button
          v-for="filter in observerFilters"
          :key="filter.value"
          type="button"
          :class="{ active: observerFilter === filter.value }"
          @click="observerFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>

      <div class="observer-content">
        <div aria-label="协议记录" class="observer-list">
          <button
            v-for="entry in filteredProtocolEntries"
            :key="entry.id"
            class="observer-entry"
            type="button"
            :class="{ selected: selectedEntryId === entry.id }"
            @click="selectedEntryId = entry.id"
          >
            <span
              class="entry-direction"
              :class="`direction-${entry.direction}`"
            >
              {{ getDirectionLabel(entry.direction) }}
            </span>
            <span class="entry-summary">
              <strong>{{ getEntryTitle(entry) }}</strong>
              <small>{{ getEntryMeta(entry) }}</small>
            </span>
            <span class="entry-size">{{
              formatBytes(entry.payload?.byteLength)
            }}</span>
          </button>
          <div
            v-if="filteredProtocolEntries.length === 0"
            class="observer-empty"
          >
            {{ observing ? "等待游戏请求" : "点击开始后操作游戏" }}
          </div>
        </div>

        <section v-if="selectedEntry" class="observer-detail">
          <header>
            <strong>消息详情</strong>
            <button
              class="observer-action"
              title="复制当前消息"
              type="button"
              @click="copySelectedEntry"
            >
              <CopyOutline></CopyOutline>
            </button>
          </header>
          <pre>{{ selectedEntryText }}</pre>
        </section>
      </div>
    </aside>

    <aside v-if="binManagerOpen" class="bin-manager-panel">
      <header class="observer-header">
        <div class="observer-heading">
          <strong>上号器</strong>
          <span>{{ binEntries.length }} 个本机 BIN</span>
        </div>
        <button
          aria-label="关闭上号器"
          class="observer-action"
          title="关闭上号器"
          type="button"
          @click="binManagerOpen = false"
        >
          <CloseOutline></CloseOutline>
        </button>
      </header>

      <div class="bin-manager-content">
        <label class="bin-target-field">
          <span>目标窗口</span>
          <select v-model="binManagerTargetId">
            <option v-for="tokenId in gameIds" :key="tokenId" :value="tokenId">
              {{ getGameName(tokenId) }}
            </option>
          </select>
        </label>

        <div class="bin-manager-actions">
          <button type="button" @click="runBinToolAction('loadBtn')">
            <CloudUploadOutline></CloudUploadOutline>
            导入 BIN
          </button>
          <button type="button" @click="reloadBinTarget">
            <RefreshOutline></RefreshOutline>
            刷新窗口
          </button>
          <button
            class="danger-action"
            type="button"
            @click="runBinToolAction('clearBtn')"
          >
            <TrashOutline></TrashOutline>
            清空 BIN
          </button>
        </div>

        <p v-if="binManagerStatus" class="bin-manager-status">
          {{ binManagerStatus }}
        </p>

        <div class="bin-entry-list">
          <div v-for="entry in binEntries" :key="entry.id" class="bin-entry">
            <div>
              <strong>{{ entry.name || entry.id }}</strong>
              <small>{{ formatBinEntrySize(entry) }}</small>
            </div>
            <span v-if="entry.id === binManagerTargetId">当前窗口</span>
          </div>
          <div v-if="!binEntries.length" class="observer-empty">
            暂无本机 BIN
          </div>
        </div>
      </div>
    </aside>

    <main
      v-if="gameIds.length > 0"
      class="game-grid"
      :class="{ 'focused-grid': focusedId || gameIds.length === 1 }"
    >
      <section
        v-for="tokenId in gameIds"
        :key="tokenId"
        class="game-window"
        :class="{
          'game-window-hidden': focusedId && focusedId !== tokenId,
          'sync-master-window': syncEnabled && syncMasterId === tokenId,
        }"
      >
        <header class="game-window-header">
          <div class="game-window-title" :title="getGameName(tokenId)">
            <span class="game-status-dot"></span>
            <strong>{{ getGameName(tokenId) }}</strong>
            <span
              v-if="syncEnabled && syncMasterId === tokenId"
              class="sync-master-label"
            >主控</span>
          </div>
          <div class="game-window-actions">
            <button
              v-if="syncEnabled && gameIds.length > 1"
              class="window-action"
              type="button"
              :aria-label="
                syncMasterId === tokenId
                  ? '当前主控窗口'
                  : `设为主控：${getGameName(tokenId)}`
              "
              :class="{ 'window-action-active': syncMasterId === tokenId }"
              :disabled="syncMasterId === tokenId"
              :title="
                syncMasterId === tokenId ? '当前主控窗口' : '设为主控窗口'
              "
              @click="setSyncMaster(tokenId)"
            >
              <SyncOutline></SyncOutline>
            </button>
            <button
              v-if="gameIds.length > 1 && !syncEnabled"
              class="window-action"
              type="button"
              :aria-label="
                focusedId === tokenId ? '查看全部窗口' : '聚焦此窗口'
              "
              :title="focusedId === tokenId ? '查看全部窗口' : '聚焦此窗口'"
              @click="toggleFocus(tokenId)"
            >
              <ExpandOutline></ExpandOutline>
            </button>
            <button
              class="window-action"
              title="关闭此窗口"
              type="button"
              :aria-label="`关闭${getGameName(tokenId)}`"
              @click="closeGame(tokenId)"
            >
              <CloseOutline></CloseOutline>
            </button>
          </div>
        </header>
        <iframe
          :ref="(element) => setGameFrame(tokenId, element)"
          allow="fullscreen; autoplay"
          class="game-iframe"
          :src="getGameSource(tokenId)"
          :title="`${getGameName(tokenId)}游戏窗口`"
        ></iframe>
      </section>
    </main>

    <div v-else class="empty-state">
      <span>没有可打开的游戏账号</span>
      <button class="toolbar-button" type="button" @click="goBack">返回</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowBackOutline,
  CloseOutline,
  CopyOutline,
  DownloadOutline,
  ExpandOutline,
  LogInOutline,
  PlayOutline,
  PulseOutline,
  RefreshOutline,
  StopOutline,
  SyncOutline,
  TrashOutline,
} from "@vicons/ionicons5";
import { useTokenStore } from "@/stores/tokenStore";
import { g_utils } from "@/utils/bonProtocol";
import {
  buildEmbeddedGameLocation,
  buildEmbeddedGameSource,
  normalizeEmbeddedGameIds,
} from "@/utils/embeddedGameRoute.js";
import {
  createProtocolObserverExport,
  decodeProtocolObserverEntry,
  PROTOCOL_OBSERVER_CONTROL_SOURCE,
  PROTOCOL_OBSERVER_MAX_ENTRIES,
  PROTOCOL_OBSERVER_MESSAGE_SOURCE,
} from "@/utils/protocolObserver.js";
import {
  createGameInputControl,
  createGameInputDispatch,
  GAME_INPUT_SYNC_EVENT_TYPE,
  GAME_INPUT_SYNC_MESSAGE_SOURCE,
} from "@/utils/gameInputSync.js";

const route = useRoute();
const router = useRouter();
const tokenStore = useTokenStore();
const focusedId = ref(null);
const observerOpen = ref(false);
const observing = ref(false);
const observerFilter = ref("all");
const protocolEntries = ref([]);
const selectedEntryId = ref(null);
const captureStartedAt = ref(null);
const binManagerOpen = ref(false);
const binManagerTargetId = ref(null);
const binManagerStatus = ref("");
const binEntries = ref([]);
const syncEnabled = ref(false);
const syncMasterId = ref(null);
const gameFrames = new Map();

const observerFilters = [
  { label: "全部", value: "all" },
  { label: "WebSocket", value: "ws" },
  { label: "HTTP", value: "http" },
];

const sourcePage = computed(() => {
  const value = route.query.from;
  return Array.isArray(value) ? value[0] : value;
});

const gameIds = computed(() =>
  normalizeEmbeddedGameIds(
    route.query.bin_id,
    tokenStore.selectedToken?.id || localStorage.getItem("current_bin_id"),
  ),
);

const getGameName = (tokenId) => {
  const token = tokenStore.gameTokens.find((item) => item.id === tokenId);
  return token?.name || `账号 ${tokenId}`;
};

const getGameSource = (tokenId) =>
  buildEmbeddedGameSource(import.meta.env.BASE_URL, tokenId);

const loadBinEntries = () => {
  try {
    const value = JSON.parse(localStorage.getItem("bin_file_list") || "[]");
    binEntries.value = Array.isArray(value) ? value : [];
  } catch {
    binEntries.value = [];
  }
};

const toggleBinManager = () => {
  binManagerOpen.value = !binManagerOpen.value;
  if (!binManagerOpen.value)
    return;
  observerOpen.value = false;
  if (!gameIds.value.includes(binManagerTargetId.value)) {
    binManagerTargetId.value
      = syncMasterId.value || focusedId.value || gameIds.value[0] || null;
  }
  binManagerStatus.value = "";
  loadBinEntries();
};

const toggleObserver = () => {
  observerOpen.value = !observerOpen.value;
  if (observerOpen.value)
    binManagerOpen.value = false;
};

const runBinToolAction = (buttonId) => {
  const frame = gameFrames.get(binManagerTargetId.value);
  const button = frame?.contentDocument?.getElementById(buttonId);
  if (!button) {
    binManagerStatus.value = "目标窗口的上号器尚未加载";
    return;
  }
  button.click();
  binManagerStatus.value
    = buttonId === "loadBtn" ? "已打开文件选择" : "已提交清空操作";
  window.setTimeout(loadBinEntries, 500);
};

const reloadBinTarget = () => {
  const frame = gameFrames.get(binManagerTargetId.value);
  if (!frame?.contentWindow) {
    binManagerStatus.value = "目标窗口尚未加载";
    return;
  }
  frame.contentWindow.location.reload();
  binManagerStatus.value = "目标窗口正在刷新";
};

const handleBinStorageChange = (event) => {
  if (event.key === "bin_file_list" || event.key?.startsWith("bin_data_"))
    loadBinEntries();
};

const filteredProtocolEntries = computed(() => {
  if (observerFilter.value === "ws") {
    return protocolEntries.value.filter((entry) => entry.transport === "ws");
  }
  if (observerFilter.value === "http") {
    return protocolEntries.value.filter((entry) => entry.transport !== "ws");
  }
  return protocolEntries.value;
});

const selectedEntry = computed(() =>
  protocolEntries.value.find((entry) => entry.id === selectedEntryId.value),
);

const selectedEntryText = computed(() =>
  selectedEntry.value ? JSON.stringify(selectedEntry.value, null, 2) : "",
);

const setGameFrame = (tokenId, element) => {
  if (element)
    gameFrames.set(tokenId, element);
  else gameFrames.delete(tokenId);
};

const sendObserverControl = (action, targetFrame) => {
  const message = {
    source: PROTOCOL_OBSERVER_CONTROL_SOURCE,
    type: "protocol-observer-control",
    action,
  };
  if (targetFrame) {
    targetFrame.contentWindow?.postMessage(message, window.location.origin);
    return;
  }
  gameFrames.forEach((frame) => {
    frame.contentWindow?.postMessage(message, window.location.origin);
  });
};

const sendInputSyncControl = (targetFrame) => {
  const message = createGameInputControl(syncEnabled.value, syncMasterId.value);
  if (targetFrame) {
    targetFrame.contentWindow?.postMessage(message, window.location.origin);
    return;
  }
  gameFrames.forEach((frame) => {
    frame.contentWindow?.postMessage(message, window.location.origin);
  });
};

const toggleInputSync = () => {
  syncEnabled.value = !syncEnabled.value;
  if (syncEnabled.value && !gameIds.value.includes(syncMasterId.value)) {
    syncMasterId.value = gameIds.value[0] || null;
  }
  if (syncEnabled.value)
    focusedId.value = null;
  sendInputSyncControl();
};

const setSyncMaster = (tokenId) => {
  if (!gameIds.value.includes(tokenId))
    return;
  syncMasterId.value = tokenId;
  if (binManagerOpen.value)
    binManagerTargetId.value = tokenId;
  sendInputSyncControl();
};

const startObservation = () => {
  observing.value = true;
  captureStartedAt.value = new Date();
  sendObserverControl("start");
};

const stopObservation = () => {
  observing.value = false;
  sendObserverControl("stop");
};

const clearObservation = () => {
  protocolEntries.value = [];
  selectedEntryId.value = null;
  captureStartedAt.value = observing.value ? new Date() : null;
};

const exportObservation = () => {
  const data = createProtocolObserverExport(
    protocolEntries.value,
    captureStartedAt.value,
  );
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `xyzw-protocol-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const copySelectedEntry = async () => {
  if (!selectedEntryText.value)
    return;
  await navigator.clipboard.writeText(selectedEntryText.value);
};

const handleGameMessage = (event) => {
  if (event.origin !== window.location.origin)
    return;
  const message = event.data;
  if (
    !message
    || ![
      PROTOCOL_OBSERVER_MESSAGE_SOURCE,
      GAME_INPUT_SYNC_MESSAGE_SOURCE,
    ].includes(message.source)
  ) {
    return;
  }

  const messageTokenId = String(message.binId);
  const frame = gameFrames.get(messageTokenId);
  if (!frame || frame.contentWindow !== event.source)
    return;
  if (message.type === "protocol-observer-ready") {
    if (observing.value)
      sendObserverControl("start", frame);
    sendInputSyncControl(frame);
    return;
  }
  if (message.type === GAME_INPUT_SYNC_EVENT_TYPE) {
    if (!syncEnabled.value || messageTokenId !== syncMasterId.value)
      return;
    const dispatchMessage = createGameInputDispatch(message.input);
    if (!dispatchMessage)
      return;
    gameFrames.forEach((targetFrame, tokenId) => {
      if (tokenId !== syncMasterId.value) {
        targetFrame.contentWindow?.postMessage(
          dispatchMessage,
          window.location.origin,
        );
      }
    });
    return;
  }
  if (!observing.value)
    return;
  if (message.type !== "protocol-observer-entry" || !message.entry)
    return;

  const entry = decodeProtocolObserverEntry(
    {
      ...message.entry,
      tokenId: String(message.binId),
      accountName: getGameName(String(message.binId)),
    },
    g_utils.parse,
  );
  protocolEntries.value.push(entry);
  if (protocolEntries.value.length > PROTOCOL_OBSERVER_MAX_ENTRIES) {
    protocolEntries.value.splice(
      0,
      protocolEntries.value.length - PROTOCOL_OBSERVER_MAX_ENTRIES,
    );
  }
};

const getDirectionLabel = (direction) =>
  ({
    in: "IN",
    out: "OUT",
    event: "EVT",
  })[direction] || "-";

const getEntryPath = (url) => {
  if (!url)
    return "";
  try {
    return new URL(url, window.location.href).pathname;
  } catch {
    return String(url);
  }
};

const getEntryTitle = (entry) =>
  entry.decoded?.cmd
  || entry.event
  || `${entry.method || ""} ${getEntryPath(entry.url)}`.trim()
  || entry.transport.toUpperCase();

const getEntryMeta = (entry) => {
  const time = new Date(entry.timestamp).toLocaleTimeString("zh-CN", {
    hour12: false,
  });
  const status = entry.status ? ` · ${entry.status}` : "";
  return `${entry.accountName} · ${entry.transport.toUpperCase()} · ${time}${status}`;
};

const formatBytes = (value = 0) => {
  if (value < 1024)
    return `${value} B`;
  if (value < 1024 * 1024)
    return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const formatBinEntrySize = (entry) => {
  if (typeof entry.size === "string" && /[a-z]/i.test(entry.size))
    return entry.size;
  return formatBytes(entry.byteLength || Number(entry.size) || 0);
};

const toggleFocus = (tokenId) => {
  if (syncEnabled.value) {
    setSyncMaster(tokenId);
    return;
  }
  focusedId.value = focusedId.value === tokenId ? null : tokenId;
};

const closeGame = (tokenId) => {
  const remainingIds = gameIds.value.filter((id) => id !== tokenId);
  if (focusedId.value === tokenId) {
    focusedId.value = null;
  }
  if (syncMasterId.value === tokenId) {
    syncMasterId.value = remainingIds[0] || null;
    sendInputSyncControl();
  }
  if (binManagerTargetId.value === tokenId)
    binManagerTargetId.value = remainingIds[0] || null;
  if (remainingIds.length === 0) {
    goBack();
    return;
  }
  router.replace(buildEmbeddedGameLocation(remainingIds, sourcePage.value));
};

function goBack() {
  const returnPaths = {
    batch: "/batch-tasks",
    role: "/role",
    tokens: "/tokens",
    dashboard: "/role",
  };
  router.push(returnPaths[sourcePage.value] || "/role");
}

watch(gameIds, (ids) => {
  if (ids.length < 2) {
    syncEnabled.value = false;
  }
  if (!ids.includes(syncMasterId.value)) {
    syncMasterId.value = ids[0] || null;
  }
  sendInputSyncControl();
});

onMounted(() => {
  window.addEventListener("message", handleGameMessage);
  window.addEventListener("storage", handleBinStorageChange);
});
onBeforeUnmount(() => {
  sendObserverControl("stop");
  syncEnabled.value = false;
  sendInputSyncControl();
  window.removeEventListener("message", handleGameMessage);
  window.removeEventListener("storage", handleBinStorageChange);
});
</script>

<style scoped>
.game-player {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  overflow: hidden;
  color: #f5f5f5;
  background: #101113;
}

.game-toolbar {
  z-index: 10;
  display: grid;
  min-height: 56px;
  flex: 0 0 56px;
  grid-template-columns: minmax(84px, 1fr) auto minmax(84px, 1fr);
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #1b1d20;
  border-bottom: 1px solid #303338;
}

.toolbar-button {
  display: inline-flex;
  width: fit-content;
  min-height: 36px;
  padding: 0 12px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #f5f5f5;
  font-size: 13px;
  font-weight: 600;
  background: #292c31;
  border: 1px solid #3a3e44;
  border-radius: 6px;
  cursor: pointer;
}

.toolbar-button:hover,
.window-action:hover {
  background: #383c42;
}

.toolbar-button svg,
.window-action svg {
  width: 17px;
  height: 17px;
}

.game-summary {
  display: grid;
  justify-items: center;
  gap: 1px;
  min-width: 0;
}

.game-summary strong {
  font-size: 14px;
}

.game-summary span {
  color: #a8adb5;
  font-size: 11px;
}

.toolbar-end,
.toolbar-spacer {
  justify-self: end;
}

.toolbar-actions {
  display: flex;
  min-width: 0;
  justify-self: end;
  gap: 6px;
}

.toolbar-button-active {
  background: #234536;
  border-color: #347a56;
}

.recording-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  background: #ff655f;
  border-radius: 50%;
}

.observer-panel {
  position: fixed;
  z-index: 30;
  top: 56px;
  right: 0;
  bottom: 0;
  display: flex;
  width: min(620px, 48vw);
  min-width: 420px;
  flex-direction: column;
  color: #e8eaed;
  background: #17191c;
  border-left: 1px solid #3a3e44;
  box-shadow: -8px 0 24px rgb(0 0 0 / 28%);
}

.bin-manager-panel {
  position: fixed;
  z-index: 31;
  top: 64px;
  right: 12px;
  display: flex;
  width: min(360px, calc(100vw - 24px));
  max-height: calc(100vh - 76px);
  flex-direction: column;
  overflow: hidden;
  color: #e8eaed;
  background: #17191c;
  border: 1px solid #3a3e44;
  border-radius: 6px;
  box-shadow: 0 10px 30px rgb(0 0 0 / 36%);
}

.bin-manager-content {
  display: grid;
  min-height: 0;
  gap: 12px;
  padding: 14px;
}

.bin-target-field {
  display: grid;
  gap: 6px;
  color: #aeb3ba;
  font-size: 11px;
}

.bin-target-field select {
  height: 34px;
  padding: 0 9px;
  color: #f5f5f5;
  background: #25282d;
  border: 1px solid #3a3e44;
  border-radius: 5px;
  font: inherit;
}

.bin-manager-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.bin-manager-actions button {
  display: inline-flex;
  min-height: 32px;
  padding: 0 10px;
  align-items: center;
  gap: 6px;
  color: #e8eaed;
  background: #25282d;
  border: 1px solid #3a3e44;
  border-radius: 5px;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.bin-manager-actions button:hover {
  background: #34383e;
}

.bin-manager-actions button.danger-action {
  color: #ffaaa6;
  background: #4b2828;
  border-color: #8a4141;
}

.bin-manager-actions svg {
  width: 14px;
  height: 14px;
}

.bin-manager-status {
  margin: 0;
  color: #9ba1a9;
  font-size: 11px;
}

.bin-entry-list {
  min-height: 80px;
  overflow-y: auto;
  border-top: 1px solid #303338;
}

.bin-entry {
  display: flex;
  min-height: 48px;
  padding: 7px 2px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid #272a2e;
}

.bin-entry > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.bin-entry strong,
.bin-entry small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bin-entry strong {
  font-size: 12px;
}

.bin-entry small,
.bin-entry > span {
  color: #8e949c;
  font-size: 10px;
}

.observer-header {
  display: flex;
  min-height: 58px;
  padding: 8px 10px 8px 14px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #303338;
}

.observer-heading {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.observer-heading strong {
  font-size: 13px;
}

.observer-heading span {
  color: #9ba1a9;
  font-size: 11px;
}

.observer-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
}

.observer-action {
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  place-items: center;
  color: #d8dbe0;
  background: #25282d;
  border: 1px solid #3a3e44;
  border-radius: 5px;
  cursor: pointer;
}

.observer-action:hover:not(:disabled) {
  background: #34383e;
}

.observer-action:disabled {
  opacity: 0.4;
  cursor: default;
}

.observer-action svg {
  width: 16px;
  height: 16px;
}

.primary-action {
  color: #9ce0b6;
  background: #214332;
  border-color: #347a56;
}

.danger-action {
  color: #ffaaa6;
  background: #4b2828;
  border-color: #8a4141;
}

.observer-filters {
  display: flex;
  flex: 0 0 auto;
  padding: 8px 10px;
  gap: 1px;
  border-bottom: 1px solid #303338;
}

.observer-filters button {
  min-height: 28px;
  padding: 0 12px;
  color: #aeb3ba;
  font-size: 11px;
  background: #25282d;
  border: 0;
  cursor: pointer;
}

.observer-filters button:first-child {
  border-radius: 5px 0 0 5px;
}

.observer-filters button:last-child {
  border-radius: 0 5px 5px 0;
}

.observer-filters button.active {
  color: #fff;
  background: #49505a;
}

.observer-content {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-rows: minmax(180px, 1fr) minmax(180px, 0.85fr);
}

.observer-list {
  min-height: 0;
  overflow: auto;
  border-bottom: 1px solid #3a3e44;
}

.observer-entry {
  display: grid;
  width: 100%;
  min-height: 48px;
  padding: 6px 10px;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #272a2e;
  cursor: pointer;
}

.observer-entry:hover,
.observer-entry.selected {
  background: #272b30;
}

.observer-entry.selected {
  box-shadow: inset 3px 0 #55c982;
}

.entry-direction {
  font-size: 10px;
  font-weight: 700;
}

.direction-in {
  color: #f1a45c;
}

.direction-out {
  color: #68cf91;
}

.direction-event {
  color: #8db9ee;
}

.entry-summary {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.entry-summary strong,
.entry-summary small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-summary strong {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  font-weight: 600;
}

.entry-summary small,
.entry-size {
  color: #8e949c;
  font-size: 10px;
}

.observer-empty {
  display: grid;
  min-height: 140px;
  place-items: center;
  color: #858b93;
  font-size: 12px;
}

.observer-detail {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.observer-detail > header {
  display: flex;
  min-height: 42px;
  padding: 5px 10px 5px 14px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #303338;
}

.observer-detail > header strong {
  font-size: 12px;
}

.observer-detail pre {
  min-height: 0;
  flex: 1;
  margin: 0;
  padding: 12px 14px;
  overflow: auto;
  color: #d7dce2;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.game-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-auto-rows: calc(100vh - 72px);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 8px;
  padding: 8px;
  overflow: auto;
}

.game-grid.focused-grid {
  grid-template-columns: minmax(0, 1fr);
}

.game-window {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: #000;
  border: 1px solid #303338;
  border-radius: 6px;
}

.game-window-hidden {
  display: none;
}

.sync-master-window {
  border-color: #55c982;
  box-shadow: 0 0 0 1px #55c982;
}

.game-window-header {
  display: flex;
  min-height: 38px;
  flex: 0 0 38px;
  padding: 0 8px 0 12px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #202327;
  border-bottom: 1px solid #303338;
}

.game-window-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.game-window-title strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-master-label {
  padding: 2px 5px;
  color: #b8efcb;
  background: #214332;
  border: 1px solid #347a56;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
}

.game-status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  background: #55c982;
  border-radius: 50%;
}

.game-window-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
}

.window-action {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: #d8dbe0;
  background: transparent;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
}

.window-action-active {
  color: #9ce0b6;
  background: #214332;
}

.window-action:disabled {
  cursor: default;
  opacity: 1;
}

.game-iframe {
  width: 100%;
  min-height: 0;
  flex: 1;
  border: 0;
}

.empty-state {
  display: grid;
  flex: 1;
  place-items: center;
  align-content: center;
  gap: 16px;
  color: #a8adb5;
}

@media (max-width: 640px) {
  .game-toolbar {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 8px;
    padding-inline: 8px;
  }

  .toolbar-button {
    padding-inline: 10px;
  }

  .toolbar-actions .toolbar-button span:not(.recording-dot) {
    display: none;
  }

  .observer-panel {
    width: 100%;
    min-width: 0;
  }

  .game-grid {
    grid-auto-rows: calc(100dvh - 72px);
  }
}
</style>
