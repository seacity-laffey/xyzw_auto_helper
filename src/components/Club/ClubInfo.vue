<template>
  <MyCard class="club-info" :status-class="{ active: !!club }">
    <template #icon><img alt="俱乐部图标" src="/icons/1733492491706152.png"></template>
    <template #title><h3>俱乐部信息</h3><p>军团/俱乐部概览与成员</p></template>
    <template #badge><span>{{ club ? "已加入" : "暂无俱乐部" }}</span></template>
    <template #default>
      <div v-if="!club" class="empty-club">
        <UsersRound :size="24"></UsersRound><strong>暂无俱乐部</strong><span>刷新后重新读取当前角色的俱乐部状态</span>
        <Button size="sm" variant="outline" @click="refreshClub"><RotateCw :size="14"></RotateCw>刷新</Button>
      </div>
      <div v-else>
        <div class="toolbar">
          <Button v-if="canKick" size="sm" variant="outline" @click="getApplyList"><UserRoundPlus :size="14"></UserRoundPlus>申请列表</Button>
          <Button size="sm" variant="outline" @click="refreshClub"><RotateCw :size="14"></RotateCw>刷新</Button>
        </div>

        <nav aria-label="俱乐部信息视图" class="club-tabs" role="tablist">
          <button v-for="tab in clubTabs" :key="tab.value" class="club-tab" role="tab" type="button" :aria-selected="activeTab === tab.value" :class="{ active: activeTab === tab.value }" @click="activeTab = tab.value">{{ tab.label }}</button>
        </nav>

        <ClubOverviewPanel
          v-show="activeTab === 'overview'"
          role="tabpanel"
          :club="club"
          :leader="leader"
          :member-count="members.length"
          :overview="clubOverview"
          :signed-in="legionSignedIn"
          @sign-in="signInLegion"
        ></ClubOverviewPanel>

        <div ref="exportDom" v-show="activeTab === 'members'" class="member-export-surface" role="tabpanel" :class="{ exporting: isExporting }">
          <ClubMemberTable
            :can-kick="canKick"
            :exporting="isExporting"
            :loading="batchLoading"
            :members="topMembers"
            @export="handleExportImage"
            @fetch-lineups="fetchAllMembersLineup"
            @kick="kickMember($event.roleId, $event.name)"
            @select="fetchTargetInfo"
          ></ClubMemberTable>
        </div>

        <div v-if="activeTab === 'history'" role="tabpanel"><ClubHistoryRecords inline></ClubHistoryRecords></div>
        <div v-if="activeTab === 'weirdtower'" role="tabpanel"><ClubWeirdTowerInfo inline></ClubWeirdTowerInfo></div>
      </div>
    </template>
  </MyCard>

  <ClubApplicationDialog
    v-model:open="showApplyList"
    :applications="applyList"
    :loading="loadingApply"
    @approve="approveApply"
    @approve-all="approveAll"
    @reject="rejectApply"
    @reject-all="rejectAll"
  ></ClubApplicationDialog>
  <ClubMemberDetailDialog
    v-model:open="showPlayerInfoModal"
    :legacy-colors="legacycolor"
    :player="playerInfo"
    @select-hero="selectHeroInfo"
  ></ClubMemberDetailDialog>
  <ClubHeroDetailDialog v-model:open="showHeroModal" :hero="heroModealTemp"></ClubHeroDetailDialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useDialog, useMessage } from "naive-ui";
import { RotateCw, UserRoundPlus, UsersRound } from "@lucide/vue";
import ClubApplicationDialog from "./ClubApplicationDialog.vue";
import ClubHeroDetailDialog from "./ClubHeroDetailDialog.vue";
import ClubHistoryRecords from "./ClubHistoryRecords.vue";
import ClubMemberDetailDialog from "./ClubMemberDetailDialog.vue";
import ClubMemberTable from "./ClubMemberTable.vue";
import ClubOverviewPanel from "./ClubOverviewPanel.vue";
import ClubWeirdTowerInfo from "./ClubWeirdTowerInfo.vue";
import { Button } from "@/components/ui/button";
import { useTokenStore } from "@/stores/tokenStore";
import {
  createClubOverview,
  findClubLeader,
  formatClubNumber,
  parseClubApplications,
  sortClubMembers,
} from "@/utils/clubInfoData";
import { buildClubPlayerInfo, extractClubHeroInfo } from "@/utils/clubPlayerInfo";
import { getLineupType, HERO_DICT, HeroFillInfo, legacycolor } from "@/utils/heroList";
import html2canvas from "html2canvas";
import { downloadCanvasAsImage } from "@/utils/imageExport";

const tokenStore = useTokenStore();
const message = useMessage();
const dialog = useDialog();
const clubTabs = [
  { label: "概览", value: "overview" },
  { label: "成员", value: "members" },
  { label: "俱乐部历史战绩", value: "history" },
  { label: "怪异塔信息", value: "weirdtower" },
];

const info = computed(() => tokenStore.gameData?.legionInfo || null);
const club = computed(() => info.value?.info || null);
const members = computed(() => Object.values(club.value?.members || {}));
const topMembers = computed(() => sortClubMembers(members.value));
const leader = computed(() => findClubLeader(members.value, club.value?.leaderId));
const currentMemberJob = computed(() => {
  const roleId = tokenStore.gameData?.roleInfo?.role?.roleId;
  return members.value.find((member) => Number(member.roleId) === Number(roleId))?.job || 0;
});
const canKick = computed(() => [1, 2].includes(currentMemberJob.value));
const clubOverview = computed(() => createClubOverview(
  info.value,
  tokenStore.gameData?.roleInfo?.role?.statistics,
));
const legionSignedIn = computed(() => {
  const timestamp = Number(
    tokenStore.gameData?.roleInfo?.role?.statisticsTime?.["legion:sign:in"] || 0,
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return timestamp > Math.floor(today.getTime() / 1000);
});

const activeTab = ref("overview");
const batchLoading = ref(false);
const isExporting = ref(false);
const exportDom = ref(null);
const showPlayerInfoModal = ref(false);
const playerInfo = ref(null);
const showHeroModal = ref(false);
const heroModealTemp = ref(null);
const showApplyList = ref(false);
const loadingApply = ref(false);
const applyList = ref([]);
const selectedConnection = computed(() => {
  const token = tokenStore.selectedToken;
  return {
    tokenId: token?.id || "",
    status: token ? tokenStore.getWebSocketStatus(token.id) : "disconnected",
  };
});

const selectedToken = () => tokenStore.selectedToken;
const updateMemberLineup = (roleId, lineupType) => {
  const member = tokenStore.gameData?.legionInfo?.info?.members?.[roleId];
  if (member)
    member.lineupType = lineupType;
};

const fetchAllMembersLineup = async () => {
  if (batchLoading.value)
    return;
  const token = selectedToken();
  if (!token || !members.value.length)
    return;
  if (tokenStore.getWebSocketStatus(token.id) !== "connected") {
    message.error("WebSocket未连接，无法获取阵容信息");
    return;
  }

  batchLoading.value = true;
  message.loading("正在获取成员阵容信息...");
  try {
    const memberIds = members.value.map((member) => member.roleId);
    for (let index = 0; index < memberIds.length; index += 5) {
      const chunk = memberIds.slice(index, index + 5);
      await Promise.all(chunk.map(async (roleId) => {
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
              roleId: Number(roleId),
            },
            5000,
          );
          if (result?.roleInfo) {
            const heroes = extractClubHeroInfo(result.roleInfo.heroes, HERO_DICT);
            updateMemberLineup(roleId, getLineupType(heroes.heroList));
          }
        } catch (error) {
          console.error(`Failed to fetch info for ${roleId}`, error);
        }
      }));
    }
    message.success("阵容信息获取完成");
  } catch (error) {
    message.error(`获取失败: ${error.message}`);
  } finally {
    batchLoading.value = false;
  }
};

const handleExportImage = async () => {
  if (!exportDom.value) {
    message.error("未找到要导出的内容");
    return;
  }
  try {
    isExporting.value = true;
    message.loading("正在生成图片，请稍候...");
    await nextTick();
    await document.fonts?.ready;
    const canvas = await html2canvas(exportDom.value, {
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      scale: 2,
      useCORS: true,
    });
    const date = new Date().toLocaleDateString().replaceAll("/", "-");
    downloadCanvasAsImage(canvas, `俱乐部成员信息_${date}.png`);
    message.success("图片导出成功");
  } catch (error) {
    console.error("DOM转图片失败：", error);
    message.error("导出图片失败，请重试");
  } finally {
    isExporting.value = false;
  }
};

const fetchTargetInfo = async (roleId) => {
  const token = selectedToken();
  if (!token) {
    message.warning("请先选择游戏角色");
    return;
  }
  if (tokenStore.getWebSocketStatus(token.id) !== "connected") {
    message.error("WebSocket未连接，无法查询信息");
    return;
  }

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
      fillPearls: HeroFillInfo,
      formatPower: formatClubNumber,
      heroDict: HERO_DICT,
    });
    if (!data) {
      message.warning("未查询到玩家信息");
      return;
    }
    data.lineupType = getLineupType(data.heroList);
    updateMemberLineup(roleId, data.lineupType);
    playerInfo.value = data;
    showPlayerInfoModal.value = true;
    message.success("查询成功");
  } catch (error) {
    message.error(`查询失败: ${error.message}`);
    console.error("查询失败详细信息:", error);
  }
};

const selectHeroInfo = (hero) => {
  heroModealTemp.value = hero;
  showHeroModal.value = true;
};
const kickMember = (roleId, name) => {
  const token = selectedToken();
  if (!token)
    return;
  dialog.warning({
    content: `确定要踢出成员 ${name} ID: ${roleId} 吗？`,
    negativeText: "取消",
    positiveText: "确定",
    title: "确认踢出",
    onPositiveClick: () => {
      tokenStore.sendMessage(token.id, "legion_kickout", { roleId: Number(roleId) });
      const clubMembers = tokenStore.gameData?.legionInfo?.info?.members;
      if (clubMembers) {
        delete clubMembers[roleId];
        setTimeout(refreshClub, 1000);
      }
      message.info(`正在踢出成员 ID: ${roleId}`);
    },
  });
};

const getApplyList = async () => {
  const token = selectedToken();
  if (!token)
    return;
  showApplyList.value = true;
  loadingApply.value = true;
  applyList.value = [];
  try {
    const response = await tokenStore.sendMessageWithPromise(
      token.id,
      "legion_applylist",
      {},
      10000,
    );
    applyList.value = parseClubApplications(response);
    if (applyList.value.length)
      message.success(`获取到 ${applyList.value.length} 个申请`);
    else
      message.info("暂无申请");
  } catch (error) {
    message.error(`获取申请列表失败: ${error.message || "未知错误"}`);
    console.error("获取申请列表出错:", error);
  } finally {
    loadingApply.value = false;
  }
};

const removeApplication = (roleId) => {
  applyList.value = applyList.value.filter((application) => application.roleId !== roleId);
};
const approveApply = (roleId) => {
  const token = selectedToken();
  if (!token)
    return;
  tokenStore.sendMessage(token.id, "legion_agree", { roleId: Number(roleId) });
  removeApplication(roleId);
  message.info(`已通过成员 ID: ${roleId} 的申请`);
  setTimeout(refreshClub, 1000);
};
const rejectApply = (roleId) => {
  const token = selectedToken();
  if (!token)
    return;
  tokenStore.sendMessage(token.id, "legion_ignore", { roleId: Number(roleId) });
  removeApplication(roleId);
  message.info(`已拒绝成员 ID: ${roleId} 的申请`);
};
const processAllApplications = (command, actionLabel) => {
  const token = selectedToken();
  if (!token || !applyList.value.length)
    return;
  const count = applyList.value.length;
  applyList.value.forEach((application) => {
    tokenStore.sendMessage(token.id, command, { roleId: Number(application.roleId) });
  });
  applyList.value = [];
  message.success(`已${actionLabel}所有 ${count} 个申请`);
  if (command === "legion_agree")
    setTimeout(refreshClub, 1000);
};
const approveAll = () => processAllApplications("legion_agree", "通过");
const rejectAll = () => processAllApplications("legion_ignore", "拒绝");

const signInLegion = () => {
  const token = selectedToken();
  if (!token || legionSignedIn.value)
    return;
  tokenStore.sendMessage(token.id, "legion_signin");
  tokenStore.sendMessage(token.id, "role_getroleinfo");
  message.info("俱乐部签到");
};
function refreshClub() {
  const token = selectedToken();
  if (!token)
    return;
  tokenStore.sendMessage(token.id, "legion_getinfo");
  if (activeTab.value === "members")
    fetchAllMembersLineup();
}

let lastAutoFetchedTokenId = "";
watch(selectedConnection, ({ tokenId, status }) => {
  if (!tokenId || status !== "connected") {
    lastAutoFetchedTokenId = "";
    return;
  }
  if (lastAutoFetchedTokenId === tokenId)
    return;

  lastAutoFetchedTokenId = tokenId;
  refreshClub();
}, { immediate: true });

watch(activeTab, (tab) => {
  if (tab === "members" && !batchLoading.value && !members.value.some((member) => member.lineupType))
    fetchAllMembersLineup();
});
</script>

<style scoped>
.club-info { min-width: 0; }
.toolbar { display: flex; justify-content: flex-end; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm); }
.empty-club { display: flex; min-height: 176px; flex-direction: column; align-items: center; justify-content: center; gap: var(--spacing-xs); color: var(--text-secondary); text-align: center; }
.empty-club strong { color: var(--text-primary); font-size: var(--font-size-sm); }
.empty-club > span { margin-bottom: var(--spacing-xs); font-size: var(--font-size-xs); }
.club-tabs { display: flex; gap: var(--spacing-lg); margin-bottom: var(--spacing-md); overflow-x: auto; border-bottom: 1px solid var(--border-color); }
.club-tab { min-height: 38px; flex: 0 0 auto; padding: 0 2px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--text-secondary); font: inherit; font-size: var(--font-size-sm); cursor: pointer; }
.club-tab:hover { color: var(--text-primary); }
.club-tab.active { border-bottom-color: var(--text-primary); color: var(--text-primary); font-weight: var(--font-weight-semibold); }
.member-export-surface { width: 100%; min-width: 0; max-width: 100%; }
.member-export-surface.exporting { width: 650px; max-width: none; background: #fff; }

@media (max-width: 768px) {
  .club-tabs { gap: var(--spacing-md); }
}
</style>
