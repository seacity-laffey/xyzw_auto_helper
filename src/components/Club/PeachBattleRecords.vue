<template>
  <div class="records-container">
    <header class="header-section">
      <div class="header-left">
        <img
          alt="蟠桃图标"
          class="header-icon"
          src="/icons/1733492491706152.png"
        >
        <div class="header-title">
          <h2>蟠桃园战绩</h2>
          <p>查看蟠桃园对战详细数据</p>
        </div>
      </div>

      <div v-if="hasBattleRecords" class="stats-section">
        <span>查询日期</span>
        <strong>{{ queryDate }}</strong>
      </div>
    </header>

    <div class="function-section">
      <NRadioGroup size="small" v-model:value="currentStyle">
        <NRadioButton value="default">默认</NRadioButton>
        <NRadioButton value="style1">样式一</NRadioButton>
        <NRadioButton value="style2">样式二</NRadioButton>
      </NRadioGroup>

      <div class="function-right">
        <ADatePicker
          format="YYYY/MM/DD"
          value-format="YYYY/MM/DD"
          v-model:value="queryDate"
          :default-value="queryDate"
          :disabled-date="disabledDate"
          @change="fetchBattleRecordsByDate"
        ></ADatePicker>
        <NButton size="small" :disabled="loading" @click="handleRefresh">
          <template #icon>
            <NIcon><Refresh></Refresh></NIcon>
          </template>
          刷新
        </NButton>
        <NButton
          size="small"
          type="primary"
          :disabled="!hasBattleRecords || loading"
          @click="handleExport"
        >
          <template #icon>
            <NIcon><Copy></Copy></NIcon>
          </template>
          导出
        </NButton>
      </div>
    </div>

    <main class="battle-records-content">
      <div v-if="loading" class="loading-state">
        <NSpin size="large">
          <template #description>正在加载战绩数据...</template>
        </NSpin>
      </div>

      <div ref="exportDom" v-else-if="hasBattleRecords" class="records-wrapper">
        <PeachBattleRecordsReport
          :date="queryDate"
          :records="battleRecords"
          :variant="currentStyle"
        ></PeachBattleRecordsReport>
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
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { NRadioButton, NRadioGroup, useMessage } from "naive-ui";
import { Copy, DocumentText, Refresh } from "@vicons/ionicons5";
import html2canvas from "html2canvas";
import PeachBattleRecordsReport from "@/components/Club/PeachBattleRecordsReport.vue";
import { useTokenStore } from "@/stores/tokenStore";
import { downloadCanvasAsImage } from "@/utils/imageExport";
import { createLatestRequestController } from "@/utils/latestRequest";
import {
  createPeachBattleRecords,
  formatPeachBattleDateKey,
  getLastPeachBattleSunday,
} from "@/utils/peachBattleRecordData";

const message = useMessage();
const tokenStore = useTokenStore();
const exportDom = ref(null);
const battleRecords = ref(null);
const loading = ref(false);
const queryDate = ref(getLastPeachBattleSunday());
const currentStyle = ref(
  localStorage.getItem("peach_battle_records_style") || "default",
);
const battleRequests = createLatestRequestController((isLoading) => {
  loading.value = isLoading;
});

const hasBattleRecords = computed(
  () => Boolean(battleRecords.value?.ownClub && battleRecords.value?.opponentClub),
);

watch(currentStyle, (newStyle) => {
  localStorage.setItem("peach_battle_records_style", newStyle);
});

const disabledDate = (date) => date.getDay() !== 0 || date > Date.now();

const fetchBattleRecords = async () => {
  const tokenId = tokenStore.selectedToken?.id;
  if (!tokenId) {
    battleRequests.cancel();
    battleRecords.value = null;
    message.warning("请先选择游戏角色");
    return;
  }
  if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
    battleRequests.cancel();
    battleRecords.value = null;
    message.error("WebSocket未连接，无法查询战绩");
    return;
  }

  const requestedDate = queryDate.value;
  const dateKey = formatPeachBattleDateKey(requestedDate);
  return battleRequests.run(
    `${tokenId}:${requestedDate}`,
    async (isCurrentRequest) => {
      try {
        const payloadTask = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getpayloadtask",
          {},
          10000,
        );
        if (!isCurrentRequest())
          return;
        const firstLegionId = payloadTask?.firstLegionId;
        if (!firstLegionId)
          throw new Error("未获取到我方俱乐部");

        const payloadRecord = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getpayloadrecord",
          {},
          10000,
        );
        if (!isCurrentRequest())
          return;
        const secondLegionId = payloadRecord?.enemyLegionMap?.[dateKey]?.id;
        if (!secondLegionId) {
          battleRecords.value = null;
          message.warning(`未找到日期 ${requestedDate} 的对战记录`);
          return;
        }

        const firstLegionInfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getinfobyid",
          { legionId: firstLegionId },
          10000,
        );
        if (!isCurrentRequest())
          return;
        const secondLegionInfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getinfobyid",
          { legionId: secondLegionId },
          10000,
        );
        if (!isCurrentRequest())
          return;
        const killRecord = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getpayloadkillrecord",
          { date: dateKey },
          10000,
        );
        if (!isCurrentRequest())
          return;
        if (!killRecord)
          throw new Error("未获取到对战俱乐部战绩");

        battleRecords.value = createPeachBattleRecords({
          firstLegionId,
          firstLegionInfo,
          killRecord,
          secondLegionId,
          secondLegionInfo,
        });
        message.success("战绩加载成功");
      } catch (error) {
        if (!isCurrentRequest())
          return;
        console.error("查询战绩失败:", error);
        message.error(`查询失败: ${error.message}`);
        battleRecords.value = null;
      }
    },
  );
};

const fetchBattleRecordsByDate = (date) => {
  queryDate.value = date || getLastPeachBattleSunday();
  return fetchBattleRecords();
};
const handleRefresh = () => fetchBattleRecords();

const exportToImage = async () => {
  if (!exportDom.value)
    throw new Error("未找到要导出的战绩内容");
  const canvas = await html2canvas(exportDom.value, {
    backgroundColor: "#ffffff",
    logging: false,
    scale: 2,
    useCORS: true,
  });
  const filename = `${queryDate.value.replaceAll("/", "-")}蟠桃园战报.png`;
  downloadCanvasAsImage(canvas, filename);
};

const handleExport = async () => {
  if (!hasBattleRecords.value) {
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

defineExpose({ fetchBattleRecords });

onMounted(fetchBattleRecords);
onBeforeUnmount(() => battleRequests.cancel());

watch(
  () => tokenStore.selectedToken?.id,
  (newTokenId, oldTokenId) => {
    if (newTokenId === oldTokenId)
      return;
    battleRecords.value = null;
    fetchBattleRecords();
  },
);
</script>

<style scoped>
.records-container { display: flex; width: 100%; min-width: 0; height: 100%; box-sizing: border-box; flex-direction: column; overflow: hidden; background: var(--bg-primary); }
.header-section { display: flex; min-width: 0; flex-shrink: 0; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-lg); border-bottom: 1px solid var(--border-light); }
.header-left { display: flex; min-width: 0; align-items: center; gap: var(--spacing-md); }
.header-icon { width: 40px; height: 40px; box-sizing: border-box; padding: var(--spacing-xs); border-radius: var(--border-radius-md); background: var(--bg-secondary); object-fit: contain; }
.header-title { min-width: 0; }
.header-title h2 { margin: 0; color: var(--text-primary); font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); letter-spacing: 0; }
.header-title p { margin: var(--spacing-xs) 0 0; color: var(--text-secondary); font-size: var(--font-size-sm); }
.stats-section { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: var(--font-size-sm); }
.stats-section strong { padding: 4px 8px; border: 1px solid var(--border-light); color: var(--text-primary); }
.function-section { display: flex; min-width: 0; flex-shrink: 0; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-md) var(--spacing-lg); border-bottom: 1px solid var(--border-light); background: var(--bg-secondary); }
.function-right { display: flex; min-width: 0; align-items: center; gap: var(--spacing-sm); }
.function-right :deep(.arco-picker) { width: 170px; }
.battle-records-content { min-width: 0; box-sizing: border-box; flex: 1; overflow-y: auto; padding: var(--spacing-md); }
.records-wrapper { width: 100%; min-width: 0; box-sizing: border-box; }
.loading-state, .empty-state { display: flex; min-height: 200px; align-items: center; justify-content: center; }

@media (max-width: 768px) {
  .header-section { align-items: flex-start; flex-direction: column; padding: var(--spacing-md); }
  .stats-section { width: 100%; justify-content: space-between; }
  .function-section { align-items: stretch; flex-direction: column; padding: var(--spacing-md); }
  .function-section :deep(.n-radio-group) { display: flex; width: 100%; }
  .function-section :deep(.n-radio-button) { flex: 1; }
  .function-right { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; }
  .function-right :deep(.arco-picker) { width: 100%; min-width: 0; }
  .battle-records-content { padding: var(--spacing-sm); }
}
</style>
