<template>
  <div class="table-content">
    <div v-if="loading" class="loading-state">
      <NSpin size="large">
        <template #description>{{ loadingLabel }}</template>
      </NSpin>
    </div>

    <div v-else-if="hasData" class="table-container">
      <div ref="exportContainer" class="export-container">
        <div class="table-header">
          <div class="table-cell rank">排名</div>
          <div class="table-cell server">服务器</div>
          <div class="table-cell avatar">头像</div>
          <div class="table-cell role-id">玩家ID</div>
          <div class="table-cell name">玩家名称</div>
          <div class="table-cell power">战力</div>
          <div class="table-cell score">{{ scoreLabel }}</div>
        </div>

        <div v-for="member in rows" :key="member.roleId" class="table-row">
          <div class="table-cell rank">
            <div class="rank-container">
              <span
                v-if="getClubRankMedal(Number(member.rank))"
                class="rank-medal"
                :class="getClubRankMedal(Number(member.rank))"
              ></span>
              <span v-else class="rank-number">{{ member.rank }}</span>
            </div>
          </div>
          <div class="table-cell server">{{ member.serverId }}</div>
          <div class="table-cell avatar">
            <img
              v-if="member.headImg"
              class="member-avatar"
              :alt="member.name"
              :src="member.headImg"
              @error="handleImageError"
            >
            <div v-else class="member-avatar-placeholder">
              {{ member.name?.charAt(0) || "?" }}
            </div>
          </div>
          <div class="table-cell role-id">
            <button type="button" @click="emit('selectPlayer', member.roleId)">
              {{ member.roleId }}
            </button>
          </div>
          <div class="table-cell name">
            <span>{{ member.name }}</span>
            <NTag
              v-if="member.legacy > 0"
              size="small"
              :style="{
                color: '#fff',
                backgroundColor: legacycolor[member.legacy]?.value,
              }"
            >
              {{ legacycolor[member.legacy]?.name || "未知" }}
            </NTag>
          </div>
          <div class="table-cell power">{{ member.power }}</div>
          <div class="table-cell score">{{ member.score }}</div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <NEmpty size="large" :description="emptyLabel"></NEmpty>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { NEmpty, NSpin, NTag } from "naive-ui";
import { getClubRankMedal } from "@/utils/clubRankingView";
import { legacycolor } from "@/utils/heroList";

defineProps({
  emptyLabel: { type: String, default: "暂无榜单数据" },
  hasData: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  loadingLabel: { type: String, default: "正在加载榜单数据..." },
  rows: { type: Array, default: () => [] },
  scoreLabel: { type: String, required: true },
});

const emit = defineEmits(["selectPlayer"]);
const exportContainer = ref(null);

const handleImageError = (event) => {
  event.target.style.display = "none";
};

const getExportElement = () => exportContainer.value;

defineExpose({ getExportElement });
</script>

<style scoped lang="scss">
.table-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
}

.loading-state,
.empty-state {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
}

.table-container {
  flex: 1;
  overflow: auto;
  background: var(--bg-primary);
}

.table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.table-container::-webkit-scrollbar-thumb {
  border-radius: var(--border-radius-sm);
  background: var(--border-medium);
}

.export-container {
  min-width: 900px;
  background: var(--bg-primary);
}

.table-header,
.table-row {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
}

.table-header {
  position: sticky;
  z-index: 10;
  top: 0;
  border-bottom: 2px solid var(--border-medium);
  background: linear-gradient(180deg, var(--bg-secondary), var(--bg-primary));
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  font-weight: var(--font-weight-bold);
}

.table-row {
  min-height: 62px;
  border-bottom: 1px solid var(--border-light);
  transition: background var(--transition-fast);
}

.table-row:hover {
  background: var(--bg-secondary);
}

.table-cell {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  padding: 0 var(--spacing-sm);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.table-cell.rank {
  width: 72px;
  flex: 0 0 72px;
}
.table-cell.server {
  width: 90px;
  flex: 0 0 90px;
}
.table-cell.avatar {
  width: 70px;
  flex: 0 0 70px;
}
.table-cell.role-id {
  width: 150px;
  flex: 0 0 150px;
}
.table-cell.name {
  width: 220px;
  flex: 1 0 220px;
  gap: var(--spacing-xs);
}
.table-cell.power {
  width: 140px;
  flex: 0 0 140px;
  font-weight: var(--font-weight-bold);
}
.table-cell.score {
  width: 120px;
  flex: 0 0 120px;
  color: var(--warning-color);
  font-weight: var(--font-weight-bold);
}

.rank-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.rank-medal {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  color: white;
  font-weight: bold;
}

.rank-medal.gold {
  background: linear-gradient(135deg, #ffd700, #ffa500);
}
.rank-medal.gold::before {
  content: "1";
}
.rank-medal.silver {
  background: linear-gradient(135deg, #c0c0c0, #a9a9a9);
}
.rank-medal.silver::before {
  content: "2";
}
.rank-medal.bronze {
  background: linear-gradient(135deg, #cd7f32, #b87333);
}
.rank-medal.bronze::before {
  content: "3";
}

.rank-number {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.member-avatar,
.member-avatar-placeholder {
  width: 40px;
  height: 40px;
  border: 2px solid var(--border-light);
  border-radius: 50%;
}

.member-avatar {
  object-fit: cover;
}

.member-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    var(--primary-color),
    var(--primary-color-light)
  );
  color: white;
  font-weight: var(--font-weight-bold);
}

.role-id button {
  padding: 4px;
  border: 0;
  background: transparent;
  color: var(--primary-color);
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}

.role-id button:hover {
  color: var(--primary-color-hover);
}

@media (max-width: 768px) {
  .table-header,
  .table-row {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
}
</style>
