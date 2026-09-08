<template>
  <div class="club-warrank-container">
    <div class="club-warrank-card">
      <GoldRankToolbar
        v-model:export-batch-size="exportBatchSize"
        v-model:export-methods="exportmethod"
        v-model:selected-group="selectedGroup"
        :has-data="Boolean(battleRecords1?.legionRankList)"
        :loading="loading1"
        :query-date="formatTimestamp1(inputDate1)"
        @export="handleExport1"
        @refresh="handleRefresh1"
      ></GoldRankToolbar>

      <ClubRankingTable
        ref="rankTable"
        :format-power="formatPower"
        :format-score="formatScore"
        :has-data="Boolean(battleRecords1?.legionRankList)"
        :loading="loading1"
        :rows="battleRecords1?.legionRankList || []"
        :start-rank="ProcessingstartRank(selectedGroup)"
        @select-hero="handleHeroClick"
      ></ClubRankingTable>
    </div>

    <ClubPlayerDuelDialog
      v-model:open="showPlayerInfoModal"
      :die-stats="dieStats"
      :fight-count="fightCount"
      :fight-count-valid="isFightCountValid"
      :fight-progress="fightProgress"
      :fight-result="fightResult"
      :player="playerInfo"
      @close-result="fightResult.visible = false"
      @duel="handleDuel"
      @reset-result="resetFightResult"
      @select-hero="selectHeroInfo"
      @update:fight-count="handleFightCountUpdate"
    ></ClubPlayerDuelDialog>

    <ClubHeroDetailDialog
      v-model:open="showHeroModal"
      :hero="heroModealTemp"
    ></ClubHeroDetailDialog>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { useClubPlayerDuel } from "@/composables/useClubPlayerDuel";
import html2canvas from "html2canvas";
import { downloadCanvasAsImage } from "@/utils/imageExport";
import { formatTimestamp1, getLastSaturday } from "@/utils/clubBattleUtils";
import {
  allianceincludes,
  formatWarrankRecordsForExport,
} from "@/utils/goldWarrankUtils";
import { HERO_DICT, HeroFillInfo } from "@/utils/heroList";
import ClubHeroDetailDialog from "@/components/Club/ClubHeroDetailDialog.vue";
import ClubPlayerDuelDialog from "@/components/Club/ClubPlayerDuelDialog.vue";
import ClubRankingTable from "@/components/Club/ClubRankingTable.vue";
import GoldRankToolbar from "@/components/Club/GoldRankToolbar.vue";

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  inline: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["update:visible"]);
const exportmethod = ref([""]);
const exportBatchSize = ref(60);
const rankTable = ref(null);
const message = useMessage();
const tokenStore = useTokenStore();

const loading1 = ref(false);
const battleRecords1 = ref(null);
const selectedGroup = ref("gold1");
const inputDate1 = ref(getLastSaturday());

const ProcessingstartRank = (selectgroup) => {
  switch (selectgroup) {
    case "gold1":
      return 1;
    case "gold2":
      return 101;
    case "gold3":
      return 201;
    case "gold4":
      return 301;
    case "gold5":
      return 401;
    default:
      return 1;
  }
};

const ProcessingendRank = (selectgroup) => {
  switch (selectgroup) {
    case "gold1":
      return 100;
    case "gold2":
      return 200;
    case "gold3":
      return 300;
    case "gold4":
      return 400;
    case "gold5":
      return 500;
    default:
      return 100;
  }
};

// 格式化战力
const formatPower = (power) => {
  if (!power)
    return "0";
  if (power >= 100000000) {
    return `${(power / 100000000).toFixed(2)}亿`;
  }
  if (power >= 10000) {
    return `${(power / 10000).toFixed(2)}万`;
  }
  return power.toString();
};

const {
  dieStats,
  fightCount,
  fightProgress,
  fightResult,
  handleDuel,
  handleFightCountUpdate,
  handleHeroClick,
  heroModealTemp,
  isFightCountValid,
  playerInfo,
  resetFightResult,
  selectHeroInfo,
  showHeroModal,
  showPlayerInfoModal,
} = useClubPlayerDuel({
  tokenStore,
  message,
  fillPearls: HeroFillInfo,
  formatPower,
  heroDict: HERO_DICT,
});

const formatScore = (Score) => {
  return Score ? Score.toFixed(0).toString() : "0";
};

// 查询战绩
const fetchBattleRecords1 = async () => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择游戏角色");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  // 检查WebSocket连接
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.error("WebSocket未连接，无法查询战绩");
    return;
  }

  loading1.value = true;
  try {
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "legionwar_getgoldmonthwarrank",
      {
        startRank: ProcessingstartRank(selectedGroup.value),
        endRank: ProcessingendRank(selectedGroup.value),
      },
      10000,
    );

    if (!result?.legionList) {
      battleRecords1.value = null;
      message.warning("未查询到俱乐部数据");
      return;
    }

    const sortedLegionList = await fetchLegionDetails(
      result.legionList,
      tokenId,
    );

    battleRecords1.value = {
      ...result,
      legionRankList: sortedLegionList,
    };
    message.success("俱乐部数据加载成功");
  } catch (error) {
    console.error("查询失败:", error);
    message.error(`查询失败: ${error.message}`);
    battleRecords1.value = null;
  } finally {
    loading1.value = false;
  }
};

// 提取单个俱乐部详情查询逻辑
const fetchSingleLegionDetail = async (club, tokenId) => {
  try {
    const detail = await tokenStore.sendMessageWithPromise(
      tokenId,
      "legion_getinfobyid",
      { legionId: club.id },
      10000,
    );
    if (!detail) {
      return {
        ...club,
        redQuench: 0,
        power: 0,
        announcement: "未知",
        redno: 0,
        redno1: "0红",
        redno2: "0红",
        redno3: "0红",
        hb1: 0,
        hb2: 0,
        hb3: 0,
        topHeroes: [],
        level: 30,
      };
    }
    const topHeroes = [];
    const members = detail?.legionData?.members || {};

    for (const [roleId, memberData] of Object.entries(members)) {
      topHeroes.push({
        id: roleId,
        name: memberData.name || memberData.custom?.name || "未知",
        headImg: memberData.headImg || memberData.custom?.headImg || "",
        power: memberData?.power || 0,
        score: memberData?.score || 0,
        redQuench: memberData.custom?.red_quench_cnt || 0,
      });
    }

    // 按红淬数量降序排序，取前三
    topHeroes.sort((a, b) => b.redQuench - a.redQuench);
    const top3Heroes = topHeroes.slice(0, 3);

    // 提取红淬数量数组
    const redQuenchCounts = top3Heroes.map((hero) => `${hero.redQuench}红`);
    // 提取圣物数量数组
    const HolyBeastNum = top3Heroes.map((hero) => hero.holyBeast);

    return {
      ...club,
      redQuench: detail?.legionData?.quenchNum || 0,
      power: detail?.legionData?.power || 0,
      announcement: detail?.legionData?.announcement || 0,
      redno: redQuenchCounts || 0,
      redno1: redQuenchCounts[0] || "0红",
      redno2: redQuenchCounts[1] || "0红",
      redno3: redQuenchCounts[2] || "0红",
      hb1: HolyBeastNum[0] || 0,
      hb2: HolyBeastNum[1] || 0,
      hb3: HolyBeastNum[2] || 0,
      topHeroes: top3Heroes,
      level: 30,
      alliance: allianceincludes(detail?.legionData?.announcement || 0),
    };
  } catch (error) {
    console.error(`查询俱乐部${club.id}详情失败:`, error);
    return {
      ...club,
      redQuench: 0,
      power: 0,
      announcement: "未知",
      redno: 0,
      redno1: "0红",
      redno2: "0红",
      redno3: "0红",
      score: 0,
      hb1: 0,
      hb2: 0,
      hb3: 0,
      topHeroes: [],
      level: 30,
      alliance: "未知联盟",
    };
  }
};

// 提取的俱乐部详情查询函数（批量处理）
const fetchLegionDetails = async (legionList, tokenId) => {
  const detailPromises = legionList.map((club) =>
    fetchSingleLegionDetail(club, tokenId),
  );
  return await Promise.all(detailPromises);
};

// 刷新战绩
const handleRefresh1 = () => {
  fetchBattleRecords1();
};

// 导出战绩
const handleExport1 = async () => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择游戏角色");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  try {
    if (exportmethod.value.includes("1")) {
      // 如果选择表格导出，导出1-500名数据
      const loadingBasicsMsg = message.loading("正在获取俱乐部列表...", {
        duration: 0,
      });

      const allLegionBasics = [];
      const groups = ["gold1", "gold2", "gold3", "gold4", "gold5"];

      // 1. 获取所有 500 个俱乐部基础信息
      for (const group of groups) {
        const startRank = ProcessingstartRank(group);
        const endRank = ProcessingendRank(group);

        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legionwar_getgoldmonthwarrank",
          {
            startRank,
            endRank,
          },
          10000,
        );

        if (result?.legionList) {
          allLegionBasics.push(...result.legionList);
        }
        // 基础列表获取很快，稍微延时一下即可
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (allLegionBasics.length === 0) {
        message.destroyAll();
        message.warning("没有可导出的数据");
        return;
      }

      // 获取完基础列表后，销毁第一个loading
      loadingBasicsMsg.destroy();

      // 2. 分批处理详情
      const allData = [];
      const BATCH_SIZE = exportBatchSize.value;
      const total = allLegionBasics.length;
      let processed = 0;

      const prepareMsg = message.loading(
        `准备导出 ${total} 个俱乐部数据，预计耗时 ${Math.ceil(total / BATCH_SIZE)} 分钟...`,
        { duration: 0 },
      );

      // 创建一个持久的 loading message
      const loadingMsg = message.loading(
        `正在导出... 进度 0/${total} (请勿关闭页面)`,
        { duration: 0 },
      );

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batchStartTime = Date.now();
        const batch = allLegionBasics.slice(i, i + BATCH_SIZE);

        // 处理当前批次
        // 为了防止瞬间并发60个请求，我们在批次内部也稍微做一下平滑处理
        // 使用 map 并发请求，但通过 Promise.all 统一等待
        // 如果服务器对并发有严格限制，可以考虑在这里改为串行或限制并发数
        // 鉴于用户要求是“每分钟60个”，这里我们直接并发处理这60个，因为总量控制住了
        const batchPromises = batch.map(async (club) => {
          const res = await fetchSingleLegionDetail(club, tokenId);
          processed++;
          // 实时更新进度
          loadingMsg.content = `正在导出... 进度 ${processed}/${total} (请勿关闭页面)`;
          return res;
        });

        const batchResults = await Promise.all(batchPromises);
        allData.push(...batchResults);

        // 如果还有剩余数据，需要等待，确保每分钟不超过60个
        if (processed < total) {
          const elapsed = Date.now() - batchStartTime;
          // 确保至少等待 60 秒（加一点缓冲 61秒）
          const waitTime = Math.max(0, 61000 - elapsed);

          if (waitTime > 0) {
            // 显示倒计时提示
            let remainingSeconds = Math.ceil(waitTime / 1000);
            const timer = setInterval(() => {
              remainingSeconds--;
              if (remainingSeconds <= 0) {
                clearInterval(timer);
              } else {
                loadingMsg.content = `正在导出... 进度 ${processed}/${total} (等待 ${remainingSeconds}秒 继续下一批)`;
              }
            }, 1000);

            // 等待
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            clearInterval(timer);
          }
        }
      }

      loadingMsg.destroy(); // 完成后销毁
      prepareMsg.destroy(); // 销毁准备导出的提示

      formatWarrankRecordsForExport(allData, formatTimestamp1(new Date()));
      message.success("表格导出成功");
    }
    if (exportmethod.value.includes("2")) {
      // 图片导出保持原样，只导出当前显示的
      if (!battleRecords1.value || !battleRecords1.value.legionRankList) {
        message.warning("当前没有可导出的图片数据");
      } else {
        exportToImage();
        message.success("图片导出成功");
      }
    }
  } catch (error) {
    message.destroyAll();
    console.error("导出失败:", error);
    message.error("导出失败，请重试");
  }
};

const exportToImage = async () => {
  const exportElement = rankTable.value?.getExportElement();
  if (!exportElement) {
    message.error("未找到要导出的内容");
    return;
  }

  const originalHeight = exportElement.style.height;
  const originalOverflow = exportElement.style.overflow;

  try {
    // 临时调整表格容器高度，确保所有内容可见
    exportElement.style.height = "auto";
    exportElement.style.overflow = "visible";

    // 等待DOM更新
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 5. 用html2canvas渲染DOM为Canvas
    const canvas = await html2canvas(exportElement, {
      scale: 2, // 放大2倍，解决图片模糊问题
      useCORS: true, // 允许跨域图片（若DOM内有远程图片，需开启）
      backgroundColor: "#ffffff", // 避免透明背景（默认透明）
      logging: false, // 关闭控制台日志
      height: exportElement.scrollHeight, // 确保捕获完整高度
      width: exportElement.scrollWidth, // 确保捕获完整宽度
      windowWidth: exportElement.scrollWidth, // 设置窗口宽度
      windowHeight: exportElement.scrollHeight, // 设置窗口高度
      allowTaint: true, // 允许跨域图片污染画布
    });

    // 6. Canvas转图片链接并下载
    const filename = `${inputDate1.value
      .replace("/", "年")
      .replace("/", "月")}日黄金积分俱乐部信息.png`;
    downloadCanvasAsImage(canvas, filename);
  } catch (err) {
    console.error("DOM转图片失败：", err);
    message.error("导出图片失败，请重试");
  } finally {
    // 恢复原始样式
    exportElement.style.height = originalHeight;
    exportElement.style.overflow = originalOverflow;
  }
};

// 暴露方法给父组件
defineExpose({
  fetchBattleRecords1,
});
</script>

<style scoped lang="scss">
// 主容器样式
.club-warrank-container {
  width: 100%;
  height: 100%;
  padding: 0;
  box-sizing: border-box;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

// 卡片样式
.club-warrank-card {
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .club-warrank-container {
    padding: var(--spacing-xs);
  }
}
</style>
