<template>
  <div ref="tableContent" class="table-content">
    <div v-if="loading" class="loading-state">
      <NSpin size="large">
        <template #description>正在加载俱乐部数据...</template>
      </NSpin>
    </div>

    <div v-else-if="hasData" class="table-container">
      <div class="table-header">
        <div class="table-cell rank">排名</div>
        <div class="table-cell alliance">联盟</div>
        <div class="table-cell server">服务器</div>
        <div class="table-cell avatar">头像</div>
        <div class="table-cell name">名称</div>
        <div class="table-cell red-quench">红淬</div>
        <div v-if="showScore && scoreBeforeHeroes" class="table-cell score">
          {{ scoreLabel }}
        </div>
        <div class="table-cell first-3">前三车头</div>
        <div class="table-cell power">战力</div>
        <div v-if="showScore && !scoreBeforeHeroes" class="table-cell score">
          {{ scoreLabel }}
        </div>
        <div class="table-cell level">等级</div>
        <div class="table-cell announcement">公告</div>
      </div>

      <div
        v-for="(member, index) in rows"
        :key="member.id"
        class="table-row"
        :class="getClubAllianceClass(allianceincludes(member.announcement))"
      >
        <div class="table-cell rank">
          <div class="rank-container">
            <span
              v-if="getMedal(member, index)"
              class="rank-medal"
              :class="getMedal(member, index)"
            ></span>
            <span v-else class="rank-number">{{
              getPosition(member, index)
            }}</span>
          </div>
        </div>
        <div class="table-cell alliance">
          <span class="alliance-tag">
            {{ allianceincludes(member.announcement) || "未知联盟" }}
          </span>
        </div>
        <div class="table-cell server">{{ member.serverId || 0 }}</div>
        <div class="table-cell avatar">
          <img
            v-if="member.logo"
            class="member-avatar"
            :alt="member.name"
            :src="member.logo"
            @error="handleImageError"
          >
          <div v-else class="member-avatar-placeholder">
            {{ member.name?.charAt(0) || "?" }}
          </div>
        </div>
        <div class="table-cell name">{{ member.name }}</div>
        <div class="table-cell red-quench">{{ member.redQuench || 0 }}</div>
        <div v-if="showScore && scoreBeforeHeroes" class="table-cell score">
          {{ formatScore(getScore(member)) || 0 }}
        </div>
        <div class="table-cell first-3">
          <div class="hero-avatars">
            <div
              v-for="(hero, heroIndex) in member.topHeroes"
              :key="hero.id || heroIndex"
              class="hero-card"
            >
              <button
                class="hero-avatar-container"
                type="button"
                :aria-label="`查看${hero.name || '未知'}详情`"
                @click="emit('selectHero', hero)"
              >
                <img
                  v-if="hero.headImg"
                  class="hero-avatar"
                  :alt="hero.name"
                  :src="hero.headImg"
                >
                <span v-else class="hero-avatar-placeholder">
                  {{ hero.name?.charAt(0) || "?" }}
                </span>
              </button>
              <div class="hero-info">
                <div class="hero-name">{{ hero.name || "未知" }}</div>
                <div class="hero-stats">
                  <span class="hero-power">{{ formatPower(hero.power) }}</span>
                  <span
                    class="hero-redquench"
                    :class="getClubRedQuenchClass(hero.redQuench)"
                  >{{ hero.redQuench }}红</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="table-cell power">{{ formatPower(member.power) || 0 }}</div>
        <div v-if="showScore && !scoreBeforeHeroes" class="table-cell score">
          {{ formatScore(getScore(member)) || 0 }}
        </div>
        <div class="table-cell level">
          <span>{{ member.level || 30 }}</span>
        </div>
        <div class="table-cell announcement">
          {{ member.announcement || "" }}
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <NEmpty description="暂无俱乐部数据" size="large">
        <template #icon>
          <NIcon><DocumentText></DocumentText></NIcon>
        </template>
      </NEmpty>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { NEmpty, NIcon, NSpin } from "naive-ui";
import { DocumentText } from "@vicons/ionicons5";
import { allianceincludes } from "@/utils/goldWarrankUtils";
import {
  getClubAllianceClass,
  getClubRankMedal,
  getClubRankPosition,
  getClubRedQuenchClass,
} from "@/utils/clubRankingView";

const props = defineProps({
  formatPower: { type: Function, required: true },
  formatScore: { type: Function, required: true },
  hasData: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  rankKey: { type: String, default: "" },
  rows: { type: Array, default: () => [] },
  scoreBeforeHeroes: { type: Boolean, default: false },
  scoreKey: { type: String, default: "score" },
  scoreLabel: { type: String, default: "黄金积分" },
  showScore: { type: Boolean, default: true },
  startRank: { type: Number, default: 1 },
});

const emit = defineEmits(["selectHero"]);
const tableContent = ref(null);

const getPosition = (member, index) => {
  const rowRank = props.rankKey ? Number(member[props.rankKey]) : Number.NaN;
  return Number.isFinite(rowRank)
    ? rowRank
    : getClubRankPosition(props.startRank, index);
};
const getMedal = (member, index) =>
  getClubRankMedal(getPosition(member, index));
const getScore = (member) => member[props.scoreKey];
const getExportElement = () => tableContent.value;

const handleImageError = (event) => {
  event.target.style.display = "none";
};

defineExpose({ getExportElement });
</script>

<style scoped lang="scss">
.table-content {
  display: flex;
  height: calc(100% - 200px);
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
}

.loading-state,
.empty-state {
  display: flex;
  height: 100%;
  flex: 1;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
}

.loading-state :deep(.n-spin),
.empty-state :deep(.n-empty) {
  font-size: var(--font-size-sm);
}

.table-container {
  height: 100%;
  flex: 1;
  overflow: auto;
  background: var(--bg-primary);
}

.table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  border-radius: var(--border-radius-sm);
  background: var(--bg-secondary);
}

.table-container::-webkit-scrollbar-thumb {
  border-radius: var(--border-radius-sm);
  background: var(--border-medium);
}

.table-header,
.table-row {
  display: flex;
  padding: var(--spacing-xs) var(--spacing-sm);
}

.table-header {
  position: sticky;
  z-index: 100;
  top: 0;
  border-bottom: 2px solid var(--border-medium);
  background: linear-gradient(
    180deg,
    var(--bg-secondary) 0%,
    var(--bg-primary) 100%
  );
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.table-header .table-cell {
  justify-content: center;
}

.table-row {
  align-items: center;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-primary);
  transition: all var(--transition-fast);
}

.table-row:hover {
  transform: translateX(2px);
  background: var(--bg-secondary);
  box-shadow: inset 3px 0 0 var(--primary-color);
}

.table-row:last-child {
  border-bottom: 0;
}

.alliance-large .alliance-tag {
  background: var(--primary-color);
}
.alliance-dream .alliance-tag {
  background: var(--success-color);
}
.alliance-xin-justice .alliance-tag {
  background: var(--info-color);
}
.alliance-dragon .alliance-tag {
  background: var(--error-color);
}
.alliance-xi .alliance-tag {
  background: #9c27b0;
}
.alliance-unknown .alliance-tag {
  background: var(--warning-color);
}
.alliance-other .alliance-tag {
  background: var(--text-secondary);
}

.table-cell {
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-xs);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.table-cell.rank {
  width: 90px;
  min-width: 90px;
  justify-content: center;
  padding: 4px 8px;
  font-weight: var(--font-weight-bold);
}

.rank-container {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
}

.rank-medal {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  margin: 0 6px;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  color: white;
  font-size: var(--font-size-base);
  font-weight: bold;
}

.rank-medal.gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
}
.rank-medal.gold::before {
  content: "1";
}
.rank-medal.silver {
  background: linear-gradient(135deg, #c0c0c0 0%, #a9a9a9 100%);
}
.rank-medal.silver::before {
  content: "2";
}
.rank-medal.bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #b87333 100%);
}
.rank-medal.bronze::before {
  content: "3";
}

.rank-number {
  margin: 0 6px;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.table-cell.alliance {
  width: 80px;
  min-width: 80px;
}

.alliance-tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: var(--border-radius-full);
  color: white;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.table-cell.server {
  width: 80px;
  min-width: 80px;
  justify-content: center;
  color: var(--text-secondary);
  text-align: center;
}

.table-cell.avatar {
  width: 50px;
  min-width: 50px;
  justify-content: center;
}

.member-avatar,
.member-avatar-placeholder {
  width: 32px;
  height: 32px;
  border: 2px solid var(--border-light);
  border-radius: 50%;
}

.member-avatar {
  object-fit: cover;
  transition: all var(--transition-fast);
}

.member-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    var(--primary-color) 0%,
    var(--primary-color-light) 100%
  );
  color: white;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
}

.table-cell.name {
  width: 120px;
  min-width: 120px;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.table-cell.red-quench,
.table-cell.score {
  width: 80px;
  min-width: 80px;
  justify-content: center;
  text-align: center;
  font-weight: var(--font-weight-bold);
}

.table-cell.red-quench::before {
  width: 12px;
  height: 12px;
  margin-right: 4px;
  border-radius: 50%;
  background: var(--error-color);
  content: "";
}

.table-cell.score {
  color: var(--warning-color);
  font-size: var(--font-size-base);
}

.table-cell.first-3 {
  width: 350px;
  min-width: 405px;
}

.hero-avatars {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--spacing-xs);
  overflow: hidden;
  padding: var(--spacing-xs) 0;
}

.hero-card {
  display: flex;
  min-width: 120px;
  max-width: 130px;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--spacing-xs) / 2);
  padding: calc(var(--spacing-xs) / 2);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-sm);
  background: var(--bg-secondary);
  transition: all var(--transition-fast);
}

.hero-card:hover {
  transform: translateY(-2px);
  border-color: var(--primary-color);
  background: var(--bg-primary);
  box-shadow: var(--shadow-medium);
}

.hero-avatar-container {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.hero-avatar {
  width: 50px;
  height: 50px;
  border: 2px solid var(--border-light);
  border-radius: 50%;
  object-fit: cover;
  transition: all var(--transition-fast);
}

.hero-avatar-placeholder {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--border-light);
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    var(--primary-color) 0%,
    var(--primary-color-light) 100%
  );
  color: white;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.hero-info {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hero-name {
  width: 100%;
  overflow: hidden;
  color: var(--text-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
}

.hero-power {
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}

.hero-redquench {
  padding: 1px 6px;
  border-radius: var(--border-radius-full);
  font-weight: var(--font-weight-bold);
}

.redquench-high {
  color: var(--error-color);
  background: rgba(var(--error-color-rgb), 0.1);
}
.redquench-medium {
  color: var(--warning-color);
  background: rgba(var(--warning-color-rgb), 0.1);
}
.redquench-low {
  color: var(--success-color);
  background: rgba(var(--success-color-rgb), 0.1);
}

.table-cell.power {
  width: 100px;
  min-width: 100px;
  justify-content: center;
  color: var(--primary-color);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  text-align: center;
}

.table-cell.level {
  width: 70px;
  min-width: 70px;
  justify-content: center;
}

.table-cell.level::before {
  margin-right: 2px;
  color: var(--text-secondary);
  content: "Lv.";
  font-size: var(--font-size-xs);
}

.table-cell.level span {
  padding: 2px 8px;
  border-radius: var(--border-radius-full);
  background: linear-gradient(
    135deg,
    var(--primary-color-light) 0%,
    var(--primary-color) 100%
  );
  color: white;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.table-cell.announcement {
  min-width: 150px;
  min-height: 24px;
  flex: 1;
  overflow: visible;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  line-height: 1.4;
  overflow-wrap: anywhere;
  white-space: normal;
}

@media (max-width: 1200px) {
  .table-cell.rank {
    width: 50px;
    min-width: 50px;
  }
  .table-cell.alliance {
    width: 100px;
    min-width: 100px;
  }
  .table-cell.name {
    width: 120px;
    min-width: 120px;
  }
  .table-cell.first-3 {
    width: 350px;
    min-width: 350px;
  }
  .hero-card {
    min-width: 80px;
  }
  .hero-avatar,
  .hero-avatar-placeholder {
    width: 40px;
    height: 40px;
  }
  .table-cell.level,
  .table-cell.server {
    width: 70px;
    min-width: 70px;
  }
}
</style>
