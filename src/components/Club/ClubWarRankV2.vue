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
  loadClubWarRankDetails,
  sortClubRanksByDominantAlliance,
} from "@/utils/clubWarRankData";
import {
  buildClubPlayerInfo,
  extractClubHeroInfo,
} from "@/utils/clubPlayerInfo";
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
const expandedMembers = ref(new Set());
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
const queryTargetId = ref("");
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

// 切磋历史记录
const fightHistory = ref([]);

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
  queryTargetId.value = roleId;

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
  fightHistory.value = [];
  dieStats.ourDieHeroGameCount = 0;
  dieStats.enemyDieHeroGameCount = 0;
  fightCount.value = 1;
  validateFightCount(1);
};

// 更新切磋进度
const updateFightProgress = (completedCount, winCount, lossCount) => {
  fightProgress.completedCount = completedCount;
  fightProgress.winCount = winCount;
  fightProgress.lossCount = lossCount;
  fightProgress.remainingCount = fightProgress.totalCount - completedCount;
  fightProgress.percentage = Math.round(
    (completedCount / fightProgress.totalCount) * 100,
  );
};

// 计算最终结�?
const calculateFinalResult = (winCount, lossCount, resultCount) => {
  fightResult.totalCount = fightProgress.totalCount;
  fightResult.winCount = winCount;
  fightResult.lossCount = lossCount;
  fightResult.winRate = Math.round((winCount / fightProgress.totalCount) * 100);
  fightResult.ourDieRate = Math.round(
    (dieStats.ourDieHeroGameCount / fightProgress.totalCount) * 100,
  );
  fightResult.enemyDieRate = Math.round(
    (dieStats.enemyDieHeroGameCount / fightProgress.totalCount) * 100,
  );
  fightResult.resultCount = resultCount; // 存储每场战斗的详细结�?
  fightResult.visible = true;
  fightProgress.visible = false;
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

  // 重置历史记录
  fightHistory.value = [];

  try {
    let winCount = 0;
    let lossCount = 0;
    let resultCount = []; // 存储每场战斗的详细结�?

    // 重置掉将统计
    dieStats.ourDieHeroGameCount = 0;
    dieStats.enemyDieHeroGameCount = 0;

    // 执行连续切磋
    for (let i = 0; i < totalCount; i++) {
      message.info(`正在进行第${i + 1}/${totalCount} 场切磋`);

      // 调用实际的切磋API
      const result = await tokenStore.sendMessageWithPromise(
        tokenId,
        "fight_startpvp",
        {
          targetId: playerInfo.value.id,
        },
        10000,
      );

      if (result && result.battleData) {
        // 处理掉将情况
        let leftCount = 0;
        let rightCount = 0;

        // 检查我方掉将情�?
        if (result.battleData.result?.sponsor?.teamInfo) {
          result.battleData.result.sponsor.teamInfo.forEach((item) => {
            if (item.hp == 0) {
              leftCount++;
            }
          });
        }

        // 检查敌方掉将情�?
        if (result.battleData.result?.accept?.teamInfo) {
          result.battleData.result.accept.teamInfo.forEach((item) => {
            if (item.hp == 0) {
              rightCount++;
            }
          });
        }

        // 构建战斗结果对象
        const battleResult = {
          isWin: result.battleData.result?.isWin || false,
          leftName: result.battleData.leftTeam?.name || "未知",
          leftheadImg: result.battleData.leftTeam?.headImg || "",
          leftpower: formatPower(result.battleData.leftTeam?.power || 0),
          leftDieHero: leftCount,
          rightName: result.battleData.rightTeam?.name || "未知",
          rightheadImg: result.battleData.rightTeam?.headImg || "",
          rightpower: formatPower(result.battleData.rightTeam?.power || 0),
          rightDieHero: rightCount,
        };

        // 保存到结果数�?
        resultCount.push(battleResult);

        // 更新掉将统计
        if (leftCount > 0) {
          dieStats.ourDieHeroGameCount++;
        }
        if (rightCount > 0) {
          dieStats.enemyDieHeroGameCount++;
        }

        // 更新胜负计数
        if (battleResult.isWin) {
          winCount++;
        } else {
          lossCount++;
        }

        // 更新切磋进度
        updateFightProgress(i + 1, winCount, lossCount);

        // 短暂延迟，避免请求过于频�?
        if (i < totalCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } else {
        // 单场切磋失败，继续下一�?
        message.warning(
          `第${i + 1} 场切磋失败: ${result?.message || "未返回战斗数据"}`,
        );
        lossCount++;
        updateFightProgress(i + 1, winCount, lossCount);
      }
    }

    // 所有切磋完成，计算最终结�?
    calculateFinalResult(winCount, lossCount, resultCount);

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
  if (!battleRecords1.value?.legionRankList) {
    return [];
  }

  if (activeAlliance.value === "all") {
    return [...battleRecords1.value.legionRankList].sort((a, b) => {
      if (isEditMode.value) {
        // 编辑模式下，按照快照顺序排序
        return (
          editingSortOrder.value.indexOf(a.id) -
          editingSortOrder.value.indexOf(b.id)
        );
      }
      if (currentSortType.value === "manual") {
        return getMemberRank(a) - getMemberRank(b);
      } else if (currentSortType.value === "redQuench") {
        return (b.redQuench || 0) - (a.redQuench || 0);
      } else if (currentSortType.value === "score") {
        return (b.sRScore || 0) - (a.sRScore || 0);
      }
      return 0;
    });
  }

  const filtered = battleRecords1.value.legionRankList.filter((member) => {
    const memberAlliance = getMemberAlliance(member);
    if (activeAlliance.value === "空白") {
      return (
        !member.announcement ||
        member.announcement === 0 ||
        member.announcement === "0"
      );
    }
    return memberAlliance === activeAlliance.value;
  });

  return filtered.sort((a, b) => {
    if (isEditMode.value) {
      // 编辑模式下，按照快照顺序排序
      return (
        editingSortOrder.value.indexOf(a.id) -
        editingSortOrder.value.indexOf(b.id)
      );
    }
    if (currentSortType.value === "manual") {
      return getMemberRank(a) - getMemberRank(b);
    } else if (currentSortType.value === "redQuench") {
      return (b.redQuench || 0) - (a.redQuench || 0);
    } else if (currentSortType.value === "score") {
      return (b.sRScore || 0) - (a.sRScore || 0);
    }
    return 0;
  });
});

const groupedSaltTableData = computed(() => {
  const list = filteredLegionList.value;
  if (!list.length) {
    return [];
  }

  const allianceOrder = allianceOptions.map((option) => option.value);
  const groups = new Map();

  list.forEach((member) => {
    const alliance = getMemberAlliance(member) || "未知联盟";
    if (!groups.has(alliance)) {
      groups.set(alliance, []);
    }
    groups.get(alliance).push(member);
  });

  const orderedAlliances = [
    ...allianceOrder.filter((alliance) => groups.has(alliance)),
    ...Array.from(groups.keys()).filter(
      (alliance) => !allianceOrder.includes(alliance),
    ),
  ];

  const groupedRows = orderedAlliances.flatMap((alliance) => {
    const members = groups.get(alliance);
    const totalRedQuench = members.reduce((sum, member) => {
      return sum + (Number(member.redQuench) || 0);
    }, 0);
    const avgRedQuench = members.length
      ? Math.round(totalRedQuench / members.length)
      : 0;

    return [
      {
        id: `group-${alliance}`,
        __isGroupHeader: true,
        alliance,
        count: members.length,
        avgRedQuench,
        rank: "",
        name: "",
        serverId: "",
        power: "",
        redQuench: "",
        topHeroes: [],
        level: "",
        announcement: "",
      },
      ...members,
    ];
  });

  return groupedRows;
});

const saltAverageRedQuench = computed(() => {
  const list = battleRecords1.value?.legionRankList || [];
  const total = list.reduce(
    (sum, member) => sum + Number(member.redQuench || 0),
    0,
  );
  return Math.round(total / 20);
});

const saltAnnouncementText = computed(() => {
  const dateText = formatTimestamp1(inputDate1.value).replace(/\//g, "-");
  return `${dateText} 盐场分组 平均红淬：${saltAverageRedQuench.value}红`;
});

const saltFetchTimeText = computed(() => getSaltFetchTimeText());

// 计算所有俱乐部的红淬排�?
const redQuenchRankings = computed(() => {
  if (!battleRecords1.value?.legionRankList) return {};

  // 按红淬数量降序排序所有俱乐部，获取真实排�?
  const sortedByRedQuench = [...battleRecords1.value.legionRankList].sort(
    (a, b) => (b.redQuench || 0) - (a.redQuench || 0),
  );

  // 创建俱乐部ID到红淬排名的映射�?-based�?
  const rankMap = {};
  sortedByRedQuench.forEach((club, index) => {
    rankMap[club.id] = index + 1;
  });

  return rankMap;
});

// 设置当前选中联盟
const setActiveAlliance = (alliance) => {
  activeAlliance.value = alliance;
};

// 获取联盟数量
const getActiveAllianceCount = (alliance) => {
  if (!battleRecords1.value?.legionRankList) {
    return 0;
  }

  return battleRecords1.value.legionRankList.filter((member) => {
    const memberAlliance = getMemberAlliance(member);
    if (alliance === "空白") {
      return (
        !member.announcement ||
        member.announcement === 0 ||
        member.announcement === "0"
      );
    }
    return memberAlliance === alliance;
  }).length;
};

const allianceCounts = computed(() =>
  Object.fromEntries(
    allianceOptions.map((option) => [
      option.value,
      getActiveAllianceCount(option.value),
    ]),
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
  expandedMembers.value = new Set();
  fetchCurrentClubInfo(newTokenId);
  fetchBattleRecords1(newTokenId);
});
</script>

<style scoped lang="scss">
// 主容器样�?
// 主容器样�?
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

// 表格内容�?
.table-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);

  // 表格容器
  .table-container {
    flex: 1;
    overflow: auto;
    background: var(--bg-primary);
    height: 100%;

    // 滚动条样�?
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: var(--bg-secondary);
      border-radius: var(--border-radius-sm);
    }

    ::-webkit-scrollbar-thumb {
      background: var(--border-medium);
      border-radius: var(--border-radius-sm);

      &:hover {
        background: var(--border-dark);
      }
    }

    // 表格标题�?
    .table-header {
      display: flex;
      background: linear-gradient(
        180deg,
        var(--bg-secondary) 0%,
        var(--bg-primary) 100%
      );
      border-bottom: 2px solid var(--border-medium);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

      // 确保所有标题头居中对齐
      .table-cell {
        justify-content: center;
        display: flex;
        align-items: center;

        &.rank {
          width: 90px;
          min-width: 90px;
        }

        &.name {
          width: 150px;
          min-width: 150px;
        }

        &.server {
          width: 70px;
          min-width: 70px;
        }

        &.power {
          width: 100px;
          min-width: 100px;
        }

        &.red-quench {
          width: 80px;
          min-width: 80px;
        }

        &.alliance {
          width: 90px;
          min-width: 90px;
        }

        &.first-3 {
          width: 350px;
          min-width: 350px;
        }

        &.level {
          width: 70px;
          min-width: 70px;
        }

        &.announcement {
          min-width: 150px;
          flex: 1;
        }
      }
    }

    // 表格数据�?
    .table-row {
      display: flex;
      align-items: center;
      padding: var(--spacing-xs) var(--spacing-sm);
      border-bottom: 1px solid var(--border-light);
      transition: all var(--transition-fast);
      background: var(--bg-primary);

      &:hover {
        background: var(--bg-secondary);
        transform: translateX(2px);
        box-shadow: inset 3px 0 0 var(--primary-color);
      }

      &:last-child {
        border-bottom: none;
      }

      // 联盟样式�?
      &.alliance-large {
        .alliance-tag {
          background: #52c41a;
        }
      }

      &.alliance-dream {
        .alliance-tag {
          background: #faad14;
        }
      }

      &.alliance-xin-justice {
        .alliance-tag {
          background: #f5222d;
        }
      }

      &.alliance-dragon {
        .alliance-tag {
          background: #722ed1;
        }
      }

      &.alliance-xi {
        .alliance-tag {
          background: #13c2c2;
        }
      }

      &.alliance-unknown {
        .alliance-tag {
          background: #f3f4f6;
          color: #4b5563;
        }
      }

      &.alliance-other {
        .alliance-tag {
          background: #1677ff;
        }
      }

      &.alliance-all {
        .alliance-tag {
          background: #1677ff;
        }
      }
    }

    // 表格单元�?
    .table-cell {
      display: flex;
      align-items: center;
      padding: 0 var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: var(--text-primary);

      // 单元格宽度分�?
      &.rank {
        width: 90px;
        min-width: 90px;
        justify-content: center;
        font-weight: var(--font-weight-bold);
        color: var(--text-primary);
        padding: 4px 8px;

        .rank-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          padding: 4px 0;
        }

        .rank-medal {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: var(--font-size-base);
          color: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          margin: 0 6px;

          &::before {
            content: attr(data-rank);
          }

          &.gold {
            background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);

            &::before {
              content: "1";
            }
          }

          &.silver {
            background: linear-gradient(135deg, #c0c0c0 0%, #a9a9a9 100%);

            &::before {
              content: "2";
            }
          }

          &.bronze {
            background: linear-gradient(135deg, #cd7f32 0%, #b87333 100%);

            &::before {
              content: "3";
            }
          }
        }

        .rank-number {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-bold);
          color: var(--text-primary);
          margin: 0 6px;
        }
      }

      &.alliance {
        width: 90px;
        min-width: 90px;

        .alliance-tag {
          display: inline-block;
          padding: 3px 8px;
          border-radius: var(--border-radius-full);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-bold);
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          transition: all var(--transition-fast);

          &:hover {
            transform: scale(1.05);
            box-shadow: var(--shadow-medium);
          }
        }
      }

      &.score {
        width: 80px;
        min-width: 80px;
        justify-content: center;
        color: var(--warning-color);
        font-weight: var(--font-weight-bold);
        font-size: var(--font-size-base);
        text-align: center;
      }

      &.red-quench {
        width: 80px;
        min-width: 80px;
        justify-content: center;
        font-weight: var(--font-weight-bold);
        text-align: center;

        &::before {
          content: "";
          display: inline-block;
          width: 12px;
          height: 12px;
          background: var(--error-color);
          border-radius: 50%;
          margin-right: 4px;
          vertical-align: middle;
        }
      }

      &.first-3 {
        width: 350px;
        min-width: 405px;

        .hero-avatars {
          display: flex;
          gap: var(--spacing-xs);
          align-items: center;
          justify-content: flex-start;
          width: 100%;
          flex-wrap: nowrap;
          padding: var(--spacing-xs) 0;
          overflow: hidden;
        }

        .hero-card {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: var(--spacing-xs);
          padding: calc(var(--spacing-xs) / 2);
          background: var(--bg-secondary);
          border-radius: var(--border-radius-sm);
          border: 1px solid var(--border-light);
          transition: all var(--transition-fast);
          width: 200px !important;
          height: 50px !important;
          min-width: 200px !important;
          max-width: 200px !important;
          min-height: 50px !important;
          max-height: 50px !important;
          cursor: pointer;

          &:hover {
            background: var(--bg-primary);
            transform: translateY(-2px);
            box-shadow: var(--shadow-medium);
            border-color: var(--primary-color);
          }

          &:active {
            transform: translateY(0);
            box-shadow: var(--shadow-sm);
          }

          .hero-avatar-container {
            width: 32px;
            height: 32px;
            max-width: 32px;
            max-height: 32px;
            min-width: 32px;
            min-height: 32px;
            flex-shrink: 0;
          }

          .hero-avatar,
          .hero-avatar-placeholder {
            width: 32px !important;
            height: 32px !important;
            max-width: 32px !important;
            max-height: 32px !important;
            min-width: 32px;
            min-height: 32px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--border-light);
            flex-shrink: 0;
          }

          .hero-avatar-placeholder {
            background: linear-gradient(
              135deg,
              var(--primary-color) 0%,
              var(--primary-color-light) 100%
            );
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: var(--font-weight-bold);
          }
        }

        /* 覆盖全局hero-stats span样式，确保战力和红数正常显示 */
        .hero-stats span {
          padding: 0;
          background: none;
          border: none;
          border-radius: 0;
        }

        .hero-name {
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-medium);
          color: var(--text-primary);
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hero-stats {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
          font-size: var(--font-size-xs);
        }

        .hero-power,
        .hero-redquench {
          display: inline-block;
        }

        .hero-power {
          color: var(--text-primary);
          font-weight: var(--font-weight-medium);
        }

        .hero-redquench {
          font-weight: var(--font-weight-bold);
          padding: 1px 6px;
          border-radius: var(--border-radius-full);

          &.redquench-high {
            color: var(--error-color);
            background: rgba(var(--error-color-rgb), 0.1);
          }

          &.redquench-medium {
            color: var(--warning-color);
            background: rgba(var(--warning-color-rgb), 0.1);
          }

          &.redquench-low {
            color: var(--success-color);
            background: rgba(var(--success-color-rgb), 0.1);
          }
        }
      }

      &.power {
        width: 100px;
        min-width: 100px;
        justify-content: center;
        font-weight: var(--font-weight-bold);
        color: var(--primary-color);
        font-size: var(--font-size-base);
        text-align: center;
      }

      &.level {
        width: 70px;
        min-width: 70px;
        justify-content: center;

        &::before {
          content: "Lv.";
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
          margin-right: 2px;
        }

        span {
          display: inline-block;
          padding: 2px 8px;
          background: linear-gradient(
            135deg,
            var(--primary-color-light) 0%,
            var(--primary-color) 100%
          );
          color: white;
          border-radius: var(--border-radius-full);
          font-weight: var(--font-weight-bold);
          font-size: var(--font-size-sm);
        }
      }

      &.server {
        width: 80px;
        min-width: 80px;
        justify-content: center;
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
        text-align: center;
      }

      &.announcement {
        flex: 1;
        min-width: 150px;
        color: var(--text-secondary);
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
        font-size: var(--font-size-xs);
        line-height: 1.4;
        min-height: 24px;
        word-break: break-all;
      }
    }
  }
}

// 按钮样式调整
:deep(.n-button) {
  font-size: var(--font-size-sm);
  padding: 6px 12px;
  border-radius: var(--border-radius-sm);

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

// 输入框样式调�?
:deep(.n-input-wrapper) {
  font-size: var(--font-size-sm);
}

.salt-table {
  :deep(.n-data-table-th),
  :deep(.n-data-table-td),
  :deep(.n-data-table-cell) {
    padding-left: 4px !important;
    padding-right: 4px !important;
  }

  :deep(.n-data-table-th) {
    background: #f3f4f6 !important;
    border-color: #d1d5db !important;
    color: #374151 !important;
    text-align: center !important;
    white-space: nowrap !important;
  }

  :deep(.n-data-table-th .n-data-table-th__title) {
    justify-content: center !important;
    font-weight: 700 !important;
  }

  :deep(.n-data-table-th:not(:last-child)),
  :deep(.n-data-table-td:not(:last-child)) {
    border-right: 1px dashed #d1d5db !important;
  }

  :deep(.n-data-table-table) {
    width: 100% !important;
    min-width: 1380px !important;
    table-layout: fixed !important;
  }

  :deep(.n-data-table-th:last-child),
  :deep(.n-data-table-td:last-child),
  :deep(.n-data-table-td:last-child .n-data-table-cell) {
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: normal !important;
    word-break: break-all !important;
    overflow-wrap: anywhere !important;
  }

  :deep(.rank-badge) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #60a5fa;
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
  }

  :deep(.salt-alliance-tag) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 56px;
    height: 24px;
    padding: 0 6px;
    border-radius: 6px;
    border: 1px solid transparent;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
  }

  :deep(.salt-club-name-cell) {
    width: 100%;
    min-width: 146px;
    min-height: 42px;
    padding: 3px 6px;
    border-radius: 8px;
    border: 1px solid transparent;
  }

  :deep(.salt-club-name-cell.is-current-club) {
    background: #fff0f6;
    border-color: #eb2f96;
    box-shadow: inset 0 0 0 1px rgba(235, 47, 150, 0.16);
  }

  :deep(.salt-club-main-row) {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  :deep(.salt-club-name-text) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #1f2937;
    font-size: 14px;
    font-weight: 500;
  }

  :deep(.current-club-badge-row) {
    display: flex;
    justify-content: flex-end;
    margin-top: -8px;
    padding-right: 2px;
  }

  :deep(.current-club-badge) {
    padding: 2px 5px;
    border-radius: 999px;
    background: #eb2f96;
    color: #ffffff;
    font-size: 9px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
  }

  :deep(.alliance-tag-dalianmeng) {
    background: rgba(82, 196, 26, 0.18);
    border-color: rgba(82, 196, 26, 0.2);
    color: #237804;
  }

  :deep(.alliance-tag-mengmeng) {
    background: rgba(250, 173, 20, 0.2);
    border-color: rgba(250, 173, 20, 0.22);
    color: #ad6800;
  }

  :deep(.alliance-tag-zhengyi) {
    background: rgba(245, 34, 45, 0.18);
    border-color: rgba(245, 34, 45, 0.2);
    color: #cf1322;
  }

  :deep(.alliance-tag-longmeng) {
    background: rgba(114, 46, 209, 0.18);
    border-color: rgba(114, 46, 209, 0.2);
    color: #531dab;
  }

  :deep(.alliance-tag-ximeng) {
    background: rgba(19, 194, 194, 0.18);
    border-color: rgba(19, 194, 194, 0.2);
    color: #08979c;
  }

  :deep(.alliance-tag-unknown) {
    background: #ffffff;
    border-color: #d9d9d9;
    color: #4b5563;
  }

  :deep(.alliance-tag-other) {
    background: #f3f4f6;
    border-color: #d1d5db;
    color: #374151;
  }

  :deep(img) {
    max-width: none;
  }

  :deep(.salt-alliance-row) {
    border-bottom: 1px solid var(--border-light);
    transition: all 0.2s ease;
  }

  :deep(.salt-alliance-group-row),
  :deep(.salt-fetch-time-footer-row),
  :deep(.salt-alliance-group-row > td),
  :deep(.salt-fetch-time-footer-row > td),
  :deep(.salt-alliance-group-row .n-data-table-td),
  :deep(.salt-fetch-time-footer-row .n-data-table-td),
  :deep(.salt-fetch-time-footer-row .n-data-table-cell),
  :deep(.salt-alliance-group-row .n-data-table-cell) {
    background: #ffffff !important;
  }

  :deep(.salt-alliance-group-row > td),
  :deep(.salt-fetch-time-footer-row > td) {
    border-right: none !important;
    border-left: none !important;
    height: 38px !important;
  }

  :deep(.salt-alliance-group-row .n-data-table-td:not(:last-child)),
  :deep(.salt-fetch-time-footer-row .n-data-table-td:not(:last-child)),
  :deep(.salt-fetch-time-footer-row > td:not(:last-child)),
  :deep(.salt-alliance-group-row > td:not(:last-child)) {
    border-right: none !important;
  }

  :deep(.salt-fetch-time-footer) {
    width: 100%;
    padding-right: 8px;
    text-align: right;
    color: #4b5563;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
  }

  :deep(.salt-alliance-group-title) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 100%;
    padding: 0 8px;
    font-size: 15px;
    font-weight: 700;
    text-align: center;
    white-space: nowrap;
  }

  :deep(.salt-alliance-group-line) {
    display: inline-flex;
    align-items: center;
    align-self: center;
    justify-content: center;
    width: 4px;
    height: 24px;
    font-size: 0;
    font-weight: 900;
    line-height: 0;
  }

  :deep(.salt-alliance-group-line::before) {
    content: "";
    display: block;
    width: 4px;
    height: 20px;
    border-radius: 2px;
    background: currentColor;
    transform: translateY(-2px);
  }

  :deep(.salt-alliance-group-label) {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid transparent;
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
  }

  :deep(.salt-alliance-group-row-0 .salt-alliance-group-line) {
    color: #237804;
  }

  :deep(.salt-alliance-group-row-0 .salt-alliance-group-label) {
    background: rgba(82, 196, 26, 0.18);
    border-color: rgba(82, 196, 26, 0.2);
    color: #237804;
  }

  :deep(.salt-alliance-group-row-1 .salt-alliance-group-line) {
    color: #ad6800;
  }

  :deep(.salt-alliance-group-row-1 .salt-alliance-group-label) {
    background: rgba(250, 173, 20, 0.2);
    border-color: rgba(250, 173, 20, 0.22);
    color: #ad6800;
  }

  :deep(.salt-alliance-group-row-2 .salt-alliance-group-line) {
    color: #cf1322;
  }

  :deep(.salt-alliance-group-row-2 .salt-alliance-group-label) {
    background: rgba(245, 34, 45, 0.18);
    border-color: rgba(245, 34, 45, 0.2);
    color: #cf1322;
  }

  :deep(.salt-alliance-group-row-3 .salt-alliance-group-line) {
    color: #531dab;
  }

  :deep(.salt-alliance-group-row-3 .salt-alliance-group-label) {
    background: rgba(114, 46, 209, 0.18);
    border-color: rgba(114, 46, 209, 0.2);
    color: #531dab;
  }

  :deep(.salt-alliance-group-row-4 .salt-alliance-group-line) {
    color: #08979c;
  }

  :deep(.salt-alliance-group-row-4 .salt-alliance-group-label) {
    background: rgba(19, 194, 194, 0.18);
    border-color: rgba(19, 194, 194, 0.2);
    color: #08979c;
  }

  :deep(.salt-alliance-group-row-5 .salt-alliance-group-line) {
    color: #9ca3af;
  }

  :deep(.salt-alliance-group-row-5 .salt-alliance-group-label) {
    background: #ffffff;
    border-color: #d9d9d9;
    color: #4b5563;
  }

  :deep(.salt-alliance-row-0),
  :deep(.salt-alliance-row-0 > td),
  :deep(.salt-alliance-row-0 .n-data-table-td),
  :deep(.salt-alliance-row-0 .n-data-table-cell) {
    background-color: rgba(82, 196, 26, 0.035) !important;
  }

  :deep(.salt-alliance-row-0:hover),
  :deep(.salt-alliance-row-0:hover > td),
  :deep(.salt-alliance-row-0:hover .n-data-table-td),
  :deep(.salt-alliance-row-0:hover .n-data-table-cell) {
    background-color: rgba(82, 196, 26, 0.07) !important;
  }

  :deep(.salt-alliance-row-1),
  :deep(.salt-alliance-row-1 > td),
  :deep(.salt-alliance-row-1 .n-data-table-td),
  :deep(.salt-alliance-row-1 .n-data-table-cell) {
    background-color: rgba(250, 173, 20, 0.04) !important;
  }

  :deep(.salt-alliance-row-1:hover),
  :deep(.salt-alliance-row-1:hover > td),
  :deep(.salt-alliance-row-1:hover .n-data-table-td),
  :deep(.salt-alliance-row-1:hover .n-data-table-cell) {
    background-color: rgba(250, 173, 20, 0.075) !important;
  }

  :deep(.salt-alliance-row-2),
  :deep(.salt-alliance-row-2 > td),
  :deep(.salt-alliance-row-2 .n-data-table-td),
  :deep(.salt-alliance-row-2 .n-data-table-cell) {
    background-color: rgba(245, 34, 45, 0.03) !important;
  }

  :deep(.salt-alliance-row-2:hover),
  :deep(.salt-alliance-row-2:hover > td),
  :deep(.salt-alliance-row-2:hover .n-data-table-td),
  :deep(.salt-alliance-row-2:hover .n-data-table-cell) {
    background-color: rgba(245, 34, 45, 0.065) !important;
  }

  :deep(.salt-alliance-row-3),
  :deep(.salt-alliance-row-3 > td),
  :deep(.salt-alliance-row-3 .n-data-table-td),
  :deep(.salt-alliance-row-3 .n-data-table-cell) {
    background-color: rgba(114, 46, 209, 0.03) !important;
  }

  :deep(.salt-alliance-row-3:hover),
  :deep(.salt-alliance-row-3:hover > td),
  :deep(.salt-alliance-row-3:hover .n-data-table-td),
  :deep(.salt-alliance-row-3:hover .n-data-table-cell) {
    background-color: rgba(114, 46, 209, 0.065) !important;
  }

  :deep(.salt-alliance-row-4),
  :deep(.salt-alliance-row-4 > td),
  :deep(.salt-alliance-row-4 .n-data-table-td),
  :deep(.salt-alliance-row-4 .n-data-table-cell) {
    background-color: rgba(19, 194, 194, 0.035) !important;
  }

  :deep(.salt-alliance-row-4:hover),
  :deep(.salt-alliance-row-4:hover > td),
  :deep(.salt-alliance-row-4:hover .n-data-table-td),
  :deep(.salt-alliance-row-4:hover .n-data-table-cell) {
    background-color: rgba(19, 194, 194, 0.07) !important;
  }

  :deep(.salt-alliance-row-5),
  :deep(.salt-alliance-row-5 > td),
  :deep(.salt-alliance-row-5 .n-data-table-td),
  :deep(.salt-alliance-row-5 .n-data-table-cell) {
    background-color: #ffffff !important;
  }

  :deep(.salt-alliance-row-5:hover),
  :deep(.salt-alliance-row-5:hover > td),
  :deep(.salt-alliance-row-5:hover .n-data-table-td),
  :deep(.salt-alliance-row-5:hover .n-data-table-cell) {
    background-color: #f9fafb !important;
  }
}

.salt-image-exporting {
  width: 1380px !important;
  min-width: 1380px !important;
  max-width: none !important;
  height: auto !important;
  min-height: 0 !important;
  overflow: visible !important;
  flex: 0 0 auto !important;

  &.table-content {
    flex: 0 0 auto !important;
    height: auto !important;
    min-height: 0 !important;
  }

  :deep(.announcement-section),
  :deep(.alliance-tabs-section),
  .table-container,
  :deep(.n-data-table),
  :deep(.n-data-table-wrapper),
  :deep(.n-data-table-base-table),
  :deep(.n-data-table-base-table-body),
  :deep(.n-data-table-base-table-body .n-scrollbar-container),
  :deep(.n-data-table-base-table-body .n-scrollbar-content),
  :deep(.n-data-table-table-wrapper),
  :deep(.n-data-table-table) {
    width: 1380px !important;
    min-width: 1380px !important;
    max-width: none !important;
    overflow: visible !important;
  }

  :deep(.alliance-tabs-section) {
    display: grid !important;
    grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
    width: 1380px !important;
    min-width: 1380px !important;
    max-width: none !important;
    overflow: visible !important;
    justify-content: center !important;
    flex-wrap: nowrap !important;
  }

  .table-container {
    flex: 0 0 auto !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }

  :deep(.n-data-table-th:last-child),
  :deep(.n-data-table-td:last-child),
  :deep(.n-data-table-td:last-child .n-data-table-cell) {
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: normal !important;
    word-break: break-all !important;
    overflow-wrap: anywhere !important;
  }
}

// 响应式设置
@media (max-width: 1200px) {
  .table-container {
    overflow-x: auto;
  }

  .salt-table {
    :deep(.n-data-table-th),
    :deep(.n-data-table-td),
    :deep(.n-data-table-cell) {
      padding-left: 4px !important;
      padding-right: 4px !important;
    }

    :deep(.n-data-table-th) {
      background: #f3f4f6 !important;
      border-color: #d1d5db !important;
      color: #374151 !important;
      text-align: center !important;
      white-space: nowrap !important;
    }

    :deep(.n-data-table-th .n-data-table-th__title) {
      justify-content: center !important;
      font-weight: 700 !important;
    }

    :deep(.n-data-table-th:not(:last-child)),
    :deep(.n-data-table-td:not(:last-child)) {
      border-right: 1px dashed #d1d5db !important;
    }

    :deep(.n-data-table-table) {
      width: 100% !important;
      min-width: 1380px !important;
      table-layout: fixed !important;
    }

    :deep(.salt-alliance-row) {
      border-bottom: 1px solid var(--border-light);
      transition: all 0.2s ease;
    }

    :deep(.salt-alliance-group-row),
    :deep(.salt-fetch-time-footer-row),
    :deep(.salt-alliance-group-row > td),
    :deep(.salt-fetch-time-footer-row > td),
    :deep(.salt-alliance-group-row .n-data-table-td),
    :deep(.salt-fetch-time-footer-row .n-data-table-td),
    :deep(.salt-fetch-time-footer-row .n-data-table-cell),
    :deep(.salt-alliance-group-row .n-data-table-cell) {
      background: #ffffff !important;
    }

    :deep(.salt-alliance-group-row > td),
    :deep(.salt-fetch-time-footer-row > td) {
      border-right: none !important;
      border-left: none !important;
      height: 38px !important;
    }

    :deep(.salt-alliance-group-row .n-data-table-td:not(:last-child)),
    :deep(.salt-fetch-time-footer-row .n-data-table-td:not(:last-child)),
    :deep(.salt-fetch-time-footer-row > td:not(:last-child)),
    :deep(.salt-alliance-group-row > td:not(:last-child)) {
      border-right: none !important;
    }

    :deep(.salt-fetch-time-footer) {
      width: 100%;
      padding-right: 8px;
      text-align: right;
      color: #4b5563;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
    }

    :deep(.salt-alliance-group-title) {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 100%;
      padding: 0 8px;
      font-size: 15px;
      font-weight: 700;
      text-align: center;
      white-space: nowrap;
    }

    :deep(.salt-alliance-group-line) {
      display: inline-flex;
      align-items: center;
      align-self: center;
      justify-content: center;
      width: 4px;
      height: 24px;
      font-size: 0;
      font-weight: 900;
      line-height: 0;
    }

    :deep(.salt-alliance-group-line::before) {
      content: "";
      display: block;
      width: 4px;
      height: 20px;
      border-radius: 2px;
      background: currentColor;
      transform: translateY(-2px);
    }

    :deep(.salt-alliance-group-label) {
      display: inline-flex;
      align-items: center;
      height: 24px;
      padding: 0 10px;
      border-radius: 6px;
      border: 1px solid transparent;
      font-size: 14px;
      font-weight: 700;
      line-height: 1;
    }

    :deep(.salt-alliance-group-row-0 .salt-alliance-group-line) {
      color: #237804;
    }

    :deep(.salt-alliance-group-row-0 .salt-alliance-group-label) {
      background: rgba(82, 196, 26, 0.18);
      border-color: rgba(82, 196, 26, 0.2);
      color: #237804;
    }

    :deep(.salt-alliance-group-row-1 .salt-alliance-group-line) {
      color: #ad6800;
    }

    :deep(.salt-alliance-group-row-1 .salt-alliance-group-label) {
      background: rgba(250, 173, 20, 0.2);
      border-color: rgba(250, 173, 20, 0.22);
      color: #ad6800;
    }

    :deep(.salt-alliance-group-row-2 .salt-alliance-group-line) {
      color: #cf1322;
    }

    :deep(.salt-alliance-group-row-2 .salt-alliance-group-label) {
      background: rgba(245, 34, 45, 0.18);
      border-color: rgba(245, 34, 45, 0.2);
      color: #cf1322;
    }

    :deep(.salt-alliance-group-row-3 .salt-alliance-group-line) {
      color: #531dab;
    }

    :deep(.salt-alliance-group-row-3 .salt-alliance-group-label) {
      background: rgba(114, 46, 209, 0.18);
      border-color: rgba(114, 46, 209, 0.2);
      color: #531dab;
    }

    :deep(.salt-alliance-group-row-4 .salt-alliance-group-line) {
      color: #08979c;
    }

    :deep(.salt-alliance-group-row-4 .salt-alliance-group-label) {
      background: rgba(19, 194, 194, 0.18);
      border-color: rgba(19, 194, 194, 0.2);
      color: #08979c;
    }

    :deep(.salt-alliance-group-row-5 .salt-alliance-group-line) {
      color: #9ca3af;
    }

    :deep(.salt-alliance-group-row-5 .salt-alliance-group-label) {
      background: #ffffff;
      border-color: #d9d9d9;
      color: #4b5563;
    }

    :deep(.salt-alliance-row-0),
    :deep(.salt-alliance-row-0 > td),
    :deep(.salt-alliance-row-0 .n-data-table-td),
    :deep(.salt-alliance-row-0 .n-data-table-cell) {
      background-color: rgba(82, 196, 26, 0.035) !important;
    }

    :deep(.salt-alliance-row-0:hover),
    :deep(.salt-alliance-row-0:hover > td),
    :deep(.salt-alliance-row-0:hover .n-data-table-td),
    :deep(.salt-alliance-row-0:hover .n-data-table-cell) {
      background-color: rgba(82, 196, 26, 0.07) !important;
    }

    :deep(.salt-alliance-row-1),
    :deep(.salt-alliance-row-1 > td),
    :deep(.salt-alliance-row-1 .n-data-table-td),
    :deep(.salt-alliance-row-1 .n-data-table-cell) {
      background-color: rgba(250, 173, 20, 0.04) !important;
    }

    :deep(.salt-alliance-row-1:hover),
    :deep(.salt-alliance-row-1:hover > td),
    :deep(.salt-alliance-row-1:hover .n-data-table-td),
    :deep(.salt-alliance-row-1:hover .n-data-table-cell) {
      background-color: rgba(250, 173, 20, 0.075) !important;
    }

    :deep(.salt-alliance-row-2),
    :deep(.salt-alliance-row-2 > td),
    :deep(.salt-alliance-row-2 .n-data-table-td),
    :deep(.salt-alliance-row-2 .n-data-table-cell) {
      background-color: rgba(245, 34, 45, 0.03) !important;
    }

    :deep(.salt-alliance-row-2:hover),
    :deep(.salt-alliance-row-2:hover > td),
    :deep(.salt-alliance-row-2:hover .n-data-table-td),
    :deep(.salt-alliance-row-2:hover .n-data-table-cell) {
      background-color: rgba(245, 34, 45, 0.065) !important;
    }

    :deep(.salt-alliance-row-3),
    :deep(.salt-alliance-row-3 > td),
    :deep(.salt-alliance-row-3 .n-data-table-td),
    :deep(.salt-alliance-row-3 .n-data-table-cell) {
      background-color: rgba(114, 46, 209, 0.03) !important;
    }

    :deep(.salt-alliance-row-3:hover),
    :deep(.salt-alliance-row-3:hover > td),
    :deep(.salt-alliance-row-3:hover .n-data-table-td),
    :deep(.salt-alliance-row-3:hover .n-data-table-cell) {
      background-color: rgba(114, 46, 209, 0.065) !important;
    }

    :deep(.salt-alliance-row-4),
    :deep(.salt-alliance-row-4 > td),
    :deep(.salt-alliance-row-4 .n-data-table-td),
    :deep(.salt-alliance-row-4 .n-data-table-cell) {
      background-color: rgba(19, 194, 194, 0.035) !important;
    }

    :deep(.salt-alliance-row-4:hover),
    :deep(.salt-alliance-row-4:hover > td),
    :deep(.salt-alliance-row-4:hover .n-data-table-td),
    :deep(.salt-alliance-row-4:hover .n-data-table-cell) {
      background-color: rgba(19, 194, 194, 0.07) !important;
    }

    :deep(.salt-alliance-row-5),
    :deep(.salt-alliance-row-5 > td),
    :deep(.salt-alliance-row-5 .n-data-table-td),
    :deep(.salt-alliance-row-5 .n-data-table-cell) {
      background-color: #ffffff !important;
    }

    :deep(.salt-alliance-row-5:hover),
    :deep(.salt-alliance-row-5:hover > td),
    :deep(.salt-alliance-row-5:hover .n-data-table-td),
    :deep(.salt-alliance-row-5:hover .n-data-table-cell) {
      background-color: #f9fafb !important;
    }

    .rank-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      font-weight: bold;
      color: white;
      font-size: 12px;

      &.gold {
        background: linear-gradient(135deg, #ffd700, #ffb700);
        box-shadow: 0 2px 4px rgba(255, 215, 0, 0.4);
      }

      &.silver {
        background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
        box-shadow: 0 2px 4px rgba(192, 192, 192, 0.4);
      }

      &.bronze {
        background: linear-gradient(135deg, #cd7f32, #b87333);
        box-shadow: 0 2px 4px rgba(205, 127, 50, 0.4);
      }
    }

    .rank-number {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .member-info {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }

    .hero-avatars {
      display: flex !important;
      flex-direction: row !important;
      gap: 12px !important;
      justify-content: flex-start !important;
      align-items: flex-start !important;
      width: 100% !important;
    }

    .hero-card {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 8px !important;
      width: 140px !important;
      padding: 8px !important;
      background: #f3f4f6 !important;
      border-radius: 8px !important;
      border: 1px solid #e5e7eb !important;
      flex-shrink: 0 !important;
    }

    .hero-avatar-container {
      flex-shrink: 0 !important;
      cursor: pointer !important;
      width: 30px !important;
      height: 30px !important;
    }

    .hero-avatar,
    .hero-avatar-placeholder {
      width: 30px !important;
      height: 30px !important;
      border-radius: 50% !important;
      object-fit: cover !important;
      border: 2px solid #e5e7eb !important;
    }

    .hero-info {
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
      flex-shrink: 1 !important;
    }

    .hero-top {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      white-space: nowrap !important;
    }

    .hero-bottom {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      white-space: nowrap !important;
    }

    .table-header {
      background: linear-gradient(
        135deg,
        var(--primary-color) 0%,
        var(--primary-color-light) 100%
      );
      color: white;

      .table-cell {
        padding: var(--spacing-sm) var(--spacing-md);
        font-weight: var(--font-weight-bold);
        text-align: center;
        border-right: 1px solid rgba(255, 255, 255, 0.2);
        white-space: nowrap;

        &:last-child {
          border-right: none;
        }
      }
    }

    .table-row {
      transition: background-color var(--transition-fast);

      &:hover {
        background-color: var(--bg-hover);
      }

      &:nth-child(even) {
        background-color: var(--bg-secondary);
      }

      &:nth-child(odd) {
        background-color: var(--bg-primary);
      }

      .table-cell {
        padding: var(--spacing-sm) var(--spacing-md);
        border-right: 1px solid var(--border-light);
        border-bottom: 1px solid var(--border-light);
        vertical-align: middle;
        text-align: center;

        &:last-child {
          border-right: none;
        }

        &.rank {
          width: 70px;
          min-width: 70px;
        }

        &.name {
          width: 180px;
          min-width: 180px;
          text-align: left;

          .member-info {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);

            .member-avatar,
            .member-avatar-placeholder {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid var(--border-light);
            }

            .member-avatar-placeholder {
              background: linear-gradient(
                135deg,
                var(--primary-color) 0%,
                var(--primary-color-light) 100%
              );
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: var(--font-weight-bold);
            }

            .member-name {
              font-weight: var(--font-weight-medium);
              color: var(--text-primary);
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }

        &.server {
          width: 80px;
          min-width: 80px;
        }

        &.power {
          width: 100px;
          min-width: 100px;
          font-weight: var(--font-weight-bold);
          color: var(--primary-color);
        }

        &.red-quench {
          width: 80px;
          min-width: 80px;
        }

        &.alliance {
          width: 100px;
          min-width: 100px;
        }

        &.first-3 {
          width: 500px;
          min-width: 450px;
          padding: 4px;

          .hero-avatars {
            display: flex;
            gap: 12px;
            justify-content: flex-start;
            align-items: flex-start;
          }

          .hero-card {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 140px;
            padding: 8px;
            background: var(--bg-secondary);
            border-radius: 8px;
            border: 1px solid var(--border-light);
            flex-shrink: 0;

            .hero-avatar-container {
              flex-shrink: 0;
              cursor: pointer;
              width: 30px;
              height: 30px;
            }

            .hero-avatar,
            .hero-avatar-placeholder {
              width: 30px;
              height: 30px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid var(--border-light);
            }

            .hero-avatar-placeholder {
              background: linear-gradient(
                135deg,
                var(--primary-color) 0%,
                var(--primary-color-light) 100%
              );
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: var(--font-weight-bold);
            }

            .hero-info {
              display: flex;
              flex-direction: column;
              gap: 2px;
              flex-shrink: 1;

              .hero-top {
                display: flex;
                align-items: center;
                gap: 4px;
                white-space: nowrap;

                .hero-name {
                  font-size: var(--font-size-xs);
                  font-weight: var(--font-weight-medium);
                  color: var(--text-primary);
                }

                .hero-holy-beast {
                  font-size: 10px;
                  color: white;
                  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                  padding: 1px 4px;
                  border-radius: var(--border-radius-full);
                  font-weight: var(--font-weight-bold);
                  flex-shrink: 0;
                }
              }

              .hero-bottom {
                display: flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;

                .hero-power {
                  font-size: var(--font-size-xs);
                  color: var(--text-secondary);
                }

                .hero-redquench {
                  font-size: var(--font-size-xs);
                  font-weight: var(--font-weight-medium);
                }
              }
            }
          }
        }
      }

      &.power {
        width: 100px;
        min-width: 100px;
      }

      &.level,
      &.server {
        width: 70px;
        min-width: 70px;
      }

      &.announcement {
        min-width: 150px;
      }
    }
  }
}

@media (max-width: 768px) {
  .club-warrank-container {
    padding: var(--spacing-xs);
  }

  :deep(.alliance-tabs-section) {
    padding: var(--spacing-xs) var(--spacing-xs);
  }

  .table-content {
    overflow-x: auto;
    overflow-y: hidden;
  }

  :deep(.announcement-section),
  :deep(.alliance-tabs-section),
  .table-container {
    width: 1380px;
    min-width: 1380px;
    max-width: none;
  }

  :deep(.alliance-tabs-section) {
    overflow: visible;
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  .table-container {
    overflow-x: visible;
    overflow-y: auto;
  }

}
</style>
