<template>
  <div class="game-player">
    <header class="game-toolbar">
      <button class="toolbar-button" type="button" :disabled="editingOrder" @click="goBack">
        <ArrowBackOutline></ArrowBackOutline>
        <span>返回</span>
      </button>

      <div class="game-summary">
        <strong>游戏窗口</strong>
        <span role="status">{{ orderStatus || (editingOrder ? '拖动窗口后保存顺序' : `${gameIds.length} 个账号`) }}</span>
      </div>

      <div class="toolbar-actions">
        <template v-if="editingOrder">
          <button aria-label="保存排序" class="toolbar-button toolbar-button-active" type="button" @click="saveOrder">
            <CheckmarkOutline></CheckmarkOutline><span>保存</span>
          </button>
          <button aria-label="取消排序" class="toolbar-button" type="button" @click="cancelOrder">
            <CloseOutline></CloseOutline><span>取消</span>
          </button>
        </template>
        <button v-else-if="gameIds.length > 1" aria-label="编辑排序" class="toolbar-button" type="button" @click="editOrder">
          <MoveOutline></MoveOutline><span>编辑排序</span>
        </button>
        <button
          class="toolbar-button"
          type="button"
          :aria-expanded="binManagerOpen"
          :class="{ 'toolbar-button-active': binManagerOpen }"
          :disabled="editingOrder"
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
          :disabled="editingOrder"
          @click="toggleInputSync"
        >
          <SyncOutline></SyncOutline>
          <span>{{ syncEnabled ? "同步已开启" : "同步操作" }}</span>
        </button>
        <button
          class="toolbar-button"
          type="button"
          :class="{ 'toolbar-button-active': observerOpen }"
          :disabled="editingOrder"
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
      ref="gameGrid"
      v-if="gameIds.length > 0"
      class="game-grid"
      :class="{ 'focused-grid': focusedId || gameIds.length === 1, 'editing-order': editingOrder }"
    >
      <section
        v-for="tokenId in mountedGameIds"
        :key="tokenId"
        class="game-window"
        :class="{
          'game-window-hidden': focusedId && focusedId !== tokenId,
          'sync-master-window': syncEnabled && syncMasterId === tokenId,
          'order-dragging': draggingId === tokenId,
          'order-target': dropTargetId === tokenId && draggingId !== tokenId,
        }"
        :data-game-id="tokenId"
        :style="{ order: gameIds.indexOf(tokenId) }"
      >
        <header class="game-window-header">
          <div class="game-window-title" :title="getGameName(tokenId)">
            <span class="game-status-dot"></span>
            <strong>{{ getGameName(tokenId) }}</strong>
            <small v-if="getGameServer(tokenId)" class="game-server">{{ getGameServer(tokenId) }}</small>
            <span
              v-if="syncEnabled && syncMasterId === tokenId"
              class="sync-master-label"
            >主控</span>
          </div>
          <div v-if="!editingOrder" class="game-window-actions">
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
        <div class="game-viewport" @wheel.prevent>
          <iframe
            :ref="(element) => setGameFrame(tokenId, element)"
            v-if="!isDesktop || gameSessions.get(tokenId)?.url"
            allow="fullscreen; autoplay"
            class="game-iframe"
            :sandbox="isDesktop ? 'allow-scripts allow-same-origin allow-downloads' : undefined"
            :src="getGameSource(tokenId)"
            :tabindex="editingOrder ? -1 : 0"
            :title="`${getGameName(tokenId)}游戏窗口`"
          ></iframe>
          <p v-else role="status">{{ gameSessions.get(tokenId)?.error || '正在打开游戏…' }}</p>
        </div>
        <div
          v-if="editingOrder"
          class="order-mask"
          role="button"
          tabindex="0"
          :aria-label="`拖动排列：${getGameName(tokenId)} ${getGameServer(tokenId)}`"
          @keydown.down.prevent="moveOrderByKey(tokenId, 1)"
          @keydown.left.prevent="moveOrderByKey(tokenId, -1)"
          @keydown.right.prevent="moveOrderByKey(tokenId, 1)"
          @keydown.up.prevent="moveOrderByKey(tokenId, -1)"
          @lostpointercapture="clearOrderDrag"
          @pointercancel="clearOrderDrag"
          @pointerdown="startOrderDrag(tokenId, $event)"
          @pointermove="moveOrderDrag"
          @pointerup="finishOrderDrag"
        >
          <span class="order-number">{{ gameIds.indexOf(tokenId) + 1 }}</span>
          <MoveOutline></MoveOutline>
          <strong>{{ getGameName(tokenId) }}</strong>
          <small>{{ getGameServer(tokenId) }}</small>
          <span>拖动调整顺序</span>
        </div>
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
import { useDialog } from "naive-ui";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowBackOutline,
  CheckmarkOutline,
  CloseOutline,
  ExpandOutline,
  LogInOutline,
  MoveOutline,
  PulseOutline,
  SyncOutline,
} from "@vicons/ionicons5";
import GameBinManager from "@/components/GamePlayer/GameBinManager.vue";
import GameProtocolObserver from "@/components/GamePlayer/GameProtocolObserver.vue";
import { useTokenStore } from "@/stores/tokenStore";
import { g_utils } from "@/utils/bonProtocol";
import { getTokenId } from "@/utils/token";
import { prepareEmbeddedGameSession } from "@/utils/gameLauncher";
import { getTokenDisplayName } from "@/utils/roleTokenMetadata.js";
import { findPreparedEmbeddedGameBin } from "@/utils/embeddedGameStorage.js";
import { GAME_WINDOW_ORDER_KEY, moveEmbeddedGameId, orderEmbeddedGameIds, saveEmbeddedGameOrder } from "@/utils/embeddedGameOrder.js";
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
const dialog = useDialog();
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
const gameGrid = ref(null);
const mountedGameIds = ref([]);
const editingOrder = ref(false);
const draftOrder = ref([]);
const draggingId = ref(null);
const dropTargetId = ref(null);
const orderStatus = ref("");
let pointerDrag = null;
let dragAnimationFrame = null;
const isDesktop = window.desktop?.isDesktop === true;
const gameSessions = ref(new Map());
const pendingSessions = new Set();
let disposed = false;

const releaseGameSession = (session) => {
  if (session?.origin)
    void window.desktop.releaseGameSession(session.origin).catch(() => {});
};

const syncGameSessions = () => {
  if (!isDesktop)
    return;
  for (const [id, session] of gameSessions.value) {
    if (!gameIds.value.includes(id)) {
      gameSessions.value.delete(id);
      releaseGameSession(session);
    }
  }
  for (const id of gameIds.value) {
    if (gameSessions.value.has(id) || pendingSessions.has(id))
      continue;
    pendingSessions.add(id);
    window.desktop.createGameSession(id).then((session) => {
      if (disposed || !gameIds.value.includes(id))
        releaseGameSession(session);
      else gameSessions.value.set(id, session);
    }).catch(() => {
      if (!disposed && gameIds.value.includes(id))
        gameSessions.value.set(id, { error: "打开失败，请刷新窗口重试" });
    }).finally(() => pendingSessions.delete(id));
  }
};

const observerFilters = [
  { label: "全部", value: "all" },
  { label: "WebSocket", value: "ws" },
  { label: "HTTP", value: "http" },
];

const sourcePage = computed(() => {
  const value = route.query.from;
  return Array.isArray(value) ? value[0] : value;
});

const requestedGameIds = computed(() =>
  normalizeEmbeddedGameIds(
    route.query.bin_id,
    tokenStore.selectedToken?.id || localStorage.getItem("current_bin_id"),
  ).filter((id) => tokenStore.gameTokens.some((token) => token.id === id)),
);

const savedGameIds = computed(() => orderEmbeddedGameIds(requestedGameIds.value, tokenStore.gameTokens, tokenStore.gameWindowOrder));
const gameIds = computed(() => editingOrder.value
  ? [...draftOrder.value.filter((id) => requestedGameIds.value.includes(id)), ...savedGameIds.value.filter((id) => !draftOrder.value.includes(id))]
  : savedGameIds.value);

const getGameServer = (tokenId) => {
  const token = tokenStore.gameTokens.find((item) => item.id === tokenId);
  return token?.server || (token?.serverId ? `区服 ${token.serverId}` : "");
};

// 保持 iframe 的 DOM 顺序稳定，CSS order 调整位置不会卸载游戏或重新登录。
watch(requestedGameIds, (ids) => {
  mountedGameIds.value = [...mountedGameIds.value.filter((id) => ids.includes(id)), ...ids.filter((id) => !mountedGameIds.value.includes(id))];
  if (editingOrder.value)
    draftOrder.value = [...draftOrder.value.filter((id) => ids.includes(id)), ...ids.filter((id) => !draftOrder.value.includes(id))];
  if (pointerDrag && !ids.includes(pointerDrag.id))
    clearOrderDrag();
  for (const id of ids) {
    const token = tokenStore.gameTokens.find((item) => item.id === id);
    if (!token || token.serverId)
      continue;
    try {
      const buffer = findPreparedEmbeddedGameBin(token, localStorage);
      if (!buffer)
        continue;
      const data = g_utils.parse(buffer).getData();
      if (data?.serverId !== undefined && data.serverId !== null)
        tokenStore.updateToken(id, { serverId: String(data.serverId) });
    } catch { /* 旧账号无法解析时保留已有区服标识。 */ }
  }
}, { immediate: true });

function clearOrderDrag() {
  const drag = pointerDrag;
  pointerDrag = null;
  draggingId.value = null;
  dropTargetId.value = null;
  if (dragAnimationFrame !== null)
    cancelAnimationFrame(dragAnimationFrame);
  dragAnimationFrame = null;
  if (drag?.element.hasPointerCapture(drag.pointerId))
    drag.element.releasePointerCapture(drag.pointerId);
}

const updateDropTarget = () => {
  if (!pointerDrag)
    return;
  const hit = document.elementFromPoint(pointerDrag.x, pointerDrag.y)?.closest("[data-game-id]");
  dropTargetId.value = hit && gameGrid.value?.contains(hit) ? hit.dataset.gameId : null;
};

const scrollOrderDrag = () => {
  dragAnimationFrame = null;
  if (!pointerDrag?.moved || !gameGrid.value)
    return;
  const rect = gameGrid.value.getBoundingClientRect();
  if (pointerDrag.y < rect.top + 48)
    gameGrid.value.scrollTop -= 14;
  else if (pointerDrag.y > rect.bottom - 48)
    gameGrid.value.scrollTop += 14;
  updateDropTarget();
  dragAnimationFrame = requestAnimationFrame(scrollOrderDrag);
};

const startOrderDrag = (id, event) => {
  if (!editingOrder.value || event.button !== 0 || pointerDrag)
    return;
  event.preventDefault();
  pointerDrag = { id, pointerId: event.pointerId, element: event.currentTarget, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false };
  event.currentTarget.setPointerCapture(event.pointerId);
  draggingId.value = id;
};

const moveOrderDrag = (event) => {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId)
    return;
  pointerDrag.x = event.clientX;
  pointerDrag.y = event.clientY;
  pointerDrag.moved ||= Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY) >= 5;
  if (pointerDrag.moved) {
    updateDropTarget();
    if (dragAnimationFrame === null)
      dragAnimationFrame = requestAnimationFrame(scrollOrderDrag);
  }
};

const finishOrderDrag = (event) => {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId)
    return;
  if (pointerDrag.moved && dropTargetId.value)
    draftOrder.value = moveEmbeddedGameId(gameIds.value, pointerDrag.id, dropTargetId.value);
  clearOrderDrag();
};

const moveOrderByKey = (id, direction) => {
  const target = gameIds.value[gameIds.value.indexOf(id) + direction];
  if (target)
    draftOrder.value = moveEmbeddedGameId(gameIds.value, id, target);
};

const editOrder = () => {
  draftOrder.value = [...gameIds.value];
  editingOrder.value = true;
  focusedId.value = null;
  binManagerOpen.value = false;
  observerOpen.value = false;
  orderStatus.value = "";
  sendInputSyncControl();
};

const cancelOrder = () => {
  clearOrderDrag();
  editingOrder.value = false;
  draftOrder.value = [];
  sendInputSyncControl();
};

const saveOrder = () => {
  const order = saveEmbeddedGameOrder(tokenStore.gameWindowOrder, gameIds.value, tokenStore.gameTokens);
  try {
    localStorage.setItem(GAME_WINDOW_ORDER_KEY, JSON.stringify(order));
    tokenStore.gameWindowOrder = order;
    cancelOrder();
    orderStatus.value = "顺序已保存";
  } catch {
    orderStatus.value = "保存失败，请检查本地存储空间";
  }
};

const getGameName = (tokenId) => {
  const token = tokenStore.gameTokens.find((item) => item.id === tokenId);
  return token ? getTokenDisplayName(token) : `账号 ${tokenId}`;
};

const gameOptions = computed(() =>
  gameIds.value.map((value) => ({ label: getGameName(value), value })),
);

const getGameSource = (tokenId) =>
  isDesktop ? gameSessions.value.get(tokenId)?.url : buildEmbeddedGameSource(import.meta.env.BASE_URL, tokenId);

const postToGame = (frame, message) => {
  const id = [...gameFrames].find(([, candidate]) => candidate === frame)?.[0];
  const origin = isDesktop ? gameSessions.value.get(id)?.origin : window.location.origin;
  if (origin)
    frame.contentWindow?.postMessage(message, origin);
};

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
  if (isDesktop) {
    if (buttonId === "loadBtn") {
      const targetId = binManagerTargetId.value;
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".bin";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file)
          return;
        try {
          if (file.size > 1024 * 1024)
            throw new Error("BIN 文件过大");
          const buffer = await file.arrayBuffer();
          if (getTokenId(buffer) !== targetId)
            throw new Error("BIN 与目标窗口账号不一致，请选择对应账号的 BIN");
          prepareEmbeddedGameSession({ id: targetId, name: getGameName(targetId) }, buffer);
          loadBinEntries();
          binManagerStatus.value = "BIN 已导入，请刷新目标窗口";
        } catch (error) {
          binManagerStatus.value = error.message || "BIN 导入失败";
        }
      };
      input.click();
    } else if (buttonId === "clearBtn") {
      dialog.warning({
        title: "清空上号器 BIN",
        content: "确定清空所有上号器 BIN 吗？账号管理中保存的账号不会被删除。",
        positiveText: "清空",
        negativeText: "取消",
        onPositiveClick: () => {
          for (const key of Object.keys(localStorage)) {
            if (key.startsWith("bin_data_"))
              localStorage.removeItem(key);
          }
          localStorage.removeItem("bin_file_list");
          localStorage.removeItem("current_bin_id");
          loadBinEntries();
          binManagerStatus.value = "上号器 BIN 已清空，已打开的游戏在刷新后生效";
        },
      });
    }
    return;
  }
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
  if (isDesktop) {
    const session = gameSessions.value.get(binManagerTargetId.value);
    if (frame && session?.url) {
      frame.src = session.url;
    } else {
      gameSessions.value.delete(binManagerTargetId.value);
      syncGameSessions();
    }
    binManagerStatus.value = "目标窗口正在刷新";
    return;
  }
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
    postToGame(targetFrame, message);
    return;
  }
  gameFrames.forEach((frame) => {
    postToGame(frame, message);
  });
};

const sendInputSyncControl = (targetFrame) => {
  const message = createGameInputControl(syncEnabled.value && !editingOrder.value, syncMasterId.value);
  if (targetFrame) {
    postToGame(targetFrame, message);
    return;
  }
  gameFrames.forEach((frame) => {
    postToGame(frame, message);
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

  // 根据实际发送窗口确定账号，不能相信游戏消息自行声明的账号 ID。
  const messageTokenId = [...gameFrames].find(([, frame]) => frame.contentWindow === event.source)?.[0];
  const expectedOrigin = isDesktop ? gameSessions.value.get(messageTokenId)?.origin : window.location.origin;
  if (!messageTokenId || event.origin !== expectedOrigin || String(message.binId) !== messageTokenId)
    return;
  const frame = gameFrames.get(messageTokenId);
  if (!frame || frame.contentWindow !== event.source)
    return;
  if (message.type === "game-bootstrap-ready" && isDesktop) {
    postToGame(frame, {
      source: PROTOCOL_OBSERVER_CONTROL_SOURCE,
      type: "game-bootstrap-init",
      binId: messageTokenId,
      name: getGameName(messageTokenId),
      hex: localStorage.getItem(`bin_data_${messageTokenId}`),
    });
    return;
  }
  if (message.type === "protocol-observer-ready") {
    if (observing.value)
      sendObserverControl("start", frame);
    sendInputSyncControl(frame);
    return;
  }
  if (message.type === GAME_INPUT_SYNC_EVENT_TYPE) {
    if (editingOrder.value || !syncEnabled.value || messageTokenId !== syncMasterId.value)
      return;
    const dispatchMessage = createGameInputDispatch(message.input);
    if (!dispatchMessage)
      return;
    gameFrames.forEach((targetFrame, tokenId) => {
      if (tokenId !== syncMasterId.value) {
        postToGame(targetFrame, dispatchMessage);
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
  syncGameSessions();
  if (ids.length < 2) {
    syncEnabled.value = false;
  }
  if (!ids.includes(syncMasterId.value)) {
    syncMasterId.value = ids[0] || null;
  }
  sendInputSyncControl();
}, { immediate: true });

onMounted(() => {
  window.addEventListener("message", handleGameMessage);
  window.addEventListener("storage", handleBinStorageChange);
});
onBeforeUnmount(() => {
  clearOrderDrag();
  disposed = true;
  sendObserverControl("stop");
  syncEnabled.value = false;
  sendInputSyncControl();
  window.removeEventListener("message", handleGameMessage);
  window.removeEventListener("storage", handleBinStorageChange);
  gameSessions.value.forEach(releaseGameSession);
  gameSessions.value.clear();
});
</script>

<style scoped src="./GamePlayer.css"></style>
