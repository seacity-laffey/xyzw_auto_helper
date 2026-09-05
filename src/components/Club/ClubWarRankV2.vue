<template>
  <div class="club-warrank-container">
    <div class="club-warrank-card">
      <ClubWarRankToolbar
        v-model:export-methods="exportmethod"
        :club-count="battleRecords1?.legionRankList?.length || 0"
        :date="inputDate1"
        :edit-mode="isEditMode"
        :has-data="Boolean(battleRecords1)"
        :loading="loading1"
        :score-enabled="ScoreShow === 1"
        @date-change="fetchBattleRecordsByDate"
        @export="handleExport1"
        @refresh="handleRefresh1"
        @sort-red="hcSort"
        @sort-score="scoreSort"
        @toggle-edit="toggleEditMode"
      />

      <!-- 表格内容区 -->
      <div ref="exportDom" class="table-content">
        <ClubWarAllianceSummary
          v-if="battleRecords1?.legionRankList"
          :active-alliance="activeAlliance"
          :announcement="saltAnnouncementText"
          :counts="allianceCounts"
          :fetch-time="saltFetchTimeText"
          :total="battleRecords1.legionRankList.length"
          @select="setActiveAlliance"
        />
        <ClubWarRankingTable
          :columns="saltTableColumns"
          :has-data="Boolean(battleRecords1?.legionRankList)"
          :loading="loading1"
          :row-class-name="getSaltTableRowClassName"
          :rows="groupedSaltTableData"
        />
      </div>
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
    />

    <ClubHeroDetailDialog
      v-model:open="showHeroModal"
      :hero="heroModealTemp"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from "vue";
import { NInputNumber, NSelect, useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import html2canvas from "html2canvas";
import { downloadCanvasAsImage } from "@/utils/imageExport";
import ClubHeroDetailDialog from "@/components/Club/ClubHeroDetailDialog.vue";
import ClubPlayerDuelDialog from "@/components/Club/ClubPlayerDuelDialog.vue";
import ClubWarAllianceSummary from "@/components/Club/ClubWarAllianceSummary.vue";
import ClubWarRankingTable from "@/components/Club/ClubWarRankingTable.vue";
import ClubWarRankToolbar from "@/components/Club/ClubWarRankToolbar.vue";
import { createClubWarRankColumns } from "@/composables/createClubWarRankColumns";
import {
  calculateClubAverageRedQuench,
  countClubRanksByAlliance,
  createRedQuenchRankMap,
  filterAndSortClubRanks,
  groupClubRankRows,
  loadClubWarRankDetails,
  sortClubRanksByDominantAlliance,
} from "@/utils/clubWarRankData";
import {
  buildClubPlayerInfo,
  extractClubHeroInfo,
} from "@/utils/clubPlayerInfo";
import { runClubDuels } from "@/utils/clubDuelRunner";
import {
  getLastSaturday,
  formatTimestamp1,
} from "@/utils/clubBattleUtils";
import {
  gettoday,
  formatWarrankRecordsForExport,
  allianceincludes,
} from "@/utils/clubWarrankUtils";
import {
  HERO_DICT,
  HeroFillInfo,
  getLineupType,
  LINEUP_RULES,
} from "@/utils/heroList";

const ScoreShow = ref(1);

const exportmethod = ref(["2"]);
const exportDom = ref(null);

const message = useMessage();
const tokenStore = useTokenStore();
const selectedTokenId = computed(() => tokenStore.selectedToken?.id || "");
const currentClubInfo = ref(null);
const currentLegionInfo = computed(() => currentClubInfo.value?.info || null);

const loading1 = ref(false);
const battleRecords1 = ref(null);
const queryDate = ref("");
const inputDate1 = ref(getLastSaturday());
const saltFetchStartTime = ref(null);

// 新增联盟筛选功�?
const activeAlliance = ref("all");
// 排序模式：manual-手动/默认，redQuench-红淬，score-积分
const currentSortType = ref("manual");

// 手动调整功能
const isEditMode = ref(false);
const manualRankings = ref({});
const manualAlliances = ref({});
const editingSortOrder = ref([]); // 编辑模式下的固定排序顺序
const tempOldRanks = ref({}); // 暂存编辑前的排名

const allianceOptions = [
  { label: "大联盟", value: "大联盟" },
  { label: "梦盟", value: "梦盟" },
  { label: "正义联盟", value: "正义联盟" },
  { label: "龙盟", value: "龙盟" },
  { label: "曦盟", value: "曦盟" },
  { label: "未知联盟", value: "未知联盟" },
];

const toggleEditMode = () => {
  if (!isEditMode.value) {
    // 进入编辑模式
    if (battleRecords1.value?.legionRankList) {
      // 1. 初始化手动数据（如果未初始化�?
      battleRecords1.value.legionRankList.forEach((member) => {
        if (manualRankings.value[member.id] === undefined) {
          manualRankings.value[member.id] = redQuenchRankings.value[member.id];
        }
        if (manualAlliances.value[member.id] === undefined) {
          manualAlliances.value[member.id] =
            allianceincludes(member.announcement) || "未知联盟";
        }
      });

      // 2. 锁定当前排序顺序
      // 获取当前完整列表并按当前规则排序
      const currentList = [...battleRecords1.value.legionRankList].sort(
        (a, b) => {
          if (currentSortType.value === "manual") {
            return getMemberRank(a) - getMemberRank(b);
          } else if (currentSortType.value === "redQuench") {
            return (b.redQuench || 0) - (a.redQuench || 0);
          } else if (currentSortType.value === "score") {
            return (b.sRScore || 0) - (a.sRScore || 0);
          }
          return 0;
        },
      );
      // 保存 ID 顺序
      editingSortOrder.value = currentList.map((m) => m.id);
    }
  } else {
    // 退出编辑模�?
    // 可以在这里执行额外的清理或确认逻辑
    message.success("已保存调整");
    // 强制刷新列表排序（通过 filteredLegionList 的响应式依赖�?
  }
  isEditMode.value = !isEditMode.value;
};

const handleRankFocus = (member) => {
  tempOldRanks.value[member.id] = manualRankings.value[member.id];
};

const handleRankBlur = (member) => {
  const newRank = manualRankings.value[member.id];
  const oldRank = tempOldRanks.value[member.id];

  // 清理暂存
  delete tempOldRanks.value[member.id];

  // 验证有效性，如果无效则恢�?
  if (!newRank || newRank < 1 || newRank > 20) {
    manualRankings.value[member.id] = oldRank;
    if (newRank !== null && newRank !== undefined) {
      // 只有当用户输入了无效值时才提示，清空不提示（虽然 NInputNumber min=1 通常不会清空�?
      message.warning("排名必须在 1-20 之间");
    }
    return;
  }

  if (newRank === oldRank) return;

  // 查找占用新排名的俱乐�?
  const targetMemberId = Object.keys(manualRankings.value).find(
    (id) =>
      String(id) !== String(member.id) && manualRankings.value[id] === newRank,
  );

  if (targetMemberId) {
    // 交换排名: 把占用者的排名设为我的旧排�?
    manualRankings.value[targetMemberId] = oldRank;
    const targetName = getMemberName(targetMemberId);
    message.success(`排名已交换：${member.name} 与 ${targetName}`);
  }

  // 只要手动调整了排名，就切换回 manual 排序模式
  currentSortType.value = "manual";
};

// 获取成员名称辅助函数
const getMemberName = (id) => {
  const member = battleRecords1.value?.legionRankList.find(
    (m) => String(m.id) === String(id),
  );
  return member ? member.name : "未知俱乐部";
};

const getMemberAlliance = (member) => {
  if (manualAlliances.value[member.id] !== undefined) {
    return manualAlliances.value[member.id];
  }
  return allianceincludes(member.announcement) || "未知联盟";
};

const getSaltTableRowClassName = (row) => {
  if (row.__isFetchTimeFooter) {
    return "salt-fetch-time-footer-row";
  }
  if (row.__isGroupHeader) {
    const index = allianceOptions.findIndex(
      (option) => option.value === row.alliance,
    );
    return `salt-alliance-group-row salt-alliance-group-row-${index === -1 ? 5 : index}`;
  }
  const alliance = getMemberAlliance(row);
  const index = allianceOptions.findIndex(
    (option) => option.value === alliance,
  );
  return `salt-alliance-row salt-alliance-row-${index === -1 ? 5 : index}`;
};

const getMemberRank = (member) => {
  if (manualRankings.value[member.id] !== undefined) {
    return manualRankings.value[member.id];
  }
  return redQuenchRankings.value[member.id];
};

// 新增查询对手相关状�?
const queryLoading = ref(false);
// 玩家信息模态框状�?
const showPlayerInfoModal = ref(false);
const playerInfo = ref(null);

// 新增切磋次数相关状�?
const fightCount = ref(1);
const isFightCountValid = ref(true);

// 切磋进度状�?
const fightProgress = reactive({
  visible: false,
  totalCount: 0,
  completedCount: 0,
  remainingCount: 0,
  winCount: 0,
  lossCount: 0,
  percentage: 0,
});

// 最终结果状�?
const fightResult = reactive({
  visible: false,
  totalCount: 0,
  winCount: 0,
  lossCount: 0,
  winRate: 0,
  ourDieRate: 0,
  enemyDieRate: 0,
  resultCount: [], // 存储每场战斗的详细结�?
});

// 掉将统计
const dieStats = reactive({
  ourDieHeroGameCount: 0,
  enemyDieHeroGameCount: 0,
});

// 武将详情模态框状�?
const showHeroModal = ref(false);
// 选中的武将信�?
const heroModealTemp = ref(null);

// 选择武将信息，显示详情模态框
const selectHeroInfo = (heroInfo) => {
  showHeroModal.value = true;
  heroModealTemp.value = heroInfo;
};

const getHeroInfo = (heroes) =>
  extractClubHeroInfo(heroes, HERO_DICT);

const formatDateTime = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return (
    [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join(
      "-",
    )
    + " "
    + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join(
      ":",
    )
  );
};

const getSaltFetchTimeText = () => {
  const fetchTime = saltFetchStartTime.value || new Date();
  return `数据获取时间：${formatDateTime(fetchTime)}`;
};

const fetchCurrentClubInfo = async (tokenId = selectedTokenId.value) => {
  if (!tokenId) return null;

  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") return null;

  try {
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "legion_getinfo",
      {},
      10000,
    );

    if (selectedTokenId.value === tokenId && result) {
      currentClubInfo.value = result;
    }
    return result;
  } catch (error) {
    if (selectedTokenId.value === tokenId) {
      console.error("查询俱乐部信息失败:", error);
    }
    return null;
  }
};

const isCurrentAccountClub = (row) => {
  if (!row || row.__isGroupHeader || row.__isFetchTimeFooter) return false;

  const clubInfo = currentLegionInfo.value;
  if (!clubInfo) return false;

  const currentId = clubInfo.id ?? clubInfo.legionId;
  const rowId = row.id ?? row.legionId;
  if (
    currentId != null
    && rowId != null
    && String(currentId) === String(rowId)
  ) {
    return true;
  }

  return Boolean(clubInfo.name && row.name && clubInfo.name === row.name);
};

// 盐场表格列定义
const saltTableColumns = createClubWarRankColumns({
  InputNumber: NInputNumber,
  Select: NSelect,
  allianceOptions,
  formatPower: (power) => formatPower(power),
  getAllianceTagClass: (alliance) => getAllianceTagClass(alliance),
  getLineupTagStyle: (lineupType) => getLineupTagStyle(lineupType),
  getMemberAlliance,
  getMemberRank,
  handleHeroClick: (hero) => handleHeroClick(hero),
  handleRankBlur,
  handleRankFocus,
  isCurrentAccountClub,
  isEditMode,
  manualAlliances,
  manualRankings,
});

const getLineupTagStyle = (lineupType) => {
  const rule = LINEUP_RULES.find((item) => item.name === lineupType);
  const colorProps = rule?.colorProps || {
    color: "#f5f5f5",
    textColor: "#666",
  };

  return {
    maxWidth: "46px",
    padding: "1px 4px",
    borderRadius: "8px",
    fontSize: "10px",
    fontWeight: "600",
    lineHeight: "14px",
    color: colorProps.textColor,
    background: colorProps.color,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flexShrink: "0",
  };
};

// 新增查询对手信息功能
const fetchTargetInfo = async (roleId) => {
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

  // 重置之前的切磋结�?
  resetFightResult();

  queryLoading.value = true;

  try {
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "rank_getroleinfo",
      {
        bottleType: 0,
        includeBottleTeam: false,
        isSearch: false,
        roleId: roleId,
        includeHero: true,
        includeHeroDetail: true,
        includePearl: true,
      },
      5000,
    );

    const playerData = buildClubPlayerInfo(roleId, result, {
      fillPearls: HeroFillInfo,
      formatPower,
      heroDict: HERO_DICT,
    });
    if (!playerData) {
      message.warning("未查询到对手信息");
      return;
    }
    playerInfo.value = playerData;
    showPlayerInfoModal.value = true;
    message.success("查询成功");
  } catch (error) {
    message.error(`查询失败: ${error.message}`);
    console.error("查询失败详细信息:", error);
  } finally {
    queryLoading.value = false;
  }
};

// 车头头像点击处理
const handleHeroClick = (hero) => {
  if (hero.id && !queryLoading.value) {
    message.info(`正在查询车头信息: ${hero.name}`);
    fetchTargetInfo(hero.id);
  } else if (!hero.id) {
    message.error("车头ID不存在，无法查询信息");
    console.error("车头ID不存在", hero);
  }
};

// 验证切磋次数
const validateFightCount = (value) => {
  const num = parseInt(value);
  isFightCountValid.value = !isNaN(num) && num >= 1 && num <= 100;
};

const handleFightCountUpdate = (value) => {
  fightCount.value = value;
  validateFightCount(value);
};

// 重置切磋结果
const resetFightResult = () => {
  fightResult.visible = false;
  fightProgress.visible = false;
  dieStats.ourDieHeroGameCount = 0;
  dieStats.enemyDieHeroGameCount = 0;
  fightCount.value = 1;
  validateFightCount(1);
};

// 切磋功能处理 - 支持连续切磋
const handleDuel = async () => {
  if (!playerInfo.value) return;

  // 验证切磋次数
  validateFightCount(fightCount.value);
  if (!isFightCountValid.value) {
    message.error("请输入有效的切磋次数 (1-100)");
    return;
  }

  const totalCount = parseInt(fightCount.value);
  message.info(`开始连续切磋 ${playerInfo.value.name}，共${totalCount}次`);

  if (!tokenStore.selectedToken) {
    message.warning("请先选择游戏角色");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  // 检查WebSocket连接
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.error("WebSocket未连接，无法发起切磋");
    return;
  }

  queryLoading.value = true;

  // 初始化切磋进�?
  fightProgress.visible = true;
  fightProgress.totalCount = totalCount;
  fightProgress.completedCount = 0;
  fightProgress.remainingCount = totalCount;
  fightProgress.winCount = 0;
  fightProgress.lossCount = 0;
  fightProgress.percentage = 0;

  // 重置掉将统计
  dieStats.ourDieHeroGameCount = 0;
  dieStats.enemyDieHeroGameCount = 0;

  try {
    const summary = await runClubDuels({
      totalCount,
      targetId: playerInfo.value.id,
      requestFight: (targetId) =>
        tokenStore.sendMessageWithPromise(
          tokenId,
          "fight_startpvp",
          { targetId },
          10000,
        ),
      formatPower,
      onAttempt: ({ attemptNumber }) => {
        message.info(`正在进行第${attemptNumber}/${totalCount} 场切磋`);
      },
      onInvalidResult: ({ attemptNumber, message: errorMessage }) => {
        message.warning(`第${attemptNumber} 场切磋失败: ${errorMessage}`);
      },
      onProgress: (progress) => {
        Object.assign(fightProgress, progress);
      },
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
    // 不关闭模态框，让用户可以继续查看或再次切�?
  }
};

// 联盟筛选计算属�?
const filteredLegionList = computed(() => {
  return filterAndSortClubRanks(
    battleRecords1.value?.legionRankList || [],
    {
      activeAlliance: activeAlliance.value,
      currentSortType: currentSortType.value,
      editingSortOrder: editingSortOrder.value,
      getMemberAlliance,
      getMemberRank,
      isEditMode: isEditMode.value,
    },
  );
});

const groupedSaltTableData = computed(() =>
  groupClubRankRows(filteredLegionList.value, {
    allianceOrder: allianceOptions.map((option) => option.value),
    getMemberAlliance,
  }),
);

const saltAverageRedQuench = computed(() =>
  calculateClubAverageRedQuench(
    battleRecords1.value?.legionRankList || [],
  ),
);

const saltAnnouncementText = computed(() => {
  const dateText = formatTimestamp1(inputDate1.value).replace(/\//g, "-");
  return `${dateText} 盐场分组 平均红淬：${saltAverageRedQuench.value}红`;
});

const saltFetchTimeText = computed(() => getSaltFetchTimeText());

// 计算所有俱乐部的红淬排�?
const redQuenchRankings = computed(() =>
  createRedQuenchRankMap(battleRecords1.value?.legionRankList || []),
);

// 设置当前选中联盟
const setActiveAlliance = (alliance) => {
  activeAlliance.value = alliance;
};

const allianceCounts = computed(() =>
  countClubRanksByAlliance(
    battleRecords1.value?.legionRankList || [],
    allianceOptions.map((option) => option.value),
    getMemberAlliance,
  ),
);

// 格式化战�?
const formatPower = (power) => {
  if (!power) return "0";
  if (power >= 100000000) {
    return (power / 100000000).toFixed(2) + "亿";
  }
  if (power >= 10000) {
    return (power / 10000).toFixed(2) + "万";
  }
  return power.toString();
};

//日期选择时调用查询战绩方�?
const fetchBattleRecordsByDate = (val) => {
  if (undefined != val) {
    inputDate1.value = val;
  } else {
    inputDate1.value = getLastSaturday();
  }
  clearSaltTableState();
  fetchBattleRecords1();
};

const clearSaltTableState = () => {
  battleRecords1.value = null;
  activeAlliance.value = "all";
  currentSortType.value = "manual";
  isEditMode.value = false;
  manualRankings.value = {};
  manualAlliances.value = {};
  editingSortOrder.value = [];
};

const createRankDetailLoaders = (tokenId) => ({
  fetchClubDetail: (legionId) =>
    tokenStore.sendMessageWithPromise(
      tokenId,
      "legion_getinfobyid",
      { legionId },
      5000,
    ),
  fetchRoleInfo: (roleId) =>
    tokenStore.sendMessageWithPromise(
      tokenId,
      "rank_getroleinfo",
      {
        bottleType: 0,
        includeBottleTeam: false,
        isSearch: false,
        roleId,
      },
      5000,
    ),
  getHeroInfo,
  getLineupType,
  onClubError: (club, error) => {
    console.error(`查询俱乐部${club.id}详情失败:`, error);
  },
});

// 查询战绩
const fetchBattleRecords1 = async (requestTokenId = selectedTokenId.value) => {
  if (!inputDate1.value) {
    inputDate1.value = getLastSaturday();
  }

  if (!requestTokenId) {
    message.warning("请先选择游戏角色");
    return;
  }

  const tokenId = requestTokenId;

  // 检查WebSocket连接
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.error("WebSocket未连接，无法查询战绩");
    return;
  }

  loading1.value = true;
  saltFetchStartTime.value = new Date();
  queryDate.value = formatTimestamp1(inputDate1.value);
  await fetchCurrentClubInfo(tokenId);
  if (selectedTokenId.value !== tokenId) return;

  if (gettoday() == queryDate.value && new Date().getHours() < 21) {
    let getbattlefield;
    try {
      getbattlefield = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getbattlefield",
        {},
        10000,
      );
    } catch (error) {
      console.error("查询失败:", error);
      message.error(`查询失败: ${error.message || "网络错误"}`);
      battleRecords1.value = null;
      loading1.value = false;
      return;
    }
    if (!getbattlefield.info) {
      battleRecords1.value = null;
      message.warning(getbattlefield?.message || "未查询到盐场匹配数据");
      loading1.value = false;
      return;
    }
    try {
      const result = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getopponent",
        {
          phase: getbattlefield.info.phase,
          battlefieldId: getbattlefield.info.battlefieldId,
        },
        10000,
      );

      if (!result?.opponentList) {
        battleRecords1.value = null;
        message.warning(result?.message || "未查询到盐场匹配数据");
        loading1.value = false;
        return;
      }
      ScoreShow.value = 1;
      const processedClubs = await loadClubWarRankDetails(
        result.opponentList,
        createRankDetailLoaders(tokenId),
      );
      const sortedLegionList = sortClubRanksByDominantAlliance(
        processedClubs,
        allianceincludes,
      );

      if (selectedTokenId.value !== tokenId) return;

      battleRecords1.value = {
        ...result,
        legionRankList: sortedLegionList,
      };
      message.success("盐场匹配数据加载成功");
    } catch (error) {
      if (selectedTokenId.value !== tokenId) return;

      console.error("查询失败:", error);
      message.error(`查询失败: ${error.message}`);
      battleRecords1.value = null;
    } finally {
      if (selectedTokenId.value === tokenId) {
        loading1.value = false;
      }
    }
  } else {
    try {
      const result = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getwarrank",
        { date: queryDate.value },
        10000,
      );

      if (!result?.legionRankList) {
        battleRecords1.value = null;
        message.warning(result?.message || "未查询到盐场匹配数据");
        return;
      }
      ScoreShow.value = 0;
      const historicClubs = result.legionRankList.map((club) => ({
        ...club,
        sRScore: -1,
      }));
      const processedClubs = await loadClubWarRankDetails(
        historicClubs,
        createRankDetailLoaders(tokenId),
      );
      const sortedLegionList = sortClubRanksByDominantAlliance(
        processedClubs,
        allianceincludes,
      );

      if (selectedTokenId.value !== tokenId) return;

      battleRecords1.value = {
        ...result,
        legionRankList: sortedLegionList,
      };
      message.success("盐场匹配数据加载成功");
    } catch (error) {
      if (selectedTokenId.value !== tokenId) return;

      console.error("查询失败:", error);
      message.error(`查询失败: ${error.message}`);
      battleRecords1.value = null;
    } finally {
      if (selectedTokenId.value === tokenId) {
        loading1.value = false;
      }
    }
  }
};
// 刷新战绩
const handleRefresh1 = () => {
  fetchBattleRecords1();
};

const hcSort = async () => {
  if (!battleRecords1.value?.legionRankList) return;

  // 1. 按红淬数量排�?
  const sortedList = [...battleRecords1.value.legionRankList].sort(
    (a, b) => (b.redQuench || 0) - (a.redQuench || 0),
  );

  // 2. 更新排名数据
  sortedList.forEach((member, index) => {
    manualRankings.value[member.id] = index + 1;
  });

  // 3. 切换到手动排序模式（使用更新后的排名�?
  currentSortType.value = "manual";

  // 4. 如果在编辑模式，更新快照顺序以立即刷新视�?
  if (isEditMode.value) {
    editingSortOrder.value = sortedList.map((m) => m.id);
  }

  message.success("已按红淬数量重置排名");
};

const scoreSort = async () => {
  if (!battleRecords1.value?.legionRankList) return;

  // 1. 按积分排�?
  const sortedList = [...battleRecords1.value.legionRankList].sort(
    (a, b) => (b.sRScore || 0) - (a.sRScore || 0),
  );

  // 2. 更新排名数据
  sortedList.forEach((member, index) => {
    manualRankings.value[member.id] = index + 1;
  });

  // 3. 切换到手动排序模式（使用更新后的排名�?
  currentSortType.value = "manual";

  // 4. 如果在编辑模式，更新快照顺序以立即刷新视�?
  if (isEditMode.value) {
    editingSortOrder.value = sortedList.map((m) => m.id);
  }

  message.success("已按积分重置排名");
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
      await exportToImage();
    }
    message.success("导出成功");
  } catch (error) {
    console.error("导出失败:", error);
    message.error("导出失败，请重试");
  }
};

const exportToImage = async () => {
  // 校验：确保DOM已正确绑�?
  if (!exportDom.value) {
    alert("未找到要导出的DOM元素");
    return;
  }

  // 获取 table-container
  const tableContainer = exportDom.value.querySelector(".table-container");
  const expandNodes = [
    exportDom.value,
    tableContainer,
    ...exportDom.value.querySelectorAll(
      ".n-data-table, .n-data-table-wrapper, .n-data-table-base-table, .n-data-table-base-table-body, .n-data-table-table-wrapper",
    ),
  ].filter(Boolean);

  const originalNodeState = expandNodes.map((node) => ({
    node,
    height: node.style.height,
    maxHeight: node.style.maxHeight,
    width: node.style.width,
    minWidth: node.style.minWidth,
    overflow: node.style.overflow,
    overflowX: node.style.overflowX,
    overflowY: node.style.overflowY,
    scrollTop: node.scrollTop,
    scrollLeft: node.scrollLeft,
  }));

  try {
    exportDom.value.classList.add("salt-image-exporting");

    const exportWidth = 1380;

    expandNodes.forEach((node) => {
      node.style.height = "auto";
      node.style.maxHeight = "none";
      node.style.width = `${exportWidth}px`;
      node.style.minWidth = `${exportWidth}px`;
      node.style.overflow = "visible";
      node.style.overflowX = "visible";
      node.style.overflowY = "visible";
      node.scrollTop = 0;
      node.scrollLeft = 0;
    });

    exportDom.value.style.width = `${exportWidth}px`;
    exportDom.value.style.minWidth = `${exportWidth}px`;

    // 等待DOM更新
    await new Promise((resolve) => setTimeout(resolve, 200));

    const exportRootRect = exportDom.value.getBoundingClientRect();
    const exportContentNodes = [
      exportDom.value.querySelector(".announcement-section"),
      exportDom.value.querySelector(".alliance-tabs-section"),
      tableContainer,
    ].filter(Boolean);
    const contentBottom = exportContentNodes.reduce((bottom, node) => {
      const rect = node.getBoundingClientRect();
      return Math.max(bottom, rect.bottom - exportRootRect.top);
    }, 0);
    const exportHeight = Math.ceil(contentBottom + 2);

    // 5. 用html2canvas渲染DOM为Canvas
    const canvas = await html2canvas(exportDom.value, {
      scale: 2, // 放大2倍，解决图片模糊问题
      useCORS: true, // 允许跨域图片（若DOM内有远程图片，需开启）
      backgroundColor: "#ffffff", // 避免透明背景（默认透明�?
      logging: false, // 关闭控制台日�?
      height: exportHeight, // 确保捕获完整高度
      width: exportWidth, // 确保捕获完整宽度
      windowWidth: exportWidth, // 设置窗口宽度
      windowHeight: exportHeight, // 设置窗口高度
      allowTaint: true, // 允许跨域图片污染画布
    });

    // 6. Canvas转图片链接并下载
    const filename =
      queryDate.value.replace("/", "年").replace("/", "月") +
      "日盐场匹配信息.png";
    downloadCanvasAsImage(canvas, filename);
  } catch (err) {
    console.error("DOM转图片失败：", err);
    alert("导出图片失败，请重试");
  } finally {
    exportDom.value.classList.remove("salt-image-exporting");
    originalNodeState.forEach(
      ({
        node,
        height,
        maxHeight,
        width,
        minWidth,
        overflow,
        overflowX,
        overflowY,
        scrollTop,
        scrollLeft,
      }) => {
        node.style.height = height;
        node.style.maxHeight = maxHeight;
        node.style.width = width;
        node.style.minWidth = minWidth;
        node.style.overflow = overflow;
        node.style.overflowX = overflowX;
        node.style.overflowY = overflowY;
        node.scrollTop = scrollTop;
        node.scrollLeft = scrollLeft;
      },
    );
  }
};

const getAllianceTagClass = (alliance) => {
  switch (alliance) {
    case "大联盟":
      return "alliance-tag-dalianmeng";
    case "梦盟":
      return "alliance-tag-mengmeng";
    case "正义联盟":
      return "alliance-tag-zhengyi";
    case "龙盟":
      return "alliance-tag-longmeng";
    case "曦盟":
      return "alliance-tag-ximeng";
    case "未知联盟":
      return "alliance-tag-unknown";
    default:
      return "alliance-tag-other";
  }
};

// 暴露方法给父组件
defineExpose({
  fetchBattleRecords1,
});

// Inline 模式：挂载后自动拉取
onMounted(() => {
  fetchCurrentClubInfo();
  fetchBattleRecords1();
});

watch(selectedTokenId, (newTokenId, oldTokenId) => {
  if (!newTokenId || newTokenId === oldTokenId) return;

  currentClubInfo.value = null;
  battleRecords1.value = null;
  fetchCurrentClubInfo(newTokenId);
  fetchBattleRecords1(newTokenId);
});
</script>

<style scoped lang="scss" src="./ClubWarRankV2.scss"></style>
