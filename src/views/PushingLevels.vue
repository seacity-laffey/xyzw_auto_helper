<template>
  <div class="pushing-levels-page">
    <PushingLevelControls
      :account-tools-open="showAccountTools"
      :all-selected-running="allSelectedRunning"
      :auto-continue="autoContinue"
      :has-any-running="hasAnyRunning"
      :has-selected-running="hasSelectedRunning"
      :max-retries="maxRetries"
      :running-count="runningCount"
      :selected-count="selectedTokenIds.length"
      :torch-item-id="torchItemId"
      :torch-options="torchOptions"
      :torch-quantity="torchQuantity"
      :torch-running="torchRunning"
      :total-count="tokens.length"
      @clear-selection="clearSelection"
      @start="startSelected"
      @stop="stopSelected"
      @toggle-account-tools="showAccountTools = !showAccountTools"
      @update:auto-continue="autoContinue = $event"
      @update:max-retries="maxRetries = $event"
      @update:torch-item-id="torchItemId = $event"
      @update:torch-quantity="torchQuantity = $event"
      @use-torch="useTorchForSelected"
    >
      <PushingAccountSelector
        v-if="showAccountTools"
        :all-visible-selected="allVisibleSelected"
        :groups="groupModels"
        :search-keyword="searchKeyword"
        :some-visible-selected="someVisibleSelected"
        :tokens="filteredTokens"
        @toggle-all="toggleAllVisible"
        @toggle-group="toggleGroup"
        @toggle-token="toggleToken"
        @update:search-keyword="searchKeyword = $event"
      ></PushingAccountSelector>
    </PushingLevelControls>

    <PushingLevelProgress
      :cards="runningCards"
      @start="startOne"
      @stop="stopOne"
    ></PushingLevelProgress>

    <PushingLogPanel
      :auto-scroll="autoScroll"
      :filter-options="logFilterOptions"
      :filter-token-id="logFilterTokenId"
      :logs="visibleLogs"
      :only-errors="onlyErrors"
      :total="logs.length"
      @clear="clearLogs"
      @update:auto-scroll="autoScroll = $event"
      @update:filter-token-id="logFilterTokenId = $event"
      @update:only-errors="onlyErrors = $event"
    ></PushingLogPanel>
  </div>
</template>

<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
} from "vue";
import { useMessage } from "naive-ui";
import PushingAccountSelector from "@/components/PushingLevels/PushingAccountSelector.vue";
import PushingLevelControls from "@/components/PushingLevels/PushingLevelControls.vue";
import { batchSelectedTokenIds, useTokenStore } from "@/stores/tokenStore";
import PushingLevelProgress from "@/components/PushingLevels/PushingLevelProgress.vue";
import PushingLogPanel from "@/components/PushingLevels/PushingLogPanel.vue";
import { usePushingAccountSelection } from "@/composables/usePushingAccountSelection";
import { usePushingLogs } from "@/composables/usePushingLogs";
import {
  applyPushingLevel as applyLevel,
  computeTorchRemaining,
  formatTorchTime,
  getBossName,
  pickNumber,
  readTorchFromResponse,
  responseBody,
  sanitizePushingError as sanitizeError,
  sleep,
} from "@/utils/pushingLevelRuntime";

const KNOWLEDGE_COIN_ITEM_ID = 1024;
// 火把信息刷新间隔（毫秒）
const TORCH_REFRESH_INTERVAL = 30000;

const message = useMessage();
const tokenStore = useTokenStore();

const selectedTokenIds = batchSelectedTokenIds;
const showAccountTools = ref(false);
const autoContinue = ref(true);
const maxRetries = ref(999999);
const runningStates = reactive({});
const torchRunning = ref(false);
const torchItemId = ref(1008);
const torchQuantity = ref(150);
// 倒计时刷新（用于火把时间），每秒更新一次显示
const tickNow = ref(Date.now());
let tickTimer = null;

const torchOptions = [
  { label: "木材火把", value: 1008 },
  { label: "青铜火把", value: 1009 },
  { label: "咸神火把", value: 1010 },
];

const tokens = computed(() => tokenStore.gameTokens || []);
const tokenGroups = computed(() => tokenStore.tokenGroups || []);

const {
  allVisibleSelected,
  clearAccountSelection,
  filteredTokens,
  groupModels,
  searchKeyword,
  someVisibleSelected,
  toggleAllVisible,
  toggleGroup,
  toggleToken,
} = usePushingAccountSelection({
  getConnectionStatus: getWebSocketStatus,
  selectedTokenIds,
  tokenGroups,
  tokens,
});

const {
  autoScroll,
  addLog,
  clearLogs,
  logFilterOptions,
  logFilterTokenId,
  logs,
  onlyErrors,
  visibleLogs,
} = usePushingLogs({ getToken, runningStates, selectedTokenIds });

const runningCount = computed(() => {
  return Object.values(runningStates).filter(
    (state) => state?.running && !state.stopFlag,
  ).length;
});

const allSelectedRunning = computed(() => {
  return (
    selectedTokenIds.value.length > 0
    && selectedTokenIds.value.every((tokenId) => isRunning(tokenId))
  );
});

const hasSelectedRunning = computed(() => {
  return selectedTokenIds.value.some((tokenId) => isRunning(tokenId));
});

const hasAnyRunning = computed(() => {
  return Object.values(runningStates).some(
    (state) => state?.running && !state.stopFlag,
  );
});

function getTorchLabel(state) {
  if (!state)
    return "火把 无";
  const remaining = computeTorchRemaining(state, tickNow.value);
  if (state.torchType > 0 && remaining > 0) {
    const name = state.torchTypeName || getTorchName(state.torchType);
    return `${name} ${formatTorchTime(remaining)}`;
  }
  return "火把 无";
}

const runningCards = computed(() => {
  const ids = new Set(selectedTokenIds.value);
  Object.values(runningStates).forEach((state) => {
    if (state?.tokenId)
      ids.add(state.tokenId);
  });

  return [...ids]
    .filter((tokenId) => tokens.value.some((token) => token.id === tokenId))
    .map((tokenId) => {
      const token = getToken(tokenId);
      const state = runningStates[tokenId] || {};
      const level = Number(state.level || 0);
      return {
        tokenId,
        tokenName: token?.name || tokenId,
        connectionStatus: getWebSocketStatus(tokenId),
        running: Boolean(state.running && !state.stopFlag),
        level,
        bossName:
          state.bossName && Number(state.bossLevel || 0) === level
            ? state.bossName
            : getBossName(level),
        wins: state.wins || 0,
        losses: state.losses || 0,
        battles: state.battles || 0,
        countdown: state.countdown || 0,
        totalTime: state.totalTime || 0,
        lastError: state.lastError || "",
        torchLabel: getTorchLabel(state),
      };
    });
});

function getToken(tokenId) {
  return tokens.value.find((token) => token.id === tokenId);
}

function getTokenName(tokenId) {
  return getToken(tokenId)?.name || tokenId;
}

function getWebSocketStatus(tokenId) {
  return tokenStore.getWebSocketStatus(tokenId) || "disconnected";
}

function isConnected(tokenId) {
  return getWebSocketStatus(tokenId) === "connected";
}

function isRunning(tokenId) {
  const state = runningStates[tokenId];
  return Boolean(state?.running && !state.stopFlag);
}

function clearSelection() {
  Object.keys(runningStates).forEach((tokenId) => {
    stopOne(tokenId);
  });
  Object.keys(runningStates).forEach((tokenId) => {
    delete runningStates[tokenId];
  });
  clearAccountSelection();
}

function initState(tokenId, tokenName) {
  runningStates[tokenId] = {
    tokenId,
    tokenName,
    running: true,
    stopFlag: false,
    level: 0,
    bossName: "",
    bossLevel: 0, // bossName 对应的关卡，用于判断名称是否过期
    wins: 0,
    losses: 0,
    retries: 0,
    maxRetries: maxRetries.value || 999999,
    battles: 0,
    countdown: 0,
    totalTime: 0,
    lastError: "",
    startTime: Date.now(),
    consecutiveErrors: 0,
    maxConsecutiveErrors: 5,
    // 火把相关
    torchType: 0,
    torchTypeName: "",
    torchRemaining: 0,
    torchSettleTime: 0,
    torchActive: false,
    torchBaseTimestamp: 0,
    torchBaseRemaining: 0,
    lastTorchFetch: 0,
  };
}

function getTorchName(torchType) {
  if (!torchType || torchType === 0)
    return "";
  const option = torchOptions.find((item) => item.value === torchType);
  return option ? option.label : `火把(${torchType})`;
}

function applyTorchInfo(state, info) {
  if (!state || !info)
    return;
  const type = Number(info.torchType || 0);
  const remaining = Number(info.torchRemaining || 0);
  const settleTime = Number(info.torchSettleTime || 0);

  state.torchType = type;
  state.torchTypeName = getTorchName(type);
  state.torchRemaining = remaining;
  state.torchSettleTime = settleTime;
  state.torchActive = type > 0 && remaining > 0;
  state.torchBaseTimestamp = Date.now();
  state.torchBaseRemaining = remaining;
  state.lastTorchFetch = Date.now();
}

async function waitConnected(tokenId, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isConnected(tokenId))
      return true;
    await sleep(200);
  }
  return isConnected(tokenId);
}

async function ensureConnected(tokenId, retryCount = 2) {
  if (isConnected(tokenId))
    return true;

  const token = getToken(tokenId);
  const tokenName = token?.name || tokenId;
  if (!token) {
    addLog(tokenId, tokenName, "重连失败：未找到账号数据", "error");
    return false;
  }

  for (let attempt = 0; attempt < retryCount; attempt++) {
    if (attempt > 0) {
      addLog(
        tokenId,
        tokenName,
        `重连尝试 ${attempt}/${retryCount}，等待 3 秒...`,
        "warning",
      );
      await sleep(3000);
    } else {
      addLog(tokenId, tokenName, "WebSocket 断开，尝试连接...", "info");
    }

    try {
      await tokenStore.createWebSocketConnection(
        tokenId,
        token.token,
        token.wsUrl,
      );
      if (await waitConnected(tokenId, 3000)) {
        addLog(tokenId, tokenName, "WebSocket 连接成功", "success");
        return true;
      }
    } catch (error) {
      addLog(tokenId, tokenName, `连接失败：${sanitizeError(error)}`, "error");
    }
  }

  addLog(
    tokenId,
    tokenName,
    `WebSocket 连接失败，已重试 ${retryCount} 次，放弃`,
    "error",
  );
  return false;
}

async function fetchTorchInfo(tokenId, tokenName, { silent = false } = {}) {
  if (!isConnected(tokenId))
    return null;
  try {
    const response = await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
      10000,
    );
    const info = readTorchFromResponse(response);
    const state = runningStates[tokenId] || initState(tokenId, tokenName);
    if (state !== runningStates[tokenId])
      runningStates[tokenId] = state;
    applyTorchInfo(state, info);
    if (!silent) {
      if (info.torchType > 0) {
        addLog(
          tokenId,
          tokenName,
          `火把状态：${state.torchTypeName} ${formatTorchTime(state.torchRemaining)}`,
          "info",
        );
      } else {
        addLog(tokenId, tokenName, "当前没有使用中的火把", "info");
      }
    }
    return state;
  } catch (error) {
    if (!silent) {
      addLog(
        tokenId,
        tokenName,
        `获取火把信息失败：${sanitizeError(error)}`,
        "warning",
      );
    }
    return null;
  }
}

async function initializeBattleData(tokenId, tokenName) {
  try {
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
      10000,
    );
    const response = await tokenStore.sendMessageWithPromise(
      tokenId,
      "fight_startlevel",
      {},
      10000,
    );
    const version
      = response?.battleData?.version || response?.body?.battleData?.version;
    if (version) {
      tokenStore.setBattleVersion(version);
      addLog(tokenId, tokenName, `battleVersion: ${version}`, "info");
    }
  } catch (error) {
    addLog(
      tokenId,
      tokenName,
      `初始化战斗数据失败：${sanitizeError(error)}`,
      "warning",
    );
  }
}

async function upgradeHangupReward(tokenId, tokenName) {
  try {
    const roleInfo = await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
      5000,
    );
    const items
      = roleInfo?.role?.items
        || roleInfo?.body?.role?.items
        || roleInfo?.items
        || [];
    let coinCount = 0;

    if (Array.isArray(items)) {
      const coin = items.find(
        (entry) => Number(entry.id ?? entry.itemId) === KNOWLEDGE_COIN_ITEM_ID,
      );
      coinCount = Number(coin?.num ?? coin?.count ?? coin?.quantity ?? 0);
    } else if (items && typeof items === "object") {
      coinCount = Number(
        items[KNOWLEDGE_COIN_ITEM_ID]?.num
        ?? items[KNOWLEDGE_COIN_ITEM_ID]
        ?? 0,
      );
    }

    if (coinCount <= 0) {
      addLog(tokenId, tokenName, "知识币不足，跳过升级挂机奖励", "info");
      return;
    }

    addLog(
      tokenId,
      tokenName,
      `知识币剩余：${coinCount}，开始升级挂机奖励`,
      "info",
    );
    let used = 0;
    while (coinCount > 0) {
      const state = runningStates[tokenId];
      if (!state || state.stopFlag)
        break;

      const upgradeNum = coinCount >= 50 ? 50 : coinCount >= 10 ? 10 : 1;
      try {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "system_hangupupgrade",
          { upgradeNum },
          5000,
        );
        coinCount -= upgradeNum;
        used += upgradeNum;
        addLog(
          tokenId,
          tokenName,
          `升级挂机 +${upgradeNum}，剩余 ${coinCount}`,
          "success",
        );
      } catch (error) {
        addLog(
          tokenId,
          tokenName,
          `升级挂机失败 (${upgradeNum})：${sanitizeError(error)}`,
          "warning",
        );
        break;
      }
      await sleep(1200);
    }

    if (used > 0) {
      addLog(
        tokenId,
        tokenName,
        `升级挂机奖励完成，共用 ${used} 个知识币`,
        "success",
      );
    }
  } catch (error) {
    addLog(
      tokenId,
      tokenName,
      `升级挂机奖励异常：${sanitizeError(error)}`,
      "warning",
    );
  }
}

async function runOneBattle(tokenId, tokenName) {
  const state = runningStates[tokenId];
  if (!state || state.stopFlag)
    return { stopped: true };

  let battleTime = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await tokenStore.sendMessageWithPromise(
        tokenId,
        "fight_calcleveltime",
        {},
        15000,
      );
      const body = responseBody(response);
      battleTime = pickNumber(body.battleTime, body.body?.battleTime) || 0;
      const syncedLevel = pickNumber(
        body.currLevel,
        body.levelId,
        body.body?.currLevel,
      );
      const syncedBossName
        = body.bossName || body.body?.bossName || body.role?.bossName || "";

      if (syncedLevel !== null && syncedLevel !== state.level) {
        applyLevel(state, syncedLevel, syncedBossName);
        addLog(tokenId, tokenName, `等级同步：${syncedLevel}`, "info");
        if (state.bossName) {
          addLog(tokenId, tokenName, `BOSS：${state.bossName}`, "info");
        }
      } else if (syncedBossName && syncedBossName !== state.bossName) {
        applyLevel(state, state.level, syncedBossName);
        addLog(tokenId, tokenName, `BOSS同步：${syncedBossName}`, "info");
      } else {
        applyLevel(state, state.level);
      }
      if (battleTime > 0)
        break;

      state.losses += 1;
      state.retries += 1;
      state.lastError = "服务器未返回战斗时间";
      addLog(
        tokenId,
        tokenName,
        `服务器未返回有效战斗时间，重试 ${state.retries}`,
        "warning",
      );
    } catch (error) {
      if (String(error?.message || "").includes("WebSocket") && attempt === 0) {
        if (await ensureConnected(tokenId))
          continue;
      }

      state.losses += 1;
      state.retries += 1;
      state.lastError = sanitizeError(error);
      addLog(
        tokenId,
        tokenName,
        `计算战斗时间失败，重试 ${state.retries}：${state.lastError}`,
        "error",
      );
      return { success: false, error: state.lastError };
    }
  }

  if (battleTime <= 0) {
    if (state.retries >= state.maxRetries)
      state.stopFlag = true;
    return { success: false, error: state.lastError };
  }

  state.totalTime = battleTime;
  state.countdown = battleTime;
  state.battles += 1;
  addLog(
    tokenId,
    tokenName,
    `开始关卡 ${state.level || 0}，预计 ${battleTime}s`,
    "info",
  );

  if (state.level > 0 && state.level % 100 === 1) {
    addLog(
      tokenId,
      tokenName,
      `通过逢100关卡 ${state.level - 1}，自动升级挂机奖励`,
      "info",
    );
    await upgradeHangupReward(tokenId, tokenName);
  }

  const startedAt = Date.now();
  let tick = 0;
  while (state.countdown > 0 && !state.stopFlag) {
    await sleep(1000);
    tick += 1;
    state.countdown = Math.max(
      0,
      Math.ceil((battleTime * 1000 - (Date.now() - startedAt)) / 1000),
    );
    if (tick % 25 === 0) {
      try {
        tokenStore.sendMessage(tokenId, "heart_beat");
      } catch {}
    }
  }

  if (state.stopFlag)
    return { stopped: true };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await tokenStore.sendMessageWithPromise(
        tokenId,
        "fight_level",
        {},
        15000,
      );
      const body = responseBody(response);
      const success = Boolean(body.success || body.isWin);
      const nextLevel = pickNumber(
        body.currLevel,
        body.nextLevel,
        body.levelId,
      );
      const nextBossName
        = body.bossName || body.body?.bossName || body.role?.bossName || "";

      if (success) {
        state.wins += 1;
        state.retries = 0;
        state.consecutiveErrors = 0;
        applyLevel(state, nextLevel || state.level + 1, nextBossName);
        addLog(
          tokenId,
          tokenName,
          `胜利，当前关卡 ${state.level}${state.bossName ? `，BOSS：${state.bossName}` : ""}`,
          "success",
        );
        // 战斗结束后刷新火把状态
        fetchTorchInfo(tokenId, tokenName, { silent: true }).catch(() => {});
        return { success: true };
      }

      state.losses += 1;
      state.retries += 1;
      state.lastError = body.code || body.msg || "服务器判定失败";
      if (state.retries >= state.maxRetries) {
        state.stopFlag = true;
        addLog(
          tokenId,
          tokenName,
          `连续失败 ${state.retries} 次，停止推图`,
          "error",
        );
      } else {
        addLog(tokenId, tokenName, `失败，重试 ${state.retries} 次`, "warning");
      }
      return { success: false, error: state.lastError };
    } catch (error) {
      const errorMessage = sanitizeError(error);
      if (String(error?.message || "").includes("WebSocket") && attempt === 0) {
        if (await ensureConnected(tokenId))
          continue;
      }

      state.losses += 1;
      state.retries += 1;
      state.consecutiveErrors += 1;
      state.lastError = errorMessage;

      if (state.consecutiveErrors >= state.maxConsecutiveErrors) {
        addLog(
          tokenId,
          tokenName,
          `连续战斗异常 ${state.consecutiveErrors} 次，尝试断开重连...`,
          "warning",
        );
        if (await ensureConnected(tokenId)) {
          state.consecutiveErrors = 0;
          addLog(tokenId, tokenName, "重连成功，继续推图", "success");
          if (attempt === 0)
            continue;
        }
      }

      if (state.retries >= state.maxRetries) {
        state.stopFlag = true;
        addLog(
          tokenId,
          tokenName,
          `连续失败 ${state.retries} 次，停止`,
          "error",
        );
      } else {
        addLog(
          tokenId,
          tokenName,
          `战斗异常，重试 ${state.retries} 次：${errorMessage}`,
          "error",
        );
      }
      return { success: false, error: errorMessage };
    }
  }

  return { success: false, error: "未知战斗异常" };
}

async function startOne(tokenId) {
  const tokenName = getTokenName(tokenId);
  if (isRunning(tokenId)) {
    addLog(tokenId, tokenName, "该账号已在推图中", "warning");
    return;
  }

  initState(tokenId, tokenName);
  addLog(tokenId, tokenName, "开始推图", "success");

  if (!(await ensureConnected(tokenId))) {
    runningStates[tokenId].running = false;
    runningStates[tokenId].lastError = "WebSocket 未连接";
    return;
  }

  await initializeBattleData(tokenId, tokenName);

  try {
    const roleInfo = await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
      10000,
    );
    const body = responseBody(roleInfo);
    const level = pickNumber(body.levelId, body.body?.levelId, body.currLevel);
    if (level !== null) {
      applyLevel(runningStates[tokenId], level);
      addLog(tokenId, tokenName, `当前关卡：${level}`, "info");

      try {
        const levelInfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "fight_level",
          {},
          10000,
        );
        const bossName
          = levelInfo?.bossName
            || levelInfo?.body?.bossName
            || levelInfo?.role?.bossName
            || "";
        applyLevel(runningStates[tokenId], level, bossName);
        if (runningStates[tokenId].bossName) {
          addLog(
            tokenId,
            tokenName,
            `BOSS：${runningStates[tokenId].bossName}`,
            "info",
          );
        }
      } catch (levelError) {
        addLog(
          tokenId,
          tokenName,
          `获取BOSS信息失败：${sanitizeError(levelError)}`,
          "info",
        );
      }
    }
    // 启动时查询火把状态
    await fetchTorchInfo(tokenId, tokenName, { silent: true });
  } catch (error) {
    addLog(
      tokenId,
      tokenName,
      `获取当前关卡失败：${sanitizeError(error)}`,
      "warning",
    );
  }

  try {
    while (runningStates[tokenId] && !runningStates[tokenId].stopFlag) {
      const state = runningStates[tokenId];
      // 周期性刷新火把
      if (Date.now() - (state.lastTorchFetch || 0) > TORCH_REFRESH_INTERVAL) {
        fetchTorchInfo(tokenId, tokenName, { silent: true }).catch(() => {});
      }

      const result = await runOneBattle(tokenId, tokenName);
      if (result.stopped)
        break;

      if (!state || state.stopFlag)
        break;

      if (!result.success) {
        if (state.retries >= state.maxRetries)
          break;
        await sleep(3000);
      } else if (!autoContinue.value) {
        addLog(tokenId, tokenName, "自动继续已关闭，推图暂停", "warning");
        state.stopFlag = true;
        break;
      }

      await sleep(2000);
    }
  } catch (error) {
    addLog(tokenId, tokenName, `推图异常：${sanitizeError(error)}`, "error");
  } finally {
    const state = runningStates[tokenId];
    if (state) {
      state.running = false;
      state.countdown = 0;
      const elapsed = Math.round((Date.now() - state.startTime) / 1000);
      addLog(
        tokenId,
        tokenName,
        `推图结束：${state.wins}胜 ${state.losses}败，共 ${state.battles} 场，耗时 ${elapsed}s`,
        state.wins > 0 ? "success" : "warning",
      );
      // 推图结束后再次查询火把状态
      try {
        if (isConnected(tokenId)) {
          await fetchTorchInfo(tokenId, tokenName, { silent: true });
        }
      } catch {}
    }
  }
}

async function startSelected() {
  for (const tokenId of selectedTokenIds.value) {
    if (!isRunning(tokenId)) {
      startOne(tokenId);
      await sleep(2000);
    }
  }
}

function stopOne(tokenId) {
  const tokenName = getTokenName(tokenId);
  const state = runningStates[tokenId];
  if (state) {
    state.stopFlag = true;
    addLog(tokenId, tokenName, "手动停止推图", "warning");
  }
  try {
    tokenStore.closeWebSocketConnection(tokenId);
  } catch {}
}

function stopSelected() {
  selectedTokenIds.value.forEach((tokenId) => {
    if (isRunning(tokenId))
      stopOne(tokenId);
  });
}

async function useTorchForSelected() {
  if (!selectedTokenIds.value.length)
    return;

  const option = torchOptions.find((item) => item.value === torchItemId.value);
  const itemName = option?.label || `#${torchItemId.value}`;
  const quantity = torchQuantity.value || 1;
  torchRunning.value = true;

  let successCount = 0;
  let failCount = 0;

  for (const tokenId of selectedTokenIds.value) {
    const tokenName = getTokenName(tokenId);
    addLog(tokenId, tokenName, `开始使用 ${itemName} x${quantity}`, "info");
    try {
      if (!(await ensureConnected(tokenId))) {
        addLog(tokenId, tokenName, `连接失败，跳过使用 ${itemName}`, "error");
        failCount += 1;
        continue;
      }

      // 1. 使用火把
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "item_consume",
        { itemId: torchItemId.value, quantity },
        10000,
      );
      // 2. 同一连接下立刻查询最新火把状态（不关闭连接）
      try {
        const state = runningStates[tokenId] || initState(tokenId, tokenName);
        if (state !== runningStates[tokenId])
          runningStates[tokenId] = state;
        const roleInfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          10000,
        );
        applyTorchInfo(state, readTorchFromResponse(roleInfo));
      } catch (fetchError) {
        addLog(
          tokenId,
          tokenName,
          `刷新火把状态失败：${sanitizeError(fetchError)}`,
          "warning",
        );
      }

      addLog(
        tokenId,
        tokenName,
        `使用 ${itemName} x${quantity} 完成`,
        "success",
      );
      successCount += 1;
    } catch (error) {
      addLog(
        tokenId,
        tokenName,
        `使用 ${itemName} 失败：${sanitizeError(error)}`,
        "error",
      );
      failCount += 1;
    } finally {
      try {
        tokenStore.closeWebSocketConnection(tokenId);
      } catch {}
    }
  }

  torchRunning.value = false;
  message.success(
    `使用 ${itemName} 完成：成功 ${successCount} 个，失败 ${failCount} 个`,
  );
}

onMounted(() => {
  tickTimer = setInterval(() => {
    tickNow.value = Date.now();
  }, 1000);
});

onBeforeUnmount(() => {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
  Object.values(runningStates).forEach((state) => {
    if (state?.running) {
      state.stopFlag = true;
      try {
        tokenStore.closeWebSocketConnection(state.tokenId);
      } catch {}
    }
  });
});
</script>

<style scoped>
.pushing-levels-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--background);
}

@media (max-width: 640px) {
  .pushing-levels-page {
    padding: 10px;
  }
}
</style>
