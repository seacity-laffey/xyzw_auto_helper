<template>
  <div
    class="game-status-container"
    :class="{
      'full-grid': activeSection === 'fightPvp',
      'full-page-mode':
        activeSection === 'saltFieldGroup'
        || activeSection === 'peachGroup'
        || activeSection === 'rankGroup',
      'club-mode': activeSection === 'club',
    }"
  >
    <!-- 身份牌常驻（嵌入式，Tabs 上方） -->
    <IdentityCard embedded></IdentityCard>

    <nav aria-label="角色功能分类" class="section-tabs">
      <button
        v-for="item in sectionItems"
        :key="item.value"
        role="tab"
        type="button"
        :aria-selected="activeSection === item.value"
        :class="{ active: activeSection === item.value }"
        @click="activeSection = item.value"
      >
        {{ item.label }}
      </button>
    </nav>

    <!-- 阵容（仅日常） -->
    <TeamFormation v-if="activeSection === 'daily'"></TeamFormation>

    <!-- 每日任务状态（仅日常） -->
    <DailyTaskStatus v-if="activeSection === 'daily'"></DailyTaskStatus>

    <!-- 咸将塔状态 -->
    <TowerStatus v-if="activeSection === 'daily' && isShowTowerStatus"></TowerStatus>

    <!-- 怪异塔状态 -->
    <WeirdTowerStatus v-if="activeSection === 'daily'"></WeirdTowerStatus>

    <!-- 盐罐机器人状态（提取组件） -->
    <BottleHelperCard v-if="activeSection === 'daily'"></BottleHelperCard>

    <!-- 挂机状态（提取组件） -->
    <HangUpStatusCard v-if="activeSection === 'daily'"></HangUpStatusCard>

    <!-- 无限阵容助手（提取组件） -->
    <UnlimitedLineup v-if="activeSection === 'tools'"></UnlimitedLineup>

    <!-- 宝箱助手（提取组件） -->
    <BoxHelperCard v-if="activeSection === 'tools'"></BoxHelperCard>

    <!-- 钓鱼助手（提取组件） -->
    <FishHelperCard v-if="activeSection === 'tools'"></FishHelperCard>

    <!-- 招募助手（提取组件） -->
    <RecruitHelperCard v-if="activeSection === 'tools'"></RecruitHelperCard>

    <!-- 升星助手（提取组件） -->
    <StarUpgradeCard v-if="activeSection === 'tools'"></StarUpgradeCard>

    <!-- 竞技场助手（提取组件） -->
    <FightHelperCard v-if="activeSection === 'tools'"></FightHelperCard>

    <!-- 梦境助手（提取组件） -->
    <DreamHelperCard v-if="activeSection === 'tools'"></DreamHelperCard>

    <!-- 武将升级助手（提取组件） -->
    <HeroUpgradeCard v-if="activeSection === 'tools'"></HeroUpgradeCard>

    <!-- 洗练助手（提取组件） -->
    <RefineHelperCard v-if="activeSection === 'tools'"></RefineHelperCard>

    <!-- 消耗活动进度（提取组件） -->
    <ConsumptionProgressCard v-if="activeSection === 'tools'"></ConsumptionProgressCard>
    <!-- 俱乐部信息与今日俱乐部战统计 -->
    <ClubInfo v-if="activeSection === 'club'"></ClubInfo>
    <ClubDailyBattleStats v-if="activeSection === 'club'"></ClubDailyBattleStats>

    <!-- 月度任务进度（提取组件） -->
    <MonthlyTasksCard v-if="activeSection === 'activity'"></MonthlyTasksCard>

    <!-- 咸鱼大冲关（提取组件） -->
    <StudyChallengeCard v-if="activeSection === 'activity'"></StudyChallengeCard>

    <!-- 换皮闯关 -->
    <SkinChallengeCard v-if="activeSection === 'activity'"></SkinChallengeCard>

    <!-- 盐场分组（包含盐场、周战绩、月战绩） -->
    <div v-if="activeSection === 'saltFieldGroup'" class="salt-field-group">
      <nav aria-label="盐场视图" class="sub-tabs">
        <button
          v-for="item in saltFieldTabs"
          :key="item.value"
          type="button"
          :aria-current="saltFieldSubTab === item.value ? 'page' : undefined"
          :class="{ active: saltFieldSubTab === item.value }"
          @click="saltFieldSubTab = item.value"
        >
          {{ item.label }}
        </button>
      </nav>

      <div
        v-if="saltFieldSubTab === 'weekBattle'"
        class="warrank-full-container"
      >
        <ClubBattleRecords></ClubBattleRecords>
      </div>

      <div
        v-if="saltFieldSubTab === 'warrank'"
        class="warrank-full-container style2-container"
      >
        <ClubWarRank></ClubWarRank>
      </div>

      <div
        v-if="saltFieldSubTab === 'monthBattle'"
        class="warrank-full-container"
      >
        <ClubMonthBattleRecords></ClubMonthBattleRecords>
      </div>

      <div
        v-if="saltFieldSubTab === 'legionWarMap'"
        class="warrank-full-container"
      >
        <LegionWarMap></LegionWarMap>
      </div>
      <div
        v-if="saltFieldSubTab === 'legionWarStatistics'"
        class="warrank-full-container"
      >
        <LegionWarStatistics></LegionWarStatistics>
      </div>
    </div>

    <!-- 蟠桃园分组 -->
    <div v-if="activeSection === 'peachGroup'" class="peach-group">
      <nav aria-label="蟠桃园视图" class="sub-tabs">
        <button
          v-for="item in peachTabs"
          :key="item.value"
          type="button"
          :aria-current="peachSubTab === item.value ? 'page' : undefined"
          :class="{ active: peachSubTab === item.value }"
          @click="peachSubTab = item.value"
        >
          {{ item.label }}
        </button>
      </nav>

      <div v-if="peachSubTab === 'peach'" class="style-switch-bar">
        <div aria-label="蟠桃园样式" class="segmented-control">
          <button
            v-for="item in styleOptions"
            :key="item.value"
            type="button"
            :aria-pressed="peachStyle === item.value"
            :class="{ active: peachStyle === item.value }"
            @click="peachStyle = item.value"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div v-if="peachSubTab === 'peachBattle'" class="warrank-full-container">
        <PeachBattleRecords></PeachBattleRecords>
      </div>

      <div
        v-if="peachSubTab === 'peach'"
        class="warrank-full-container"
        :class="{ 'style2-container': peachStyle === 'style2' }"
      >
        <PeachInfoV2 v-if="peachStyle === 'style2'"></PeachInfoV2>
        <PeachInfo v-else></PeachInfo>
      </div>
    </div>

    <!-- 排行榜分组 -->
    <div v-if="activeSection === 'rankGroup'" class="rank-group">
      <nav aria-label="排行榜视图" class="sub-tabs">
        <button
          v-for="item in rankTabs"
          :key="item.value"
          type="button"
          :aria-current="rankSubTab === item.value ? 'page' : undefined"
          :class="{ active: rankSubTab === item.value }"
          @click="rankSubTab = item.value"
        >
          {{ item.label }}
        </button>
      </nav>

      <div v-if="rankSubTab === 'serverrank'" class="warrank-full-container">
        <ServerRankList></ServerRankList>
      </div>

      <div v-if="rankSubTab === 'toprank'" class="warrank-full-container">
        <TopRankList></TopRankList>
      </div>

      <div v-if="rankSubTab === 'topclubrank'" class="warrank-full-container">
        <TopClubList></TopClubList>
      </div>

      <div v-if="rankSubTab === 'goldclubrank'" class="warrank-full-container">
        <GoldClubList></GoldClubList>
      </div>

      <div
        v-if="rankSubTab === 'greatRouteRank'"
        class="warrank-full-container"
      >
        <GreatRouteRankList></GreatRouteRankList>
      </div>
    </div>
    <!-- 切磋（提取组件） -->
    <FightPvP v-if="activeSection === 'fightPvp'"></FightPvP>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, ref, watch } from "vue";
import { useTokenStore } from "@/stores/tokenStore";
import IdentityCard from "../Common/IdentityCard.vue";

const TeamFormation = defineAsyncComponent(
  () => import("../Team/TeamFormation.vue"),
);
const DailyTaskStatus = defineAsyncComponent(
  () => import("../Daily/DailyTaskStatus.vue"),
);
const TowerStatus = defineAsyncComponent(
  () => import("../Tower/TowerStatus.vue"),
);
const WeirdTowerStatus = defineAsyncComponent(
  () => import("../Tower/WeirdTowerStatus.vue"),
);
const BottleHelperCard = defineAsyncComponent(
  () => import("../Cards/Helper/BottleHelperCard.vue"),
);
const HangUpStatusCard = defineAsyncComponent(
  () => import("../Cards/Activity/HangUpStatusCard.vue"),
);
const UnlimitedLineup = defineAsyncComponent(
  () => import("../Cards/Activity/UnlimitedLineup.vue"),
);
const BoxHelperCard = defineAsyncComponent(
  () => import("../Cards/Helper/BoxHelperCard.vue"),
);
const FishHelperCard = defineAsyncComponent(
  () => import("../Cards/Helper/FishHelperCard.vue"),
);
const RecruitHelperCard = defineAsyncComponent(
  () => import("../Cards/Helper/RecruitHelperCard.vue"),
);
const StarUpgradeCard = defineAsyncComponent(
  () => import("../Cards/Upgrade/StarUpgradeCard.vue"),
);
const FightHelperCard = defineAsyncComponent(
  () => import("../Cards/Helper/FightHelperCard.vue"),
);
const DreamHelperCard = defineAsyncComponent(
  () => import("../Cards/Helper/DreamHelperCard.vue"),
);
const HeroUpgradeCard = defineAsyncComponent(
  () => import("../Cards/Upgrade/HeroUpgradeCard.vue"),
);
const RefineHelperCard = defineAsyncComponent(
  () => import("../Cards/Helper/RefineHelperCard.vue"),
);
const ConsumptionProgressCard = defineAsyncComponent(
  () => import("../Cards/Activity/ConsumptionProgressCard.vue"),
);
const ClubInfo = defineAsyncComponent(() => import("../Club/ClubInfo.vue"));
const ClubDailyBattleStats = defineAsyncComponent(
  () => import("../Club/ClubDailyBattleStats.vue"),
);
const MonthlyTasksCard = defineAsyncComponent(
  () => import("../Cards/Activity/MonthlyTasksCard.vue"),
);
const StudyChallengeCard = defineAsyncComponent(
  () => import("../Cards/Activity/StudyChallengeCard.vue"),
);
const SkinChallengeCard = defineAsyncComponent(
  () => import("../Cards/Activity/SkinChallengeCard.vue"),
);
const ClubWarRank = defineAsyncComponent(
  () => import("../Club/ClubWarRank.vue"),
);
const ClubMonthBattleRecords = defineAsyncComponent(
  () => import("../Club/ClubMonthBattleRecords.vue"),
);
const ClubBattleRecords = defineAsyncComponent(
  () => import("../Club/ClubBattleRecords.vue"),
);
const LegionWarMap = defineAsyncComponent(
  () => import("../Club/LegionWarMap.vue"),
);
const LegionWarStatistics = defineAsyncComponent(
  () => import("../Club/LegionWarStatistics.vue"),
);
const PeachInfo = defineAsyncComponent(() => import("../Club/PeachInfo.vue"));
const PeachInfoV2 = defineAsyncComponent(
  () => import("../Club/PeachInfoV2.vue"),
);
const PeachBattleRecords = defineAsyncComponent(
  () => import("../Club/PeachBattleRecords.vue"),
);
const ServerRankList = defineAsyncComponent(
  () => import("../Cards/Rank/ServerRankListPageCard.vue"),
);
const TopRankList = defineAsyncComponent(
  () => import("../Cards/Rank/TopRankListPageCard.vue"),
);
const TopClubList = defineAsyncComponent(
  () => import("../Cards/Rank/TopClubListPageCard.vue"),
);
const GoldClubList = defineAsyncComponent(
  () => import("../Cards/Rank/GoldRankListPageCard.vue"),
);
const GreatRouteRankList = defineAsyncComponent(
  () => import("../Club/GreatRouteRankListPageCard.vue"),
);
const FightPvP = defineAsyncComponent(
  () => import("../Cards/Activity/FightPvP.vue"),
);

const tokenStore = useTokenStore();
const activeSection = ref("daily");
const saltFieldSubTab = ref("warrank");
const peachSubTab = ref("peach");
const rankSubTab = ref("serverrank");
const peachStyle = ref(localStorage.getItem("peach_info_style") || "style1");

localStorage.removeItem("club_warrank_style");
watch(peachStyle, (style) => {
  localStorage.setItem("peach_info_style", style);
});

const roleInfo = computed(() => {
  return tokenStore.gameData?.roleInfo || null;
});
const isShowTowerStatus = computed(() => {
  const tower = roleInfo.value?.role?.tower;
  const towerId = tower?.id;
  const floor = Math.floor(towerId / 10) + 1;
  if (floor > 450) {
    return false;
  }
  return true;
});

const sectionItems = [
  { value: "daily", label: "日常" },
  { value: "club", label: "俱乐部" },
  { value: "activity", label: "活动" },
  { value: "tools", label: "工具" },
  { value: "saltFieldGroup", label: "盐场" },
  { value: "peachGroup", label: "蟠桃园" },
  { value: "rankGroup", label: "排行榜" },
  { value: "fightPvp", label: "切磋" },
];

const saltFieldTabs = [
  { value: "warrank", label: "盐场" },
  { value: "weekBattle", label: "本周战绩" },
  { value: "monthBattle", label: "本月战绩" },
  { value: "legionWarMap", label: "盐场地图" },
  { value: "legionWarStatistics", label: "盐场战况" },
];
const peachTabs = [
  { value: "peach", label: "蟠桃园信息" },
  { value: "peachBattle", label: "蟠桃园战绩" },
];
const rankTabs = [
  { value: "serverrank", label: "区服榜" },
  { value: "toprank", label: "巅峰榜" },
  { value: "topclubrank", label: "俱乐部榜" },
  { value: "goldclubrank", label: "黄金积分榜" },
  { value: "greatRouteRank", label: "伟大航路积分榜" },
];
const styleOptions = [
  { value: "style1", label: "样式一" },
  { value: "style2", label: "样式二" },
];
</script>

<style scoped lang="scss">
.game-status-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  padding: 0;

  // 在大屏幕上限制最大列数以确保卡片有足够宽度
  @media (min-width: 1400px) {
    grid-template-columns: repeat(3, 1fr);
    max-width: 1400px;
    margin: 0 auto;
  }

  // 在中等屏幕上确保有足够空间
  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  // 在较小屏幕上使用单列布局
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
    padding: var(--spacing-sm);
    gap: var(--spacing-md);
  }
}

.full-grid {
  grid-template-columns: repeat(1, 1fr);
}

.game-status-container.full-page-mode {
  max-width: 100% !important;
  grid-template-columns: 1fr;
  padding: var(--spacing-sm);

  @media (min-width: 1400px) {
    max-width: 100% !important;
  }
}

.game-status-container.club-mode {
  grid-template-columns: minmax(0, 1fr);
  max-width: 100% !important;
}

.section-tabs {
  display: flex;
  min-width: 0;
  margin: 0 0 4px;
  grid-column: 1 / -1;
  border-bottom: 1px solid var(--border-light);
  overflow-x: auto;
  scrollbar-width: none;
}

.section-tabs::-webkit-scrollbar {
  display: none;
}

.section-tabs button {
  position: relative;
  min-width: max-content;
  height: 40px;
  padding: 0 14px;
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 500;
}

.section-tabs button:hover {
  color: var(--foreground);
}

.section-tabs button.active {
  color: var(--foreground);
  font-weight: 600;
}

.section-tabs button.active::after {
  position: absolute;
  inset: auto 12px -1px;
  height: 2px;
  background: var(--foreground);
  content: "";
}

.warrank-full-container {
  grid-column: 1 / -1;
  width: 100%;
  height: calc(100vh - 200px);
  min-height: 600px;
  overflow: hidden;

  @media (max-width: 768px) {
    height: calc(100vh - 180px);
    min-height: 500px;
  }
}

.style-switch-bar {
  display: flex;
  justify-content: center;
  padding: 0 8px 8px;
  background: var(--bg-primary);
}

.sub-tabs {
  display: flex;
  justify-content: center;
  min-width: 0;
  padding: 8px;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-light);
  scrollbar-width: none;
}

.sub-tabs::-webkit-scrollbar {
  display: none;
}

.sub-tabs button,
.segmented-control button {
  min-width: max-content;
  height: 32px;
  padding: 0 12px;
  border: 1px solid transparent;
  color: var(--muted-foreground);
  font-size: 13px;
}

.sub-tabs button:hover,
.segmented-control button:hover {
  color: var(--foreground);
  background: var(--accent);
}

.sub-tabs button.active {
  color: var(--foreground);
  border-bottom-color: var(--foreground);
}

.segmented-control {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--border-light);
  background: var(--muted);
}

.segmented-control button.active {
  border-color: var(--border-light);
  background: var(--background);
  color: var(--foreground);
}

.warrank-full-container.style2-container {
  position: relative;
  z-index: 1;
  height: calc(100vh - 180px);
  min-height: 700px;

  @media (max-width: 768px) {
    height: calc(100vh - 180px);
    min-height: 500px;
  }
}

.salt-field-group,
.peach-group,
.rank-group {
  grid-column: 1 / -1;
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>
