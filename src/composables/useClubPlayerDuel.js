import { reactive, ref } from "vue";
import { runClubDuels } from "../utils/clubDuelRunner.js";
import { buildClubPlayerInfo } from "../utils/clubPlayerInfo.js";

export function useClubPlayerDuel({
  tokenStore,
  message,
  fillPearls,
  formatPower,
  heroDict,
}) {
  const showPlayerInfoModal = ref(false);
  const playerInfo = ref(null);
  const queryLoading = ref(false);
  const fightCount = ref(1);
  const isFightCountValid = ref(true);
  const fightProgress = reactive({
    visible: false,
    totalCount: 0,
    completedCount: 0,
    remainingCount: 0,
    winCount: 0,
    lossCount: 0,
    percentage: 0,
  });
  const fightResult = reactive({
    visible: false,
    totalCount: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
    ourDieRate: 0,
    enemyDieRate: 0,
    resultCount: [],
  });
  const dieStats = reactive({
    ourDieHeroGameCount: 0,
    enemyDieHeroGameCount: 0,
  });
  const showHeroModal = ref(false);
  const heroModealTemp = ref(null);

  const validateFightCount = (value) => {
    const count = Number.parseInt(value);
    isFightCountValid.value
      = !Number.isNaN(count) && count >= 1 && count <= 100;
  };

  const handleFightCountUpdate = (value) => {
    fightCount.value = value;
    validateFightCount(value);
  };

  const resetFightResult = () => {
    fightResult.visible = false;
    fightProgress.visible = false;
    dieStats.ourDieHeroGameCount = 0;
    dieStats.enemyDieHeroGameCount = 0;
    fightCount.value = 1;
    validateFightCount(1);
  };

  const selectHeroInfo = (heroInfo) => {
    heroModealTemp.value = heroInfo;
    showHeroModal.value = true;
  };

  const fetchTargetInfo = async (roleId) => {
    const token = tokenStore.selectedToken;
    if (!token) {
      message.warning("请先选择游戏角色");
      return;
    }
    if (tokenStore.getWebSocketStatus(token.id) !== "connected") {
      message.error("WebSocket未连接，无法查询战绩");
      return;
    }

    resetFightResult();
    queryLoading.value = true;

    try {
      const result = await tokenStore.sendMessageWithPromise(
        token.id,
        "rank_getroleinfo",
        {
          bottleType: 0,
          includeBottleTeam: false,
          includeHero: true,
          includeHeroDetail: true,
          includePearl: true,
          isSearch: false,
          roleId,
        },
        5000,
      );
      const data = buildClubPlayerInfo(roleId, result, {
        fillPearls,
        formatPower,
        heroDict,
      });
      if (!data) {
        message.warning("未查询到对手信息");
        return;
      }

      playerInfo.value = data;
      showPlayerInfoModal.value = true;
      message.success("查询成功");
    } catch (error) {
      console.error("查询失败详细信息:", error);
      message.error(`查询失败: ${error.message}`);
    } finally {
      queryLoading.value = false;
    }
  };

  const handleHeroClick = (hero) => {
    if (hero.id && !queryLoading.value) {
      message.info(`正在查询车头信息: ${hero.name}`);
      void fetchTargetInfo(hero.id);
    } else if (!hero.id) {
      message.error("车头ID不存在，无法查询信息");
    }
  };

  const handleDuel = async () => {
    if (!playerInfo.value)
      return;

    validateFightCount(fightCount.value);
    if (!isFightCountValid.value) {
      message.error("请输入有效的切磋次数 (1-100)");
      return;
    }

    const token = tokenStore.selectedToken;
    if (!token) {
      message.warning("请先选择游戏角色");
      return;
    }
    if (tokenStore.getWebSocketStatus(token.id) !== "connected") {
      message.error("WebSocket未连接，无法发起切磋");
      return;
    }

    const totalCount = Number.parseInt(fightCount.value);
    message.info(`开始连续切磋: ${playerInfo.value.name}，共${totalCount}次`);
    queryLoading.value = true;
    Object.assign(fightProgress, {
      visible: true,
      totalCount,
      completedCount: 0,
      remainingCount: totalCount,
      winCount: 0,
      lossCount: 0,
      percentage: 0,
    });
    dieStats.ourDieHeroGameCount = 0;
    dieStats.enemyDieHeroGameCount = 0;

    try {
      const summary = await runClubDuels({
        totalCount,
        targetId: playerInfo.value.id,
        requestFight: (targetId) =>
          tokenStore.sendMessageWithPromise(
            token.id,
            "fight_startpvp",
            { targetId },
            10000,
          ),
        formatPower,
        onAttempt: ({ attemptNumber }) => {
          message.info(`正在进行第 ${attemptNumber}/${totalCount} 场切磋`);
        },
        onInvalidResult: ({ attemptNumber, message: errorMessage }) => {
          message.warning(`第 ${attemptNumber} 场切磋失败: ${errorMessage}`);
        },
        onProgress: (progress) => Object.assign(fightProgress, progress),
      });

      Object.assign(dieStats, {
        ourDieHeroGameCount: summary.ourDieHeroGameCount,
        enemyDieHeroGameCount: summary.enemyDieHeroGameCount,
      });
      Object.assign(fightResult, summary, { visible: true });
      fightProgress.visible = false;
      message.success(`连续切磋完成，共${totalCount}场`);
    } catch (error) {
      console.error("连续切磋失败:", error);
      message.error(`连续切磋失败: ${error.message || "网络错误"}`);
      fightProgress.visible = false;
    } finally {
      queryLoading.value = false;
    }
  };

  return {
    dieStats,
    fetchTargetInfo,
    fightCount,
    fightProgress,
    fightResult,
    handleDuel,
    handleFightCountUpdate,
    handleHeroClick,
    heroModealTemp,
    isFightCountValid,
    playerInfo,
    queryLoading,
    resetFightResult,
    selectHeroInfo,
    showHeroModal,
    showPlayerInfoModal,
  };
}
