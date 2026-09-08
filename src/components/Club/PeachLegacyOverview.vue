<template>
  <div ref="root" class="peach-info-card">
    <div class="toolbar">
      <div class="left">
        <span class="title">查询日期:</span>
        <a-date-picker
          format="YYYY/MM/DD"
          value-format="YYYY/MM/DD"
          :default-value="queryDate"
          :disabled-date="disabledDate"
          :value="queryDate"
          @change="emit('selectDate', $event)"
        ></a-date-picker>
      </div>
      <div class="right">
        <NButton
          class="action-btn export-btn"
          size="small"
          :disabled="!members.length"
          @click="emit('export', root)"
        >
          <template #icon><NIcon><Copy></Copy></NIcon></template>
          导出图片
        </NButton>
        <NButton
          class="refresh-btn"
          size="small"
          :disabled="loading"
          @click="emit('refresh')"
        >
          <template #icon><NIcon><Refresh></Refresh></NIcon></template>
          刷新
        </NButton>
      </div>
    </div>

    <h2 v-if="battleInfo" class="main-title">{{ queryDate }} 蟠桃大会对战</h2>
    <div v-if="battleInfo" class="header-section">
      <div class="club-vs-container">
        <div class="club-info own">
          <NAvatar
            round
            class="club-logo"
            :size="80"
            :src="battleInfo.ownClub?.logo || '/icons/xiaoyugan.png'"
          ></NAvatar>
          <div class="club-details">
            <div class="club-name">
              {{ battleInfo.ownClub.serverId }}服 {{ battleInfo.ownClub?.name || "未知" }}
            </div>
            <div class="club-stats">ID: {{ battleInfo.ownClub.id }}</div>
            <div class="club-stats">
              {{ battleInfo.ownClub.memberCount }}人 |
              {{ battleInfo.ownClub.quenchNum }}红 |
              {{ formatPower(battleInfo.ownClub.power) }}
            </div>
            <div class="club-stats announcement">{{ battleInfo.ownClub.announcement }}</div>
          </div>
        </div>

        <div class="vs-badge"><span class="vs-text">VS</span></div>

        <div class="club-info opponent">
          <NAvatar
            round
            class="club-logo"
            :size="80"
            :src="battleInfo.opponentClub?.logo || '/icons/xiaoyugan.png'"
          ></NAvatar>
          <div class="club-details">
            <div class="club-name">
              {{ battleInfo.opponentClub.serverId }}服 {{ battleInfo.opponentClub?.name || "未知" }}
            </div>
            <div class="club-stats">ID: {{ battleInfo.opponentClub.id }}</div>
            <div class="club-stats">
              {{ battleInfo.opponentClub.memberCount }}人 |
              {{ battleInfo.opponentClub.quenchNum }}红 |
              {{ formatPower(battleInfo.opponentClub.power) }}
            </div>
            <div class="club-stats announcement">{{ battleInfo.opponentClub.announcement }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <NSpin size="large">
        <template #description>正在加载敌方数据...</template>
      </NSpin>
    </div>
    <div v-else-if="members.length" class="members-table">
      <div class="table-title">敌方信息</div>
      <NDataTable
        flex-height
        striped
        size="small"
        :bordered="false"
        :columns="columns"
        :data="members"
        :scroll-x="720"
      ></NDataTable>
    </div>
    <div v-else class="empty-state">
      <NEmpty description="暂无敌方数据"></NEmpty>
    </div>
  </div>
</template>

<script setup>
import { Copy, Refresh } from "@vicons/ionicons5";
import { NAvatar, NButton, NDataTable, NEmpty, NIcon, NSpin } from "naive-ui";
import { ref } from "vue";

defineProps({
  battleInfo: { type: Object, default: null },
  columns: { type: Array, default: () => [] },
  disabledDate: { type: Function, required: true },
  loading: { type: Boolean, default: false },
  members: { type: Array, default: () => [] },
  queryDate: { type: String, required: true },
});

const emit = defineEmits(["export", "refresh", "selectDate"]);
const root = ref(null);

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
.peach-info-card {
  display: flex;
  height: 100%;
  min-height: 400px;
  box-sizing: border-box;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
  border-radius: 8px;
  background: #fff;
}

.toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 8px;

  .left,
  .right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title {
    color: #666;
    font-size: 14px;
  }
}

.main-title {
  margin: 0 0 16px;
  color: #333;
  font-size: 20px;
  font-weight: bold;
  text-align: center;
}

.header-section {
  flex-shrink: 0;
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid #ffccc7;
  border-radius: 12px;
  background: linear-gradient(to bottom, #fff5f5, #fff);
  text-align: center;
}

.club-vs-container {
  display: grid;
  width: 100%;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
  margin-bottom: 10px;
}

.club-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  &.own { justify-self: end; }
  &.opponent { justify-self: start; }
}

.club-logo {
  border: 4px solid #fff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.1);
    border-color: #1890ff;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }
}

.club-details { text-align: center; }

.club-name {
  color: #333;
  font-size: 18px;
  font-weight: bold;
}

.club-stats {
  color: #ff4d4f;
  font-size: 14px;

  &.announcement {
    max-width: 300px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

.vs-badge {
  color: #ff7875;
  font-size: 32px;
  font-style: italic;
  font-weight: 900;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.loading-state,
.empty-state {
  display: flex;
  height: 300px;
  align-items: center;
  justify-content: center;
}

.members-table {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  margin-top: 20px;
}

.table-title {
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 4px solid #1890ff;
  color: #333;
  font-size: 16px;
  font-weight: bold;
}

:deep(.n-data-table) { height: 100%; }
:deep(.n-data-table .n-data-table-th) { background-color: #fafafa; font-weight: bold; }

:deep(.member-avatar-cell) {
  display: block;
  width: 32px;
  height: 32px;
  margin: 0 auto;
  border: 2px solid #eee;
  border-radius: 50% !important;
  object-fit: cover;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.2);
    border-color: #1890ff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

:deep(.member-avatar-placeholder-cell) {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border: 2px solid #eee;
  border-radius: 50% !important;
  background: linear-gradient(135deg, #1890ff 0%, #69c0ff 100%);
  color: white;
  font-size: 14px;
  font-weight: bold;
}

@media (max-width: 600px) {
  .peach-info-card {
    padding: 12px;
  }

  .toolbar {
    align-items: flex-start;
    gap: 8px;
    padding: 0;
  }

  .toolbar .left,
  .toolbar .right {
    flex-wrap: wrap;
  }

  .header-section {
    padding: 10px 6px;
  }

  .club-vs-container {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 6px;
  }

  .club-info {
    min-width: 0;
  }

  .club-logo {
    width: 54px !important;
    height: 54px !important;
  }

  .club-name {
    font-size: 14px;
    overflow-wrap: anywhere;
  }

  .club-stats {
    font-size: 12px;
  }

  .vs-badge {
    font-size: 24px;
  }

  .members-table {
    max-width: 100%;
  }
}
</style>
