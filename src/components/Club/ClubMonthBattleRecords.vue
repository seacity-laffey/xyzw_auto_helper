<template>
  <div class="club-month-battle-records-container">
    <div class="club-month-battle-records-card">
      <header class="header-section">
        <div class="header-left">
          <img alt="俱乐部图标" class="header-icon" src="/icons/moonPalace.png">
          <div class="header-title">
            <h2>俱乐部盐场本月战绩</h2>
            <p>俱乐部盐场本月战斗记录详情</p>
          </div>
        </div>

        <div class="header-actions">
          <NButton size="small" :disabled="loading" @click="handleRefresh">
            <template #icon>
              <NIcon><Refresh></Refresh></NIcon>
            </template>
            刷新
          </NButton>
          <NButton
            size="small"
            type="primary"
            :disabled="!hasMonthlyRecords || loading"
            @click="handleExport"
          >
            <template #icon>
              <NIcon><Copy></Copy></NIcon>
            </template>
            导出
          </NButton>
        </div>
      </header>

      <main class="battle-records-content">
        <div v-if="loading" class="loading-state">
          <NSpin size="large">
            <template #description>正在加载本月战绩数据...</template>
          </NSpin>
        </div>

        <div ref="exportDom" v-else-if="hasMonthlyRecords" class="records-list">
          <ClubMonthBattleRecordsReport
            variant="style1"
            :battle-dates="battleDates"
            :club-name="clubName"
            :members="monthlySummary.members"
            :month="currentMonthDisplay"
            :report-records="monthlySummary.reportRecords"
            :stats="monthlySummary.stats"
          ></ClubMonthBattleRecordsReport>
        </div>

        <div v-else class="empty-state">
          <NEmpty description="暂无战绩数据" size="large">
            <template #icon>
              <NIcon><DocumentText></DocumentText></NIcon>
            </template>
          </NEmpty>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { Copy, DocumentText, Refresh } from "@vicons/ionicons5";
import html2canvas from "html2canvas";
import ClubMonthBattleRecordsReport from "@/components/Club/ClubMonthBattleRecordsReport.vue";
import { useTokenStore } from "@/stores/tokenStore";
import {
  createClubMonthBattleSummary,
  formatClubBattleMonth,
  getCurrentMonthBattleDates,
  loadClubMonthBattleRecords,
} from "@/utils/clubMonthBattleRecordData";
import { downloadCanvasAsImage } from "@/utils/imageExport";
import { createLatestRequestController } from "@/utils/latestRequest";

const message = useMessage();
const tokenStore = useTokenStore();
const exportDom = ref(null);
const monthlyBattleRecords = ref({});
const battleDates = ref([]);
const loading = ref(false);
const monthlyRequests = createLatestRequestController((isLoading) => {
  loading.value = isLoading;
});

const hasMonthlyRecords = computed(
  () => Object.keys(monthlyBattleRecords.value).length > 0,
);
const monthlySummary = computed(() =>
  createClubMonthBattleSummary(monthlyBattleRecords.value),
);
const currentMonthDisplay = computed(() => formatClubBattleMonth());
const clubName = computed(
  () => tokenStore.gameData?.legionInfo?.info?.name || "俱乐部",
);

const fetchBattleRecordsForDate = async (tokenId, date, isCurrentRequest) => {
  try {
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "legionwar_getdetails",
      { date },
      10000,
    );
    if (!isCurrentRequest())
      return null;

    return {
      ...result,
      date,
      roleDetailsList: Array.isArray(result?.roleDetailsList)
        ? [...result.roleDetailsList].sort(
            (left, right) => (right.winCnt || 0) - (left.winCnt || 0),
          )
        : [],
    };
  } catch (error) {
    if (isCurrentRequest()) {
      console.error(`查询${date}战绩失败:`, error);
      message.error(`查询${date}战绩失败: ${error.message}`);
    }
    return { date, roleDetailsList: [] };
  }
};

const fetchMonthlyBattleRecords = async () => {
  const tokenId = tokenStore.selectedToken?.id;
  if (!tokenId) {
    monthlyRequests.cancel();
    monthlyBattleRecords.value = {};
    message.warning("请先选择游戏角色");
    return;
  }
  if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
    monthlyRequests.cancel();
    monthlyBattleRecords.value = {};
    message.error("WebSocket未连接，无法查询战绩");
    return;
  }

  const dates = getCurrentMonthBattleDates();
  return monthlyRequests.run(
    `${tokenId}:${dates.join(",")}`,
    async (isCurrentRequest) => {
      const records = await loadClubMonthBattleRecords(
        dates,
        (date) => fetchBattleRecordsForDate(tokenId, date, isCurrentRequest),
        isCurrentRequest,
      );
      if (!records)
        return;

      battleDates.value = dates;
      monthlyBattleRecords.value = records;
      message.success("本月战绩加载成功");
    },
  );
};

const handleRefresh = () => fetchMonthlyBattleRecords();

const exportToImage = async () => {
  if (!exportDom.value)
    throw new Error("未找到要导出的战绩内容");

  const canvas = await html2canvas(exportDom.value, {
    backgroundColor: "#ffffff",
    logging: false,
    scale: 2,
    useCORS: true,
  });
  const monthYear = currentMonthDisplay.value.replace("年", "-").replace("月", "");
  downloadCanvasAsImage(canvas, `${monthYear}月盐场战绩总览.png`);
};

const handleExport = async () => {
  if (!hasMonthlyRecords.value) {
    message.warning("没有可导出的数据");
    return;
  }

  try {
    await exportToImage();
    message.success("导出成功");
  } catch (error) {
    console.error("导出失败:", error);
    message.error("导出失败，请重试");
  }
};

defineExpose({ fetchMonthlyBattleRecords });

onMounted(fetchMonthlyBattleRecords);
onBeforeUnmount(() => monthlyRequests.cancel());

watch(
  () => tokenStore.selectedToken?.id,
  (newTokenId, oldTokenId) => {
    if (newTokenId === oldTokenId)
      return;
    monthlyBattleRecords.value = {};
    fetchMonthlyBattleRecords();
  },
);
</script>

<style scoped>
.club-month-battle-records-container { width: 100%; height: 100%; overflow: hidden; box-sizing: border-box; }
.club-month-battle-records-card { display: flex; width: 100%; min-width: 0; height: 100%; box-sizing: border-box; flex-direction: column; border: 1px solid var(--border-light); background: var(--bg-primary); }
.header-section { display: flex; min-width: 0; box-sizing: border-box; flex-shrink: 0; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-md); border-bottom: 1px solid var(--border-light); }
.header-left, .header-actions { display: flex; align-items: center; gap: var(--spacing-sm); }
.header-icon { width: 40px; height: 40px; object-fit: contain; }
.header-title h2 { margin: 0; color: var(--text-primary); font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); letter-spacing: 0; }
.header-title p { margin: 2px 0 0; color: var(--text-secondary); font-size: var(--font-size-sm); }
.battle-records-content { min-width: 0; box-sizing: border-box; flex: 1; overflow-y: auto; padding: var(--spacing-md); }
.records-list { width: 100%; min-width: 0; box-sizing: border-box; }
.loading-state, .empty-state { display: flex; min-height: 200px; align-items: center; justify-content: center; }

@media (max-width: 768px) {
  .header-section { align-items: flex-start; flex-direction: column; }
  .header-actions { display: grid; width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .header-actions :deep(.n-button) { width: 100%; }
  .battle-records-content { padding: var(--spacing-sm); }
}
</style>
