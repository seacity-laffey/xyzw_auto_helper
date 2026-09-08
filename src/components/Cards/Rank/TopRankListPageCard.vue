<template>
  <div class="club-warrank-container">
    <div class="club-warrank-card">
      <PlayerRankingToolbar
        icon-src="/icons/Ob7pyorzmHiJcbab2c25af264d0758b527bc1b61cc3b.png"
        title="巅峰榜"
        :has-data="Boolean(topranklist)"
        :loading="loading1"
        :query-date="queryDate"
        @export="exportToImage"
        @refresh="topranklistRefresh"
      ></PlayerRankingToolbar>

      <PlayerRankingTable
        ref="playerRankingTable"
        empty-label="暂无巅峰榜数据"
        loading-label="正在加载巅峰数据..."
        score-label="巅峰积分"
        :has-data="Boolean(topranklist)"
        :loading="loading1"
        :rows="Object.values(currentPageData)"
        @select-player="fetchTargetInfo"
      ></PlayerRankingTable>
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
import { gettoday } from "@/utils/clubWarrankUtils";
import { HERO_DICT, HeroFillInfo } from "@/utils/heroList";
import ClubHeroDetailDialog from "@/components/Club/ClubHeroDetailDialog.vue";
import ClubPlayerDuelDialog from "@/components/Club/ClubPlayerDuelDialog.vue";
import PlayerRankingTable from "@/components/Rank/PlayerRankingTable.vue";
import PlayerRankingToolbar from "@/components/Rank/PlayerRankingToolbar.vue";

const props = defineProps({
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

const message = useMessage();
const tokenStore = useTokenStore();

const loading1 = ref(false);
const topranklist = ref(null);
const playerRankingTable = ref(null);
const queryDate = ref(gettoday());

// 分页状态
const currentPage = ref(1);
const pageSize = ref(100); // 每页100条

// 获取当前页的数据
const currentPageData = computed(() => {
  if (!topranklist.value)
    return {};

  const startIndex = (currentPage.value - 1) * pageSize.value;
  const endIndex = startIndex + pageSize.value;
  const entries = Object.entries(topranklist.value);

  // 排序：按排名排序
  entries.sort((a, b) => a[1].rank - b[1].rank);

  return Object.fromEntries(entries.slice(startIndex, endIndex));
});

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

const formatScore = (score) => {
  return score.toFixed(0).toString();
};

const {
  dieStats,
  fetchTargetInfo,
  fightCount,
  fightProgress,
  fightResult,
  handleDuel,
  handleFightCountUpdate,
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

// 查询
const fetchtopranklist = async () => {
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
  queryDate.value = gettoday();

  try {
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "arena_getarearank",
      { rankType: 1 },
      5000,
    );

    if (!result.list) {
      topranklist.value = null;
      message.warning("未查询到巅峰数据");
      return;
    }
    const teamData = {};
    for (const [memberId, memberData] of Object.entries(result.list)) {
      teamData[memberId] = {
        serverId: memberData?.serverId || 0,
        roleId: memberData?.roleId || 0,
        name: memberData?.name || "",
        power: formatPower(memberData?.power) || 0,
        rank: memberData?.rank || 0,
        score: formatScore(memberData?.score) || 0,
        legacy: memberData?.legacy?.color || 0,
        headImg: memberData?.headImg || "",
      };
    }

    topranklist.value = teamData;
    message.success("巅峰数据加载成功");
    return teamData;
  } catch (error) {
    console.error("查询失败:", error);
    message.error(`查询失败: ${error.message}`);
    topranklist.value = null;
  } finally {
    loading1.value = false;
  }
};
// 刷新战绩
const topranklistRefresh = () => {
  fetchtopranklist();
};

const exportToImage = async () => {
  const exportElement = playerRankingTable.value?.getExportElement();
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
      = `${queryDate.value.replace("/", "年").replace("/", "月")
      }日巅峰榜信息.png`;
    downloadCanvasAsImage(canvas, filename);
  } catch (err) {
    console.error("DOM转图片失败：", err);
    message.error("导出图片失败，请重试");
  } finally {
    exportElement.style.height = originalHeight;
    exportElement.style.overflow = originalOverflow;
  }
};

// 暴露方法给父组件
defineExpose({
  fetchtopranklist,
});

// Inline 模式：挂载后自动拉取
onMounted(() => {
  if (props.inline) {
    topranklistRefresh();
  }
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
