<template>
  <MyCard
    class="club-daily-battle"
    :status-class="{ active: isConnected && !!battleResponse }"
  >
    <template #icon>
      <ShieldCheck :size="30"></ShieldCheck>
    </template>
    <template #title>
      <h3>俱乐部战</h3>
      <p>{{ displayDate }} 当日攻打统计</p>
    </template>
    <template #badge>
      <span>{{ badgeText }}</span>
    </template>

    <template #default>
      <div v-if="!isConnected" class="battle-empty">当前账号未连接</div>
      <div v-else-if="errorText" class="battle-error">{{ errorText }}</div>
      <div v-else class="battle-summary" :class="{ 'battle-summary-loading': loading }">
        <div class="battle-total">
          <span>成功次数 / 总次数</span>
          <strong>
            <b>{{ todayStats.successCount }}</b>
            <i>/</i>
            {{ todayStats.attackCount }}
          </strong>
        </div>

        <div class="success-rate">
          <div class="rate-label">
            <span>今日成功率</span>
            <strong>{{ todayStats.successRate }}%</strong>
          </div>
          <div
            aria-label="今日成功率"
            aria-valuemax="100"
            aria-valuemin="0"
            class="rate-track"
            role="progressbar"
            :aria-valuenow="todayStats.successRate"
          >
            <span :style="{ width: `${todayStats.successRate}%` }"></span>
          </div>
        </div>

        <dl class="battle-metrics">
          <div>
            <dt>个人活动积分</dt>
            <dd>{{ todayStats.personalScore }}</dd>
          </div>
          <div>
            <dt>俱乐部今日积分</dt>
            <dd>{{ todayStats.clubDayScore }}</dd>
          </div>
        </dl>
      </div>
      <section v-if="isConnected && !errorText" aria-label="俱乐部成员篝火次数" class="member-preview" :aria-busy="loading">
        <div aria-label="篝火次数统计对象" class="count-side-selector" role="group">
          <Button size="sm" :aria-pressed="!isOpponentView" :disabled="exporting" :variant="!isOpponentView ? 'default' : 'outline'" @click="countSide = 'own'">我方次数</Button>
          <Button size="sm" :aria-pressed="isOpponentView" :disabled="!todayOpponent || exporting" :variant="isOpponentView ? 'default' : 'outline'" @click="countSide = 'opponent'">敌方次数</Button>
        </div>
        <p v-if="!loading && !displayedRows.length">暂无俱乐部成员数据</p>
        <section ref="exportDom" v-if="loading || displayedRows.length" class="bonfire-export-sheet">
          <header class="bonfire-export-header">
            <div>
              <span>{{ isOpponentView ? "敌方进攻统计" : "我方进攻统计" }}</span>
              <h2>{{ displayedClubName }}篝火次数</h2>
            </div>
            <strong>{{ displayDate }}</strong>
          </header>
          <div class="bonfire-export-labels">
            <span>成员</span>
            <span>成功 / 总次数</span>
          </div>
          <div class="bonfire-export-grid">
            <div
              v-for="(member, index) in previewRows"
              :key="member.key || member.roleId"
              class="bonfire-member-row"
              :class="{ unavailable: !loading && !member.available }"
            >
              <span class="bonfire-member-index">{{ index + 1 }}</span>
              <strong :title="member.name"><span v-if="!member.name" aria-hidden="true" class="bonfire-skeleton skeleton-name"></span><template v-else>{{ member.name }}</template></strong>
              <b><span v-if="loading" aria-hidden="true" class="bonfire-skeleton skeleton-count"></span><template v-else>{{ formatMemberCount(member) }}</template></b>
            </div>
          </div>
          <footer>
            <span>北京时间 {{ exportGeneratedTime }}</span>
            <span v-if="loading" role="status">正在查询 {{ displayedProgress.completed }}/{{ displayedProgress.total }} 个据点</span>
            <span v-else-if="displayedProgress.failed" role="status">{{ displayedProgress.failed }} 个据点查询失败；≥ 为已查到次数，-- 为未知</span>
            <span v-else>全部据点查询完成</span>
          </footer>
        </section>
      </section>
      <ClubBonfireOpponents
        v-if="isConnected && battleResponse"
        :response="battleResponse"
        :token-id="tokenId"
      ></ClubBonfireOpponents>
    </template>

    <template #action>
      <Button
        size="sm"
        :disabled="!isConnected || loading || exporting"
        @click="fetchStats"
      >
        <RotateCw :class="{ spinning: loading }"></RotateCw>
        <span>{{ loading ? "正在刷新" : "刷新今日数据" }}</span>
      </Button>
      <Button
        size="sm"
        :disabled="!isConnected || loading || exporting || !displayedRows.length"
        @click="exportMemberBattleCounts"
      >
        <Download></Download>
        <span>{{ exportButtonText }}</span>
      </Button>
    </template>
  </MyCard>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { Download, RotateCw, ShieldCheck } from "@lucide/vue";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { useTokenStore } from "@/stores/tokenStore";
import {
  aggregateClubBattleRecordStats,
  buildClubBattleExportRows,
  buildOpponentClubBattleRows,
  getClubBattleDayKey,
  getClubBattleRecordTargets,
  getTodayClubBattleOpponent,
  getTodayClubBattleStats,
} from "@/utils/clubDailyBattle.js";
import { downloadCanvasAsImage } from "@/utils/imageExport";
import MyCard from "../Common/MyCard.vue";
import ClubBonfireOpponents from "./ClubBonfireOpponents.vue";

const tokenStore = useTokenStore();
const message = useMessage();
const battleResponse = ref(null);
const errorText = ref("");
const loading = ref(false);
const exporting = ref(false);
const exportRows = ref([]);
const countSide = ref("own");
const opponentCounts = ref({ rows: [], completed: 0, total: 0, failed: 0 });
const todayOpponent = computed(() => getTodayClubBattleOpponent(battleResponse.value, now.value));
const isOpponentView = computed(() => countSide.value === "opponent" && Boolean(todayOpponent.value));
const displayedRows = computed(() => isOpponentView.value ? opponentCounts.value.rows : exportRows.value);
const displayedClubName = computed(() => isOpponentView.value ? (todayOpponent.value.name || "敌对俱乐部") : clubName.value);
const displayedProgress = computed(() => isOpponentView.value
  ? opponentCounts.value
  : {
      completed: exportCompletedCount.value,
      total: exportQueryCount.value,
      failed: failedTargetCount.value,
    });
const previewRows = computed(() => {
  if (!loading.value || displayedRows.value.length)
    return displayedRows.value;
  const body = battleResponse.value?.body || battleResponse.value;
  const members = isOpponentView.value
    ? buildOpponentClubBattleRows(body, [], now.value)
    : buildClubBattleExportRows(body || { club: { members: tokenStore.gameData?.legionInfo?.info?.members } });
  return members.length ? members : Array.from({ length: 30 }, (_, index) => ({ roleId: `placeholder-${index}`, name: "" }));
});
const exportDom = ref(null);
const exportCompletedCount = ref(0);
const exportQueryCount = ref(0);
const exportGeneratedAt = ref(null);
const failedTargetCount = ref(0);
const now = ref(new Date());
let requestVersion = 0;
const clock = window.setInterval(() => {
  now.value = new Date();
}, 60_000);

const tokenId = computed(() => tokenStore.selectedToken?.id || "");
const connectionStatus = computed(() =>
  tokenId.value ? tokenStore.getWebSocketStatus(tokenId.value) : "disconnected",
);
const isConnected = computed(() => connectionStatus.value === "connected");
const dayKey = computed(() => getClubBattleDayKey(now.value));
const todayStats = computed(() =>
  getTodayClubBattleStats(battleResponse.value, now.value),
);
const displayDate = computed(() =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
  }).format(now.value),
);
const clubName = computed(
  () =>
    battleResponse.value?.body?.club?.name
    || battleResponse.value?.club?.name
    || tokenStore.gameData?.legionInfo?.info?.name
    || "俱乐部",
);
const exportGeneratedTime = computed(() =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(exportGeneratedAt.value || now.value),
);
const exportButtonText = computed(() => {
  if (!exporting.value)
    return isOpponentView.value ? "导出敌方篝火次数" : "导出我方篝火次数";
  return "正在导出";
});
const badgeText = computed(() => {
  if (!isConnected.value)
    return "未连接";
  if (loading.value)
    return "更新中";
  return `${todayStats.value.successCount}/${todayStats.value.attackCount}`;
});

const fetchStats = async () => {
  if (!tokenId.value || !isConnected.value)
    return null;

  const currentTokenId = tokenId.value;
  const currentRequest = ++requestVersion;
  loading.value = true;
  errorText.value = "";
  exportCompletedCount.value = 0;
  exportQueryCount.value = 0;
  failedTargetCount.value = 0;
  opponentCounts.value = { rows: [], completed: 0, total: 0, failed: 0 };
  try {
    const response = await tokenStore.sendMessageWithPromise(
      currentTokenId,
      "club_getinfo",
      {},
      10_000,
    );
    if (currentRequest === requestVersion && currentTokenId === tokenId.value) {
      battleResponse.value = response;
      await loadMemberBattleCounts(response, currentTokenId, currentRequest);
    }
    return response;
  } catch (error) {
    if (currentRequest === requestVersion) {
      battleResponse.value = null;
      errorText.value = error instanceof Error ? error.message : "查询失败";
    }
    return null;
  } finally {
    if (currentRequest === requestVersion)
      loading.value = false;
  }
};

const queryTargetRecords = async (target, currentTokenId, currentRequest) => {
  const { targetId, targetIsMirror } = target;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (currentRequest !== requestVersion)
      return null;
    try {
      const response = await tokenStore.sendMessageWithPromise(
        currentTokenId,
        "club_getdefenserecord",
        { targetId: Number(targetId), targetIsMirror },
        10_000,
      );
      const records = response?.records ?? response?.body?.records;
      if (!Array.isArray(records))
        throw new Error("未返回有效防守战报");
      return { ...target, records };
    } catch (error) {
      if (attempt === 1)
        console.warn(`查询据点历史记录失败 [${targetId}]`, error);
    }
  }
  return null;
};

const runWithConcurrency = async (items, concurrency, worker) => {
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const item = items[cursor++];
        await worker(item);
      }
    },
  );
  await Promise.all(runners);
};

const formatMemberCount = (member) =>
  member.available ? `${member.partial ? "≥" : ""}${member.successCount}/${member.partial ? "≥" : ""}${member.attackCount}` : "--/--";

const loadMemberBattleCounts = async (sourceResponse, currentTokenId, currentRequest) => {
  exportCompletedCount.value = 0;
  exportQueryCount.value = 0;
  failedTargetCount.value = 0;

  try {
    const body = sourceResponse?.body || sourceResponse || {};
    const members = Object.values(body.club?.members || {});
    if (!members.length) {
      throw new Error("未获取到俱乐部成员名单");
    }

    const targets = getClubBattleRecordTargets(
      Object.values(body.club?.oppoMap || {}).flatMap((opponent) => Object.values(opponent?.defenders || {})),
    );
    exportQueryCount.value = targets.length;
    const recordResponses = [];
    await runWithConcurrency(targets, 1, async (target) => {
      if (currentRequest !== requestVersion)
        return;
      const result = await queryTargetRecords(target, currentTokenId, currentRequest);
      if (currentRequest !== requestVersion)
        return;
      if (result)
        recordResponses.push(result);
      else
        failedTargetCount.value++;
      exportCompletedCount.value++;
    });
    if (currentRequest !== requestVersion)
      return;

    const historyStats = aggregateClubBattleRecordStats(
      recordResponses,
      now.value,
    );
    const statsByRoleId = new Map(
      members.map((member) => [
        String(member.roleId),
        historyStats.get(String(member.roleId)) || (failedTargetCount.value
          ? null
          : {
              successCount: 0,
              attackCount: 0,
            }),
      ]),
    );
    if (body.siege?.roleId) {
      statsByRoleId.set(
        String(body.siege.roleId),
        getTodayClubBattleStats(sourceResponse, now.value),
      );
    }

    exportRows.value = buildClubBattleExportRows(sourceResponse, statsByRoleId).map((member) => ({
      ...member,
      partial: failedTargetCount.value > 0 && member.roleId !== String(body.siege?.roleId),
    }));

    const opponent = getTodayClubBattleOpponent(sourceResponse, now.value);
    if (opponent) {
      const defenseTargets = getClubBattleRecordTargets(body.club.members);
      opponentCounts.value.total = defenseTargets.length;
      const defenseResponses = [];
      await runWithConcurrency(defenseTargets, 1, async (target) => {
        if (currentRequest !== requestVersion)
          return;
        const result = await queryTargetRecords(target, currentTokenId, currentRequest);
        if (currentRequest !== requestVersion)
          return;
        if (result)
          defenseResponses.push(result);
        else
          opponentCounts.value.failed++;
        opponentCounts.value.completed++;
      });
      if (currentRequest !== requestVersion)
        return;
      opponentCounts.value.rows = buildOpponentClubBattleRows(sourceResponse, defenseResponses, now.value, {
        complete: opponentCounts.value.failed === 0,
      });
    }
    exportGeneratedAt.value = new Date();
  } catch (error) {
    if (currentRequest === requestVersion)
      throw error;
  }
};

const exportMemberBattleCounts = async () => {
  if (!isConnected.value || loading.value || exporting.value || !displayedRows.value.length)
    return;
  const currentRequest = requestVersion;
  const exportClubName = displayedClubName.value;
  const exportFailures = displayedProgress.value.failed;
  exporting.value = true;
  try {
    await nextTick();
    await document.fonts?.ready;

    if (!exportDom.value)
      throw new Error("导出内容尚未渲染");
    const sheet = exportDom.value;
    if (!sheet)
      throw new Error("导出内容尚未渲染");
    const canvas = await html2canvas(sheet, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#fff1f5",
      logging: false,
    });
    if (currentRequest !== requestVersion)
      return;
    const safeClubName = exportClubName.replace(/[\\/:*?"<>|]/g, "_");
    downloadCanvasAsImage(
      canvas,
      `${displayDate.value.replace("/", "月")}日${safeClubName}篝火次数.png`,
    );

    if (exportFailures > 0) {
      message.warning(
        `已导出，但有 ${exportFailures} 个据点查询失败，结果可能不完整`,
      );
    } else {
      message.success("俱乐部篝火次数导出成功");
    }
  } catch (error) {
    const exportError = error instanceof Error ? error.message : "导出失败";
    console.error("导出俱乐部篝火次数失败", error);
    if (currentRequest === requestVersion)
      message.error(exportError);
  } finally {
    exporting.value = false;
  }
};

watch(
  [tokenId, connectionStatus, dayKey],
  ([nextTokenId, nextStatus], previous = []) => {
    const [previousTokenId, previousStatus, previousDayKey] = previous;
    if (
      nextTokenId !== previousTokenId
      || nextStatus !== previousStatus
      || dayKey.value !== previousDayKey
    ) {
      requestVersion++;
      battleResponse.value = null;
      exportRows.value = [];
      opponentCounts.value = { rows: [], completed: 0, total: 0, failed: 0 };
      exportGeneratedAt.value = null;
      failedTargetCount.value = 0;
      loading.value = false;
      errorText.value = "";
    }
    if (nextTokenId && nextStatus === "connected")
      fetchStats();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  requestVersion++;
  window.clearInterval(clock);
});
</script>

<style scoped lang="scss">
.count-side-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.member-preview {
  margin-top: 24px;
  min-width: 0;
}
.club-daily-battle {
  .status-icon :deep(svg) {
    color: var(--success-color);
  }
}

.bonfire-export-sheet {
  width: 100%;
  padding: 38px;
  border: 1px solid #f2becd;
  background: #fff1f5;
  color: #452f36;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.bonfire-export-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 22px;
  border-bottom: 2px solid #df8da5;
}

.bonfire-export-header span {
  color: #aa6076;
  font-size: 12px;
  font-weight: 700;
}

.bonfire-export-header h2 {
  margin: 5px 0 0;
  color: #5d3642;
  font-size: 24px;
  overflow-wrap: anywhere;
  letter-spacing: 0;
}

.bonfire-export-header > strong {
  flex-shrink: 0;
  color: #8e5264;
  font-size: 18px;
}

.bonfire-export-labels {
  display: grid;
  padding: 16px 13px 8px 45px;
  grid-template-columns: 1fr auto;
  color: #9a5b6e;
  font-size: 12px;
  font-weight: 700;
}

.bonfire-export-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.bonfire-skeleton {
  display: inline-block;
  vertical-align: middle;
  height: 18px;
  border-radius: 3px;
  background: #edc8d3;
  animation: bonfire-pulse 1.4s ease-in-out infinite;
}
.skeleton-name { width: 80px; max-width: 100%; }
.skeleton-count { width: 44px; }
@keyframes bonfire-pulse { 50% { opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) { .bonfire-skeleton { animation: none; } }

.bonfire-member-row {
  display: grid;
  min-width: 0;
  min-height: 48px;
  align-items: center;
  padding: 8px 13px;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  gap: 8px;
  border: 1px solid #f2c9d5;
  background: #fffafb;
}

.bonfire-member-index {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 50%;
  background: #f5d4de;
  color: #8c5263;
  font-size: 11px;
  font-weight: 700;
}

.bonfire-member-row > strong {
  overflow: hidden;
  color: #50343c;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bonfire-member-row > b {
  color: #b64f70;
  font-size: 17px;
  letter-spacing: 0;
}

.bonfire-member-row.unavailable {
  opacity: 0.64;
}

.bonfire-export-sheet footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 20px;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid #e8acbd;
  color: #936073;
  font-size: 11px;
}

.battle-empty,
.battle-error {
  display: grid;
  min-height: 150px;
  place-items: center;
  color: var(--text-tertiary);
}

.battle-error {
  color: var(--error-color);
}

.battle-summary {
  display: grid;
  gap: 22px;
  opacity: 1;
  transition: opacity var(--transition-fast);
}

.battle-summary.battle-summary-loading {
  opacity: 0.55;
}

.battle-total {
  display: flex;
  min-height: 98px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-light);
}

.battle-total span,
.rate-label span,
.battle-metrics dt {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.battle-total strong {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: var(--text-primary);
  font-size: 36px;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0;
}

.battle-total strong b {
  color: var(--success-color);
  font: inherit;
}

.battle-total strong i {
  color: var(--text-tertiary);
  font-size: 24px;
  font-style: normal;
  font-weight: var(--font-weight-normal);
}

.success-rate {
  display: grid;
  gap: 8px;
}

.rate-track {
  height: 6px;
  overflow: hidden;
  background: var(--muted);
  border-radius: 2px;
}

.rate-track span {
  display: block;
  height: 100%;
  background: var(--success);
  transition: width 200ms ease;
}

.rate-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rate-label strong {
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.battle-metrics {
  display: grid;
  margin: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
}

.battle-metrics > div {
  display: grid;
  min-width: 0;
  padding: 14px 0;
  gap: 5px;
}

.battle-metrics > div + div {
  padding-left: 18px;
  border-left: 1px solid var(--border-light);
}

.battle-metrics dt,
.battle-metrics dd {
  margin: 0;
}

.battle-metrics dd {
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.card-action button {
  gap: 7px;
}

.card-action :deep(svg) {
  width: 16px;
  height: 16px;
}

.spinning {
  animation: battle-spin 800ms linear infinite;
}

@keyframes battle-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 480px) {
  .bonfire-export-sheet {
    padding: 16px;
  }

  .bonfire-export-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .bonfire-export-header h2 {
    font-size: 20px;
  }

  .bonfire-export-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .battle-total {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
