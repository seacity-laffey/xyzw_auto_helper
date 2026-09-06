<template>
  <div v-if="variant === 'default'" class="monthly-report">
    <section class="monthly-overview">
      <div class="overview-heading">
        <h2>本月统计概览</h2>
        <div class="overview-meta">
          <span>统计日期：{{ month }}</span>
          <span>总参战成员：<strong>{{ stats.totalMembers }}</strong></span>
        </div>
      </div>
      <dl class="metric-grid">
        <div><dt>总击杀</dt><dd>{{ stats.totalKills }}</dd></div>
        <div><dt>总死亡</dt><dd>{{ stats.totalDeaths }}</dd></div>
        <div><dt>总 K/D</dt><dd>{{ stats.totalKD }}</dd></div>
        <div><dt>总复活丹</dt><dd>{{ stats.totalResurrection }}</dd></div>
      </dl>
    </section>

    <section class="member-records">
      <h2>成员战绩详情</h2>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="rank-column">排名</th>
              <th class="member-column">成员</th>
              <th v-for="date in battleDates" :key="date" class="date-column">
                <strong>{{ formatClubBattleShortDate(date) }}</strong>
                <small>{{ date }}</small>
              </th>
              <th class="date-column">本月总计</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(member, index) in members" :key="member.roleId">
              <td class="rank-column"><strong>{{ index + 1 }}</strong></td>
              <td class="member-column">
                <div class="member-cell">
                  <img v-if="member.headImg" alt="" :src="member.headImg" @error="hideBrokenImage">
                  <span v-else class="avatar-placeholder">{{ member.name?.charAt(0) || "?" }}</span>
                  <span>{{ member.name }}</span>
                </div>
              </td>
              <td v-for="date in battleDates" :key="date" class="date-column">
                <dl class="daily-stats">
                  <div><dt>击杀</dt><dd>{{ dailyStat(member, date, "winCnt") }}</dd></div>
                  <div><dt>死亡</dt><dd>{{ dailyStat(member, date, "loseCnt") }}</dd></div>
                  <div><dt>K/D</dt><dd>{{ dailyKd(member, date) }}</dd></div>
                  <div><dt>复活丹</dt><dd>{{ dailyRevives(member, date) }}</dd></div>
                </dl>
              </td>
              <td class="date-column total-column">
                <dl class="daily-stats">
                  <div><dt>击杀</dt><dd>{{ member.totalWinCnt }}</dd></div>
                  <div><dt>死亡</dt><dd>{{ member.totalLoseCnt }}</dd></div>
                  <div><dt>K/D</dt><dd>{{ memberKd(member) }}</dd></div>
                  <div><dt>复活丹</dt><dd>{{ member.totalResurrection }}</dd></div>
                </dl>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <ClubBattleRecordsReport
    v-else
    period-label="月"
    :club-name="clubName"
    :date="month"
    :records="reportRecords"
    :stats="stats"
    :variant="variant"
  ></ClubBattleRecordsReport>
</template>

<script setup>
import ClubBattleRecordsReport from "@/components/Club/ClubBattleRecordsReport.vue";
import {
  formatClubBattleShortDate,
  getClubMonthDailyStat,
} from "@/utils/clubMonthBattleRecordData";

defineProps({
  battleDates: { type: Array, default: () => [] },
  clubName: { type: String, default: "" },
  members: { type: Array, default: () => [] },
  month: { type: String, required: true },
  reportRecords: { type: Array, default: () => [] },
  stats: { type: Object, required: true },
  variant: { type: String, default: "default" },
});

const dailyStat = (member, date, field) => getClubMonthDailyStat(member, date, field);
const dailyKd = (member, date) => {
  const deaths = dailyStat(member, date, "loseCnt");
  return deaths ? (dailyStat(member, date, "winCnt") / deaths).toFixed(2) : "0.00";
};
const dailyRevives = (member, date) => Math.max(dailyStat(member, date, "loseCnt") - 6, 0);
const memberKd = (member) => member.totalLoseCnt
  ? (member.totalWinCnt / member.totalLoseCnt).toFixed(2)
  : "0.00";
const hideBrokenImage = (event) => {
  event.currentTarget.style.display = "none";
};
</script>

<style scoped>
.monthly-report { display: grid; width: 100%; min-width: 0; box-sizing: border-box; gap: 16px; color: var(--foreground); }
.monthly-overview, .member-records { min-width: 0; box-sizing: border-box; border: 1px solid var(--border); background: var(--background); }
.monthly-overview { padding: 16px; }
.overview-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.overview-heading h2, .member-records h2 { margin: 0; font-size: 16px; letter-spacing: 0; }
.overview-meta { display: flex; flex-wrap: wrap; gap: 8px 20px; color: var(--muted-foreground); font-size: 13px; }
.overview-meta strong { color: var(--foreground); }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0; }
.metric-grid > div { min-width: 0; min-height: 64px; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--border); background: var(--muted); }
.metric-grid dt { color: var(--muted-foreground); font-size: 12px; }
.metric-grid dd { margin: 5px 0 0; font-size: 18px; font-weight: 700; }
.member-records h2 { padding: 12px 16px; border-bottom: 1px solid var(--border); }
.table-scroll { max-width: 100%; overflow-x: auto; }
table { width: max-content; min-width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: center; vertical-align: middle; }
th { height: 42px; background: var(--muted); font-weight: 600; }
th small { display: block; margin-top: 2px; color: var(--muted-foreground); font-weight: 400; }
tbody tr:hover { background: var(--accent); }
.rank-column { width: 56px; min-width: 56px; }
.member-column { width: 150px; min-width: 150px; text-align: left; }
.date-column { width: 116px; min-width: 116px; }
.total-column { background: var(--muted); }
.member-cell { display: flex; align-items: center; gap: 8px; min-width: 0; }
.member-cell img, .avatar-placeholder { width: 28px; height: 28px; flex: 0 0 28px; border-radius: 50%; object-fit: cover; }
.avatar-placeholder { display: inline-flex; align-items: center; justify-content: center; background: var(--muted); color: var(--muted-foreground); font-size: 12px; }
.member-cell > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.daily-stats { display: grid; gap: 2px; margin: 0; }
.daily-stats div { display: flex; justify-content: space-between; gap: 8px; }
.daily-stats dt { color: var(--muted-foreground); }
.daily-stats dd { margin: 0; font-variant-numeric: tabular-nums; font-weight: 600; }

@media (max-width: 768px) {
  .monthly-overview { padding: 12px; }
  .overview-heading { align-items: flex-start; flex-direction: column; }
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  table { font-size: 12px; }
  .rank-column { width: 44px; min-width: 44px; }
  .member-column { width: 104px; min-width: 104px; }
  .date-column { width: 110px; min-width: 110px; }
}
</style>
