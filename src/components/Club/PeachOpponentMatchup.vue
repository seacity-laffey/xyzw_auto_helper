<template>
  <div class="matchup">
    <h2 v-if="battleInfo" class="main-title">{{ queryDate }} 蟠桃大会对战</h2>
    <div v-if="battleInfo" class="header-section">
      <div class="club-vs-container">
        <div class="club-info own">
          <div class="club-details">
            <div class="club-stats club-id-text">ID: {{ battleInfo.ownClub.id }}</div>
            <div class="club-name-row">
              <span class="club-server own-server">{{ battleInfo.ownClub.serverId }}服</span>
              <NAvatar
                round
                class="club-logo-inline"
                :size="36"
                :src="battleInfo.ownClub?.logo || '/icons/xiaoyugan.png'"
              ></NAvatar>
              <span class="club-name own-name">{{ battleInfo.ownClub?.name || "未知" }}</span>
            </div>
            <div class="club-stats club-power-text">
              {{ battleInfo.ownClub.memberCount }}人 |
              {{ battleInfo.ownClub.quenchNum }}红 |
              {{ formatPower(battleInfo.ownClub.power) }}
            </div>
            <div class="club-stats announcement club-announce-text">
              {{ battleInfo.ownClub.announcement }}
            </div>
          </div>
        </div>

        <div class="vs-badge">
          <span class="vs-v">V</span><span class="vs-s">S</span>
        </div>

        <div class="club-info opponent">
          <div class="club-details">
            <div class="club-stats club-id-text">ID: {{ battleInfo.opponentClub.id }}</div>
            <div class="club-name-row">
              <span class="club-server opp-server">{{ battleInfo.opponentClub.serverId }}服</span>
              <NAvatar
                round
                class="club-logo-inline"
                :size="36"
                :src="battleInfo.opponentClub?.logo || '/icons/xiaoyugan.png'"
              ></NAvatar>
              <span class="club-name opp-name">{{ battleInfo.opponentClub?.name || "未知" }}</span>
            </div>
            <div class="club-stats club-power-text">
              {{ battleInfo.opponentClub.memberCount }}人 |
              {{ battleInfo.opponentClub.quenchNum }}红 |
              {{ formatPower(battleInfo.opponentClub.power) }}
            </div>
            <div class="club-stats announcement club-announce-text">
              {{ battleInfo.opponentClub.announcement }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <NSpin size="large">
        <template #description>正在加载敌方数据...</template>
      </NSpin>
    </div>

    <div v-else-if="members.length > 0" class="members-table">
      <div class="table-title">
        敌方信息
        <span v-if="battleInfo" class="enroll-count">
          「 报名：{{ battleInfo.opponentClub.enrolledCount }} / 已加载：{{ members.length }} 」
        </span>
      </div>
      <div v-if="lineupStats.length" class="lineup-stats">
        <span class="lineup-stats-label">阵容统计：</span>
        <NTag
          v-for="item in lineupStats"
          :key="item.name"
          class="lineup-stats-tag"
          size="small"
          :bordered="false"
          :color="item.colorProps"
        >
          {{ item.name }} ({{ item.count }})
        </NTag>
      </div>
      <NDataTable
        flex-height
        striped
        class="members-data-table"
        size="small"
        :bordered="false"
        :columns="columns"
        :data="members"
        :scroll-x="1400"
      ></NDataTable>
    </div>

    <div v-else class="empty-state">
      <NEmpty description="暂无敌方数据"></NEmpty>
    </div>
  </div>
</template>

<script setup>
import { NAvatar, NDataTable, NEmpty, NSpin, NTag } from "naive-ui";

defineProps({
  battleInfo: { type: Object, default: null },
  columns: { type: Array, default: () => [] },
  lineupStats: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  members: { type: Array, default: () => [] },
  queryDate: { type: String, required: true },
});

const formatPower = (power) => {
  if (!power)
    return "0";
  if (power >= 100000000)
    return `${(power / 100000000).toFixed(1)}亿`;
  if (power >= 10000)
    return `${(power / 10000).toFixed(1)}万`;
  return power.toString();
};
</script>

<style scoped lang="scss">
.matchup {
  display: flex;
  min-height: 0;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

:global(.peach-info-card.exporting-image) .matchup {
  height: auto;
  max-width: none;
  overflow: visible;

  .members-table {
    max-width: none;
    overflow: visible;
  }

  :deep(.members-data-table),
  :deep(.members-data-table .n-data-table-wrapper),
  :deep(.members-data-table .n-data-table-base-table),
  :deep(.members-data-table .n-data-table-base-table-header),
  :deep(.members-data-table .n-data-table-base-table-body) {
    max-width: none !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }

  /* 固定表头在导出时会重叠，还原成普通流 */
  :deep(.members-data-table .n-data-table-th) {
    position: static !important;
  }
}

.main-title {
  text-align: center;
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.header-section {
  text-align: center;
  margin-bottom: 20px;
  background: linear-gradient(to bottom, #f0f7ff, #fff);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #d6e8f7;
  flex-shrink: 0;
}

.club-vs-container {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0;
  margin-bottom: 10px;
  width: 100%;
}

.club-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  /* 两侧卡片等高：让内容撑满 grid 格 */
  align-self: stretch;
  justify-content: center;
  width: 100%;
  min-height: 124px;
  box-sizing: border-box;
  overflow: hidden;
}

.club-info.own {
  justify-self: end;
  /* 渐变从外→内（外淡内强），制造向VS冲击的视觉效果 */
  background: linear-gradient(
    to right,
    #d6ecf8 0%,
    #b8d9f5 50%,
    #8ec5ed 80%,
    #72b8e8 100%
  );
  border: 1px solid rgba(42, 127, 184, 0.3);
  border-radius: 20px 0 0 20px;
  padding: 14px 28px 14px 18px;
  box-shadow:
    inset -10px 0 20px rgba(42, 127, 184, 0.22),
    4px 0 14px rgba(42, 127, 184, 0.15);
  position: relative;
}

.club-info.opponent {
  justify-self: start;
  /* 渐变从外→内（外淡内强），制造向VS冲击的视觉效果 */
  background: linear-gradient(
    to left,
    #f8d6d4 0%,
    #f5b8b5 50%,
    #ed8e8c 80%,
    #e8726f 100%
  );
  border: 1px solid rgba(193, 84, 79, 0.3);
  border-radius: 0 20px 20px 0;
  padding: 14px 18px 14px 28px;
  box-shadow:
    inset 10px 0 20px rgba(193, 84, 79, 0.22),
    -4px 0 14px rgba(193, 84, 79, 0.15);
  position: relative;
}

/* 指向VS的小三角指示器 */
.club-info.own::after {
  content: "";
  position: absolute;
  right: -10px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-left: 12px solid rgba(42, 127, 184, 0.45);
  z-index: 5;
}

.club-info.opponent::after {
  content: "";
  position: absolute;
  left: -10px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-right: 12px solid rgba(193, 84, 79, 0.45);
  z-index: 5;
}

.club-logo-inline {
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.club-details {
  text-align: center;
}

.club-name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.club-name {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
  white-space: nowrap;
}

.club-server {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
  white-space: nowrap;
}

.club-stats {
  font-size: 14px;
  color: #5a7a9a;

  &.announcement {
    white-space: pre-wrap;
    word-break: break-all;
    max-width: 300px;
    line-height: 1.5;
  }
}

/* 分色：ID 和人数/战力行 */
.club-id-text {
  color: #7a8b99;
  font-size: 12px;
}

.club-power-text {
  color: #5a7a9a;
}

.club-announce-text {
  color: #8a9aaa;
  font-size: 13px;
}

/* 我方服号和名字：蓝色系 */
.own-server,
.own-name {
  color: #2a7fb8;
}

/* 对手服号和名字：暖橙色系 */
.opp-server,
.opp-name {
  color: #c1544f;
}

.vs-badge {
  /* 居中对齐两侧卡片 */
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 10;
  /* 圆形底盘 */
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    #1a6ba0 0%,
    #2a7fb8 40%,
    #c1544f 60%,
    #a03030 100%
  );
  box-shadow:
    0 0 0 3px #fff,
    0 0 0 5px rgba(42, 127, 184, 0.4),
    0 4px 20px rgba(0, 0, 0, 0.25);
  font-family: "Arial Black", "Impact", "Segoe UI Black", sans-serif;
  font-style: italic;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -2px;
  /* 旋转外圈虚线 */
  flex-shrink: 0;
}

.vs-badge::before {
  content: "";
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px dashed rgba(42, 127, 184, 0.5);
  animation: vs-spin 8s linear infinite;
}

@keyframes vs-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.vs-v {
  color: #e8f4ff;
  font-size: 30px;
  text-shadow:
    0 0 8px rgba(255, 255, 255, 0.6),
    1px 2px 4px rgba(0, 0, 0, 0.4);
  z-index: 1;
}

.vs-s {
  color: #ffe8e8;
  font-size: 30px;
  text-shadow:
    0 0 8px rgba(255, 200, 200, 0.6),
    1px 2px 4px rgba(0, 0, 0, 0.4);
  z-index: 1;
}

.battle-title {
  font-size: 16px;
  color: #666;
  margin-top: 10px;
  font-weight: bold;
}

.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.members-table {
  margin-top: 20px;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  /* Use NDataTable's scroll or auto here */
  display: flex;
  flex-direction: column;
  /* 关键：不让表格的 1400px 内容宽度撑破外层 flex 列，
     否则 toolbar 会被顶出可视区域（导出图片/刷新按钮看不见） */
  min-width: 0;
  max-width: 100%;
}

/* 横向溢出只允许发生在 n-data-table 自己的滚动容器里 */
:deep(.members-data-table) {
  width: 100%;
  min-height: 0;
  flex: 1;
  min-width: 0;
  max-width: 100%;
}

:deep(.members-data-table .n-data-table-wrapper) {
  min-width: 0;
  max-width: 100%;
}

.table-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 4px solid #1890ff;
}

.lineup-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  padding-left: 12px;
}

.enroll-count {
  font-size: 14px;
  font-weight: normal;
  color: #666;
  margin-left: 6px;
}

.lineup-stats-label {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

:deep(.n-data-table) {
  height: 100%;
}

:deep(.n-data-table .n-data-table-th) {
  background-color: #f0f7ff;
  font-weight: bold;
  color: #2a7fb8;
}

:deep(.member-id-cell) {
  font-family: "Consolas", "Monaco", monospace;
  font-size: 14px;
  color: #666;
  user-select: all;
}

:deep(.sim-result) {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2px 4px;
  width: 100%;
  line-height: 1.2;
  font-size: 12px;
}

:deep(.sim-win-rate) {
  color: #2a7fb8;
  font-weight: bold;
  white-space: nowrap;
}

:deep(.sim-full-rate) {
  color: #389e0d;
  font-size: 11px;
  white-space: nowrap;
}

:deep(.sim-lose) {
  color: #c1544f;
  font-weight: bold;
  font-size: 12px;
}

:deep(.sim-timeout) {
  color: #d48806;
  font-size: 12px;
  font-weight: bold;
}

:deep(.sim-sep) {
  display: none;
}

:deep(.lineup-cell-wrap) {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 阵容卡片列：每个武将一张小卡片，卡内上下两行居中对齐 */
:deep(.lineup-card-list) {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 4px;
  padding: 2px 0;
}

:deep(.lineup-hero-card) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  padding: 3px 6px;
  border-radius: 5px;
  background-color: rgba(64, 169, 255, 0.07);
  white-space: nowrap;
}

:deep(.lineup-card-row) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  line-height: 1.35;
  white-space: nowrap;
}

:deep(.lineup-card-row-name) {
  font-size: 12px;
  font-weight: 600;
}

:deep(.lineup-card-row-pearl) {
  font-size: 11px;
}

:deep(.lineup-pearl-empty) {
  color: #d9d9d9;
}

:deep(.lineup-cell) {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 0;
  font-size: 12px;
  white-space: nowrap;
  overflow-wrap: normal;
  vertical-align: top;
}

:deep(.lineup-fish-name) {
  color: #52c41a;
}

:deep(.lineup-pearl-sep) {
  color: #bfbfbf;
}

:deep(.lineup-pearl-skill) {
  color: #faad14;
}

:deep(.n-data-table-td) {
  vertical-align: top;
}

:deep(.n-data-table-td:last-child) {
  vertical-align: top;
}

:deep(.lineup-hero) {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}

:deep(.lineup-hero-name) {
  color: #40a9ff;
}

:deep(.lineup-hero-red) {
  color: #ff4d4f;
}

:deep(.lineup-hero-hb) {
  margin-left: 0;
}

:deep(.lineup-separator) {
  color: #bfbfbf;
  white-space: nowrap;
}

:deep(.toy-name) {
  color: #c084fc;
  font-size: 12px;
  font-weight: 600;
}

:deep(.toy-none) {
  color: #d9d9d9;
  font-size: 12px;
}

/* 宠物列：左图标 + 右「名称 / Lv.N」 */
:deep(.pet-cell) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

:deep(.pet-icon) {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  object-fit: contain;
  background-color: rgba(64, 169, 255, 0.07);
  flex-shrink: 0;
}

:deep(.pet-text) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.25;
  white-space: nowrap;
}

:deep(.pet-name) {
  font-size: 12px;
  font-weight: 600;
}

:deep(.pet-level) {
  font-size: 11px;
  color: #8c8c8c;
}

:deep(.pet-none) {
  color: #d9d9d9;
  font-size: 12px;
}

:deep(.legacy-none) {
  color: #d9d9d9;
  font-size: 12px;
}

/* 四圣等级：填充背景的小标签 */
:deep(.hb-badge) {
  display: inline-block;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #389e0d;
  font-size: 11px;
  font-weight: bold;
  line-height: 1.4;
  padding: 0 4px;
  border-radius: 3px;
  margin-left: 2px;
  white-space: nowrap;
}

:deep(.member-avatar-cell) {
  width: 32px;
  height: 32px;
  border-radius: 50% !important;
  object-fit: cover;
  border: 2px solid #eee;
  transition: all 0.2s;
  display: block;
  margin: 0 auto;

  &:hover {
    transform: scale(1.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-color: #1890ff;
  }
}

:deep(.member-avatar-placeholder-cell) {
  width: 32px;
  height: 32px;
  border-radius: 50% !important;
  background: linear-gradient(135deg, #1890ff 0%, #69c0ff 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  border: 2px solid #eee;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .main-title {
    font-size: 18px;
  }

  .header-section {
    padding: 10px 8px;
  }

  .club-vs-container {
    grid-template-columns: minmax(0, 1fr) 48px minmax(0, 1fr);
  }

  .club-info {
    min-height: 176px;
  }

  .club-info.own {
    padding: 10px 16px 10px 8px;
    border-radius: 16px 0 0 16px;
  }

  .club-info.opponent {
    padding: 10px 8px 10px 16px;
    border-radius: 0 16px 16px 0;
  }

  .club-name-row {
    flex-direction: column;
    gap: 4px;
  }

  .club-logo-inline {
    order: -1;
  }

  .club-name,
  .club-server {
    font-size: 14px;
  }

  .club-stats {
    font-size: 12px;
  }

  .club-stats.announcement {
    max-width: 120px;
  }

  .vs-badge {
    width: 48px;
    height: 48px;
  }

  .vs-v,
  .vs-s {
    font-size: 22px;
  }

  .table-title {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .enroll-count {
    margin-left: 0;
    font-size: 12px;
  }
}
</style>
