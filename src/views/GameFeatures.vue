<template>
  <div class="game-features-page">
    <div class="role-context-band">
      <div class="container role-context">
        <div class="role-identity">
          <img
            class="role-avatar"
            :src="tokenStore.selectedToken?.avatar || '/icons/xiaoyugan.png'"
            alt="当前角色头像"
          >
          <div>
            <h2>{{ tokenStore.selectedToken?.name || "未选择角色" }}</h2>
            <div class="role-metadata">
              <Badge v-if="tokenStore.selectedToken?.server" variant="outline">
                {{ tokenStore.selectedToken.server }}
              </Badge>
              <span class="token-id">{{ tokenStore.selectedToken?.id }}</span>
            </div>
          </div>
        </div>
        <div class="connection-actions">
          <span class="connection-summary">
            <span class="connection-summary-dot" :class="connectionStatus"></span>
            {{ connectionStatusText }}
          </span>
          <Button
            variant="outline"
            size="sm"
            :disabled="isConnectionPending"
            @click="toggleConnection"
          >
            <LoaderCircle
              v-if="isConnectionPending"
              class="connection-spinner"
            ></LoaderCircle>
            <WifiOff v-else-if="isConnected"></WifiOff>
            <Wifi v-else></Wifi>
            {{ connectionActionText }}
          </Button>
          <Button size="sm" @click="openGame">
            <Gamepad2></Gamepad2>
            打开游戏
          </Button>
        </div>
      </div>
    </div>

    <div v-if="isConnected" class="features-grid-section">
      <div class="container">
        <GameStatus></GameStatus>
      </div>
    </div>
    <section
      v-else
      class="connection-empty-state"
      data-testid="role-connection-empty"
    >
      <LoaderCircle
        v-if="isConnectionPending"
        class="connection-empty-icon connection-spinner"
      ></LoaderCircle>
      <WifiOff v-else class="connection-empty-icon"></WifiOff>
      <p>{{ connectionStatusText }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useMessage } from "naive-ui";
import { Gamepad2, LoaderCircle, Wifi, WifiOff } from "@lucide/vue";
import { useTokenStore } from "@/stores/tokenStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useIndexedDB from "@/hooks/useIndexedDB";
import { prepareEmbeddedGameSession } from "@/utils/gameLauncher";
import { buildEmbeddedGameLocation } from "@/utils/embeddedGameRoute.js";
import { resolveEmbeddedGameBinData } from "@/utils/embeddedGameStorage.js";
import { getTokenId } from "@/utils/token";

const router = useRouter();
const message = useMessage();
const tokenStore = useTokenStore();
const { getArrayBuffer } = useIndexedDB();

// 计算属性
const connectionStatus = computed(() => {
  if (!tokenStore.selectedToken)
    return "disconnected";
  return tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
});

const connectionStatusText = computed(() => {
  if (!tokenStore.selectedToken)
    return "未选择Token";
  const labels = {
    connected: "已连接",
    connecting: "连接中",
    disconnecting: "断开中",
    disconnected: "未连接",
    error: "连接失败",
  };
  return labels[connectionStatus.value] || "未连接";
});

const isConnected = computed(() => {
  return connectionStatus.value === "connected";
});

const isConnectionPending = computed(() => {
  return ["connecting", "disconnecting"].includes(connectionStatus.value);
});

const connectionActionText = computed(() => {
  if (connectionStatus.value === "connecting")
    return "上线中";
  if (connectionStatus.value === "disconnecting")
    return "下线中";
  return isConnected.value ? "下线" : "上线";
});

const pickArenaTargetId = (targets) => {
  const candidate =
    targets?.rankList?.[0] ||
    targets?.roleList?.[0] ||
    targets?.targets?.[0] ||
    targets?.targetList?.[0] ||
    targets?.list?.[0];

  if (candidate?.roleId)
    return candidate.roleId;
  if (candidate?.id)
    return candidate.id;
  return targets?.roleId || targets?.id;
};

// 方法
const _handleFeatureAction = async (featureType) => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择Token");
    router.push("/tokens");
    return;
  }

  const status = tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
  if (status !== "connected") {
    message.warning("WebSocket未连接，请先建立连接");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  const actions = {
    "team-challenge": async () => {
      message.info("开始执行队伍挑战...");
      let targets;
      try {
        targets = await tokenStore.sendMessageWithPromise(
          tokenId,
          "arena_getareatarget",
          {},
          8000,
        );
      } catch (err) {
        message.error(`获取竞技场目标失败：${err.message}`);
        return;
      }
      const targetId = pickArenaTargetId(targets);
      if (!targetId) {
        message.warning("未找到可挑战的竞技场目标");
        return;
      }
      try {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "fight_startareaarena",
          { targetId },
          15000,
        );
        message.success("竞技场战斗已发起");
      } catch (err) {
        message.error(`竞技场战斗失败：${err.message}`);
      }
    },
    "daily-tasks": () => {
      message.info("启动每日任务服务...");
      tokenStore.sendMessage(tokenId, "task_claimdailyreward");
    },
    "salt-robot": () => {
      message.info("领取盐罐机器人奖励...");
      tokenStore.sendMessage(tokenId, "bottlehelper_claim");
    },
    "idle-time": () => {
      message.info("领取挂机时间奖励...");
      tokenStore.sendMessage(tokenId, "system_claimhangupreward");
    },
    "power-switch": () => {
      message.info("执行威震大开关...");
      tokenStore.sendMessage(tokenId, "role_getroleinfo");
    },
    "club-ranking": () => {
      message.info("报名俱乐部排位...");
      tokenStore.sendMessage(tokenId, "legionmatch_rolesignup");
    },
    "club-checkin": () => {
      message.info("执行俱乐部签到...");
      tokenStore.sendMessage(tokenId, "legion_signin");
    },
    "tower-challenge": () => {
      message.info("开始爬塔挑战...");
      // 关键业务：只提示 UI，不打印冗余日志
      // 实际请求体: {"ack":0,"body":{},"cmd":"fight_starttower","seq":XX,"time":TIMESTAMP}
      tokenStore.sendMessage(tokenId, "fight_starttower");
    },
  };

  const action = actions[featureType];
  if (action) {
    await action();
  } else {
    message.warning("功能暂未实现");
  }
};

// 已移除 sendWebSocketMessage，使用 tokenStore.sendMessage 代替

const connectWebSocket = () => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择一个Token");
    router.push("/tokens");
    return;
  }

  try {
    const tokenId = tokenStore.selectedToken.id;
    const token = tokenStore.selectedToken.token;

    // 使用 tokenStore 的 WebSocket 连接管理
    tokenStore.createWebSocketConnection(
      tokenId,
      token,
      tokenStore.selectedToken.wsUrl,
    );
    message.info("正在建立 WebSocket 连接...");

    // 等待连接建立
    setTimeout(async () => {
      const status = tokenStore.getWebSocketStatus(tokenId);
      if (status === "connected") {
        message.success("WebSocket 连接成功");
        // 连接成功后自动初始化游戏数据
        await initializeGameData();
      }
    }, 2000);
  } catch (error) {
    console.error("WebSocket连接失败:", error);
    message.error("WebSocket连接失败");
  }
};

const disconnectWebSocket = () => {
  if (tokenStore.selectedToken) {
    const tokenId = tokenStore.selectedToken.id;
    tokenStore.closeWebSocketConnection(tokenId);
    message.info("WebSocket连接已断开");
  }
};

const toggleConnection = () => {
  if (connectionStatus.value === "connected") {
    disconnectWebSocket();
  } else {
    connectWebSocket();
  }
};

const openGame = async () => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择一个账号");
    return;
  }

  const binData = await resolveEmbeddedGameBinData(token, getArrayBuffer, {
    identifyBuffer: getTokenId,
  });
  if (!binData) {
    message.error("未找到该账号的本机 BIN 数据，请重新导入 BIN");
    return;
  }

  prepareEmbeddedGameSession(token, binData);
  await router.push(buildEmbeddedGameLocation([token.id], "role"));
};

// handleWebSocketMessage 已移除，消息处理由 tokenStore 负责

// 生命周期
onMounted(() => {
  if (tokenStore.selectedToken) {
    const status = tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
    if (status === "connected") {
      initializeGameData();
    }
  }
});

// 监听当前选中 Token 的连接错误（如 token 过期）并给出明确提示
watch(
  () => {
    if (!tokenStore.selectedToken)
      return { status: "disconnected", lastError: null };
    const conn = tokenStore.wsConnections[tokenStore.selectedToken.id];
    return { status: conn?.status, lastError: conn?.lastError };
  },
  (cur) => {
    if (!cur)
      return;
    if (cur.status === "error" && cur.lastError) {
      const err = String(cur.lastError.error || "").toLowerCase();
      if (err.includes("token") && err.includes("expired")) {
        const importMethod = tokenStore.selectedToken?.importMethod;
        if (
          importMethod === "url" ||
          importMethod === "bin" ||
          importMethod === "wxQrcode"
        ) {
          message.warning("Token已过期，正在尝试自动刷新...");
          return;
        }
        message.error("当前 Token 已过期，请重新导入后再试");
        router.push("/tokens");
      }
    }
  },
  { deep: true },
);

// 初始化游戏数据
const initializeGameData = async () => {
  if (!tokenStore.selectedToken)
    return;

  try {
    const tokenId = tokenStore.selectedToken.id;
    // 获取初始化数据（静默）
    tokenStore.sendMessage(tokenId, "role_getroleinfo");
    tokenStore.sendMessage(tokenId, "tower_getinfo");
    tokenStore.sendMessage(tokenId, "evotower_getinfo");
    tokenStore.sendMessage(tokenId, "presetteam_getinfo");
    const res = await tokenStore.sendMessageWithPromise(
      tokenId,
      "fight_startlevel",
    );
    tokenStore.setBattleVersion(res?.battleData?.version);
  } catch {
    // 静默处理初始化异常
  }
};

onUnmounted(() => {
  // WebSocket 连接由 tokenStore 管理，不需要手动清理
});
</script>

<style scoped lang="scss">
.game-features-page {
  min-height: calc(100dvh - 56px);
  background: var(--background);
  padding-bottom: calc(var(--spacing-md) + env(safe-area-inset-bottom));
}

.role-context-band {
  background: var(--background);
  border-bottom: 1px solid var(--border-light);
  padding: 12px 0;
}

.role-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.role-identity,
.connection-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-avatar {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.role-metadata,
.connection-summary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-summary {
  color: var(--on-surface-variant);
  font-size: 13px;
}

.connection-summary-dot {
  width: 7px;
  height: 7px;
  background: var(--outline);
  border-radius: 50%;
}

.connection-summary-dot.connected { background: var(--success); }

.connection-summary-dot.connecting,
.connection-summary-dot.disconnecting { background: var(--warning); }

.connection-summary-dot.error { background: var(--error); }

.connection-spinner {
  animation: connection-spin 0.8s linear infinite;
}

@keyframes connection-spin {
  to { transform: rotate(360deg); }
}

.role-identity h2 {
  margin: 0 0 4px;
  color: var(--on-surface);
  font-size: 15px;
  font-weight: 650;
}

.token-id {
  color: var(--on-surface-variant);
  font: 500 10px/1.2 "JetBrains Mono", monospace;
  letter-spacing: 0;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.connection-empty-state {
  display: grid;
  min-height: clamp(320px, calc(100dvh - 170px), 720px);
  place-content: center;
  justify-items: center;
  gap: 10px;
  color: var(--on-surface-variant);
}

.connection-empty-icon {
  width: 28px;
  height: 28px;
  stroke-width: 1.5;
}

.connection-empty-state p {
  margin: 0;
  color: var(--on-surface);
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }

  .page-header {
    padding: var(--spacing-md) 0;
    margin-bottom: var(--spacing-md);

    .header-content {
      flex-direction: column;
      gap: var(--spacing-sm);
      text-align: center;
    }

    .page-title {
      font-size: var(--font-size-xl);
    }
  }

  .features-grid-section {
    padding: var(--spacing-md) 0;
  }

  .ws-status-section {
    padding: 0 0 var(--spacing-lg) 0;
  }

  .ws-status-card {
    padding: var(--spacing-md);
  }
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs) 0;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  margin: 0;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-medium);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);

  &.connected {
    background: rgba(24, 160, 88, 0.1);
    color: var(--success-color);
  }

  &.disconnected {
    background: rgba(208, 48, 80, 0.1);
    color: var(--error-color);
  }
}

// 反馈提示区域
.feedback-section {
  padding: var(--spacing-md) 0;
}

// 功能模块网格
.features-grid-section {
  padding: 16px 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.feature-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-lg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all var(--transition-normal);
  border-left: 4px solid var(--primary-color);

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  // 不同功能的主题色
  &.team-challenge {
    border-left-color: #2080f0;
  }

  &.daily-tasks {
    border-left-color: #f0a020;
  }

  &.salt-robot {
    border-left-color: #18a058;
  }

  &.idle-time {
    border-left-color: #d03050;
  }

  &.power-switch {
    border-left-color: #7c3aed;
  }

  &.club-ranking {
    border-left-color: #f59e0b;
  }

  &.club-checkin {
    border-left-color: #10b981;
  }

  &.tower-challenge {
    border-left-color: #6366f1;
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-medium);
  background: var(--primary-color-light);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  :deep(svg) {
    width: 24px;
    height: 24px;
  }
}

.feature-title {
  flex: 1;

  h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin: 0 0 var(--spacing-xs) 0;
  }
}

.feature-subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.feature-badge,
.feature-status {
  flex-shrink: 0;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-small);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.feature-status {
  &.in-progress {
    background: rgba(240, 160, 32, 0.1);
    color: var(--warning-color);
  }

  &.completed {
    background: rgba(24, 160, 88, 0.1);
    color: var(--success-color);
  }

  &.waiting {
    background: rgba(32, 128, 240, 0.1);
    color: var(--info-color);
  }
}

.card-content {
  margin-bottom: var(--spacing-lg);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);

  .stage-text {
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
  }

  .progress-text {
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
  }
}

.time-display {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  text-align: center;
  margin-bottom: var(--spacing-sm);
  font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
}

.task-description {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.card-actions {
  margin-top: var(--spacing-lg);
}

// WebSocket状态区域
.ws-status-section {
  padding: 0 0 var(--spacing-xl) 0;
}

.ws-status-card {
  background: var(--surface-container-low);
  border: 1px solid var(--outline-variant);
  border-top: 2px solid var(--secondary);
  border-radius: 8px;
  padding: var(--spacing-lg);
  box-shadow: none;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);

  h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin: 0;
  }
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--border-light);

  &:last-child {
    border-bottom: none;
  }

  span:first-child {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  span:last-child {
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
  }
}

.status-connected {
  color: var(--success-color);
}

.status-disconnected {
  color: var(--error-color);
}

// 响应式设计
@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }

  .game-features-page { min-height: calc(100dvh - 56px); }
  .role-context { align-items: flex-start; flex-direction: column; }
  .connection-actions { width: 100%; justify-content: space-between; }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .feature-card {
    padding: var(--spacing-md);
  }

  .card-header {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-sm);
  }
}
</style>
