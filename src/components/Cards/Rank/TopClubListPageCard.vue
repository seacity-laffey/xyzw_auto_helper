<template>
  <div class="club-warrank-container">
    <div class="club-warrank-card">
      <TopClubRankToolbar
        v-model:export-methods="exportmethod"
        :has-data="Boolean(battleRecords1?.legionRankList)"
        :loading="loading1"
        :query-date="formatTimestamp1(inputDate1)"
        @export="handleExport1"
        @refresh="handleRefresh1"
      ></TopClubRankToolbar>

      <ClubRankingTable
        ref="rankingTable"
        :format-power="formatPower"
        :format-score="formatScore"
        :has-data="Boolean(battleRecords1?.legionRankList)"
        :loading="loading1"
        :rows="battleRecords1?.legionRankList || []"
        :show-score="false"
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
import { onMounted, ref } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { useClubPlayerDuel } from "@/composables/useClubPlayerDuel";
import html2canvas from "html2canvas";
import { downloadCanvasAsImage } from "@/utils/imageExport";
import { formatTimestamp1, getLastSaturday } from "@/utils/clubBattleUtils";
import {
  allianceincludes,
  formatWarrankRecordsForExport,
} from "@/utils/clubWarrankUtils";
import { HERO_DICT, HeroFillInfo } from "@/utils/heroList";
import ClubHeroDetailDialog from "@/components/Club/ClubHeroDetailDialog.vue";
import ClubPlayerDuelDialog from "@/components/Club/ClubPlayerDuelDialog.vue";
import ClubRankingTable from "@/components/Club/ClubRankingTable.vue";
import TopClubRankToolbar from "@/components/Club/TopClubRankToolbar.vue";

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
const exportmethod = ref(["2"]);
const rankingTable = ref(null);
const message = useMessage();
const tokenStore = useTokenStore();

const loading1 = ref(false);
const battleRecords1 = ref(null);
const queryDate = ref("");
const inputDate1 = ref(getLastSaturday());

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
      "legion_getarearank",
      {},
      10000,
    );

    if (!result?.list) {
      battleRecords1.value = null;
      message.warning("未查询到俱乐部数据");
      return;
    }
    const detailPromises = result.list.map(async (club) => {
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
          hb1: 0,
          hb2: 0,
          hb3: 0,
          topHeroes: [],
          level: 30,
        };
      }
    });
    const processedClubs = await Promise.all(detailPromises);

    // 1. 为每个俱乐部添加联盟信息，直接按返回的list顺序显示
    const sortedLegionList = processedClubs.map((club) => ({
      ...club,
      alliance: allianceincludes(club.announcement),
    }));

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
// 刷新战绩
const handleRefresh1 = () => {
  fetchBattleRecords1();
};

// 导出战绩
const handleExport1 = async () => {
  if (!battleRecords1.value || !battleRecords1.value.legionRankList) {
    message.warning("没有可导出的数据");
    return;
  }

  try {
    if (exportmethod.value.includes("1")) {
      formatWarrankRecordsForExport(
        battleRecords1.value.legionRankList,
        queryDate.value,
      );
    }
    if (exportmethod.value.includes("2")) {
      exportToImage();
    }
    message.success("导出成功");
  } catch (error) {
    console.error("导出失败:", error);
    message.error("导出失败，请重试");
  }
};

const exportToImage = async () => {
  const exportElement = rankingTable.value?.getExportElement();
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
    const filename
      = `${inputDate1.value.replace("/", "年").replace("/", "月")
      }日TOP五百服俱乐部信息.png`;
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

// Inline 模式：挂载后自动拉取
onMounted(() => {
  fetchBattleRecords1();
});
</script>

<style scoped lang="scss">
// 主容器样式
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
