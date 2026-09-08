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

    <GameProtocolObserver
      v-if="observerOpen"
      :active-filter="observerFilter"
      :entries="filteredProtocolEntries"
      :filters="observerFilters"
      :observing="observing"
      :selected-entry-id="selectedEntryId"
      :selected-entry-text="selectedEntryText"
      :total="protocolEntries.length"
      @clear="clearObservation"
      @close="observerOpen = false"
      @copy="copySelectedEntry"
      @export="exportObservation"
      @select="selectedEntryId = $event"
      @start="startObservation"
      @stop="stopObservation"
      @update:active-filter="observerFilter = $event"
    ></GameProtocolObserver>

    <GameBinManager
      v-if="binManagerOpen"
      :entries="binEntries"
      :game-options="gameOptions"
      :status="binManagerStatus"
      :target-id="binManagerTargetId"
      @clear="runBinToolAction('clearBtn')"
      @close="binManagerOpen = false"
      @import="runBinToolAction('loadBtn')"
      @reload="reloadBinTarget"
      @update:target-id="binManagerTargetId = $event"
    ></GameBinManager>

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
  ExpandOutline,
  LogInOutline,
  PulseOutline,
  SyncOutline,
} from "@vicons/ionicons5";
import GameBinManager from "@/components/GamePlayer/GameBinManager.vue";
import GameProtocolObserver from "@/components/GamePlayer/GameProtocolObserver.vue";
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

const gameOptions = computed(() =>
  gameIds.value.map((value) => ({ label: getGameName(value), value })),
);

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

<style scoped src="./GamePlayer.css"></style>
