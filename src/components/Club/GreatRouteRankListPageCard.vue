<template>
  <div class="club-warrank-container">
    <div class="club-warrank-card">
      <GreatRouteRankToolbar
        :club-count="totalClubs"
        :has-data="Boolean(battleRecords1?.legionRankList)"
        :island-name="currentTargetDate"
        :loading="loading1"
        @export="handleExport1"
        @refresh="handleRefresh1"
      ></GreatRouteRankToolbar>

      <GreatRouteRankingTable
        ref="rankingTable"
        :format-power="formatPower"
        :format-score="formatScore"
        :has-data="Boolean(battleRecords1?.legionRankList)"
        :loading="loading1"
        :page="currentPage"
        :page-size="pageSize"
        :rows="battleRecords1?.legionRankList || []"
        :total-clubs="totalClubs"
        @select-hero="handleHeroClick"
        @update:page="handlePageChange"
      ></GreatRouteRankingTable>
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
import { computed, onMounted, ref } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { useClubPlayerDuel } from "@/composables/useClubPlayerDuel";
import html2canvas from "html2canvas";
import { downloadCanvasAsImage } from "@/utils/imageExport";
import {
  getFirstSaturdayOfMonth,
  getRankParams,
  getRankQueryDate,
} from "@/utils/clubBattleUtils";
import { allianceincludes } from "@/utils/clubWarrankUtils";
import { HERO_DICT, HeroFillInfo } from "@/utils/heroList";
import ClubHeroDetailDialog from "@/components/Club/ClubHeroDetailDialog.vue";
import ClubPlayerDuelDialog from "@/components/Club/ClubPlayerDuelDialog.vue";
import GreatRouteRankingTable from "@/components/Club/GreatRouteRankingTable.vue";
import GreatRouteRankToolbar from "@/components/Club/GreatRouteRankToolbar.vue";

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
const rankingTable = ref(null);
const message = useMessage();
const tokenStore = useTokenStore();

const loading1 = ref(false);
const battleRecords1 = ref(null);
const fullRankList = ref([]);
const currentPage = ref(1);
const pageSize = 20;
const totalClubs = computed(() => fullRankList.value.length);
const currentWarType = ref(null);
const currentTargetDate = ref("");
const queryDate = ref("");

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

const pageCache = ref(new Map());

// 分页加载数据
const loadPageData = async (page) => {
  if (fullRankList.value.length === 0) {
    battleRecords1.value = null;
    return;
  }

  // Check cache first
  if (pageCache.value.has(page)) {
    const cachedData = pageCache.value.get(page);
    battleRecords1.value = {
      legionRankList: cachedData,
    };
    return;
  }

  loading1.value = true;
  try {
    const tokenId = tokenStore.selectedToken.id;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = fullRankList.value.slice(start, end);

    // Process pageItems (which are rank items)
    const detailPromises = pageItems.map(async (item) => {
      try {
        const detail = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getinfobyid",
          { legionId: item.id },
          10000,
        );

        if (!detail) {
          return {
            ...item,
            id: item.id,
            rank: item.rank || 0,
            redQuench: item.redQuench || 0,
            power: item.power || 0,
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
            holyBeast: memberData.custom?.holy_beast_cnt || 0,
          });
        }

        // Sort and slice top 3
        topHeroes.sort((a, b) => b.redQuench - a.redQuench);
        const top3Heroes = topHeroes.slice(0, 3);

        const redQuenchCounts = top3Heroes.map((hero) => `${hero.redQuench}红`);
        const HolyBeastNum = top3Heroes.map((hero) => hero.holyBeast);

        return {
          ...item,
          id: item.id,
          rank: item.rank || 0,
          serverId: detail?.legionData?.serverId || item.serverId || 0,
          name: detail?.legionData?.name || item.name,
          logo: detail?.legionData?.logo || item.logo,
          redQuench: detail?.legionData?.quenchNum || item.redQuench || 0,
          power: detail?.legionData?.power || item.power || 0,
          sRScore: item.score || 0,
          announcement: detail?.legionData?.announcement || "",
          redno: redQuenchCounts,
          redno1: redQuenchCounts[0] || "0红",
          redno2: redQuenchCounts[1] || "0红",
          redno3: redQuenchCounts[2] || "0红",
          hb1: HolyBeastNum[0] || 0,
          hb2: HolyBeastNum[1] || 0,
          hb3: HolyBeastNum[2] || 0,
          topHeroes: top3Heroes,
          level: detail?.legionData?.level || 30,
        };
      } catch (error) {
        console.error(`查询俱乐部${item.id}详情失败:`, error);
        return {
          ...item,
          id: item.id,
          redQuench: item.redQuench || 0,
          power: item.power || 0,
          topHeroes: [],
          level: 30,
          announcement: "",
        };
      }
    });

    const processedClubs = await Promise.all(detailPromises);

    const sortedLegionList = processedClubs.map((club) => ({
      ...club,
      alliance: allianceincludes(club.announcement),
    }));

    // Save to cache
    pageCache.value.set(page, sortedLegionList);

    battleRecords1.value = {
      legionRankList: sortedLegionList,
    };
  } catch (error) {
    console.error("加载分页数据失败:", error);
    message.error("加载分页数据失败");
  } finally {
    loading1.value = false;
  }
};

const handlePageChange = (page) => {
  currentPage.value = page;
  loadPageData(page);
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
    // 1. Check Date
    const firstSaturday = getFirstSaturdayOfMonth();
    // Simple date comparison: YYYY/MM/DD
    const today = new Date();
    const firstSatDate = new Date(firstSaturday);

    // Reset time to 00:00:00 for accurate date comparison
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const targetDate = new Date(
      firstSatDate.getFullYear(),
      firstSatDate.getMonth(),
      firstSatDate.getDate(),
    );

    if (todayDate < targetDate) {
      message.warning(
        `当前日期在当月第一个周六(${firstSaturday})之前，不可查询`,
      );
      return;
    }

    // 2. Get War Type
    const warTypeResult = await tokenStore.sendMessageWithPromise(
      tokenId,
      "saltroad_getwartype",
      { date: firstSaturday },
      10000,
    );

    if (!warTypeResult || !warTypeResult.warType) {
      message.error("获取岛屿类型失败");
      return;
    }

    const warType = warTypeResult.warType;
    currentWarType.value = warType;

    const rankParams = getRankParams(warType);

    if (!rankParams) {
      message.error("当前榜单只允许青铜、秘蓝、月宫、天宫查询");
      return;
    }

    currentTargetDate.value = rankParams.name;

    // 3. Get Rank List
    queryDate.value = getRankQueryDate();

    const rankResult = await tokenStore.sendMessageWithPromise(
      tokenId,
      "saltroad_getsaltroadwartotalrank",
      {
        date: queryDate.value,
        startRank: rankParams.startRank,
        endRank: rankParams.endRank,
      },
      20000,
    );

    if (
      !rankResult
      || !rankResult.legionList
      || rankResult.legionList.length === 0
    ) {
      message.warning("未查询到榜单数据");
      battleRecords1.value = null;
      fullRankList.value = [];
      pageCache.value.clear(); // Clear cache on new search
      return;
    }

    fullRankList.value = rankResult.legionList;
    pageCache.value.clear(); // Clear cache on new search

    // 4. Load First Page
    currentPage.value = 1;
    await loadPageData(1);

    message.success(`查询成功，共 ${fullRankList.value.length} 条数据`);
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
    exportToImage();
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

  try {
    // 获取实际的滚动容器
    const tableContainer = exportElement.querySelector(".table-container");
    const realHeight = tableContainer
      ? tableContainer.scrollHeight
      : exportElement.scrollHeight;
    const realWidth = tableContainer
      ? tableContainer.scrollWidth
      : exportElement.scrollWidth;

    // 5. 用html2canvas渲染DOM为Canvas
    const canvas = await html2canvas(exportElement, {
      scale: 2, // 放大2倍，解决图片模糊问题
      useCORS: true, // 允许跨域图片（若DOM内有远程图片，需开启）
      backgroundColor: "#ffffff", // 避免透明背景（默认透明）
      logging: false, // 关闭控制台日志
      height: realHeight, // 确保捕获完整高度
      width: realWidth, // 确保捕获完整宽度
      windowWidth: realWidth, // 设置窗口宽度
      windowHeight: realHeight, // 设置窗口高度
      allowTaint: true, // 允许跨域图片污染画布
      onclone: (clonedDoc) => {
        // 处理外层容器
        const clonedContent = clonedDoc.querySelector(".table-content");
        if (clonedContent) {
          clonedContent.style.height = "auto";
          clonedContent.style.overflow = "visible";
        }

        // 处理滚动容器
        const clonedContainer = clonedDoc.querySelector(".table-container");
        if (clonedContainer) {
          clonedContainer.style.height = "auto";
          clonedContainer.style.overflow = "visible";
        }

        // 处理表头吸顶问题
        const clonedHeader = clonedDoc.querySelector(".table-header");
        if (clonedHeader) {
          clonedHeader.style.position = "static";
        }
      },
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const filename = `${year}年${month}月${getRankParams(currentWarType.value).name}.png`;
    downloadCanvasAsImage(canvas, filename);
  } catch (err) {
    console.error("DOM转图片失败：", err);
    message.error("导出图片失败，请重试");
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
