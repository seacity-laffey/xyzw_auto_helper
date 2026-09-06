<template>
  <div class="records-list" :class="variant === 'style2' ? 'style-2' : 'style-1'">
    <template v-if="variant === 'style1'">
      <header class="report-heading">
        <h2>{{ date }} {{ displayClubName }}盐场{{ periodLabel }}报</h2>
      </header>

      <div class="compact-layout">
        <div class="table-scroll">
          <table class="records-table compact-table">
            <thead>
              <tr>
                <th>排名</th>
                <th class="name-column">成员</th>
                <th>击杀</th>
                <th>死亡</th>
                <th>攻城</th>
                <th>复活丹</th>
                <th>K/D</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(player, index) in records" :key="player.roleId">
                <td><strong>{{ index + 1 }}</strong></td>
                <td class="name-column">
                  <div class="player-cell">
                    <img v-if="player.headImg" alt="" :src="player.headImg" @error="hideBrokenImage">
                    <span v-else class="avatar-placeholder">{{ player.name?.charAt(0) || "?" }}</span>
                    <span>{{ player.name }}</span>
                  </div>
                </td>
                <td :style="heatStyle('kill', player.winCnt)">{{ player.winCnt || 0 }}</td>
                <td :style="heatStyle('death', player.loseCnt)">{{ player.loseCnt || 0 }}</td>
                <td :style="heatStyle('building', player.buildingCnt)">{{ player.buildingCnt || 0 }}</td>
                <td :style="heatStyle('revive', reviveCount(player))">{{ reviveCount(player) }}</td>
                <td>{{ formatKd(player) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <aside class="summary-column">
          <section class="summary-panel">
            <h3>总体统计</h3>
            <dl>
              <div><dt>总人数</dt><dd>{{ records.length }}</dd></div>
              <div><dt>总击杀</dt><dd>{{ stats.totalKills }}</dd></div>
              <div><dt>总死亡</dt><dd>{{ stats.totalDeaths }}</dd></div>
              <div><dt>总复活丹</dt><dd>{{ stats.totalRevives }}</dd></div>
              <div><dt>总 K/D</dt><dd>{{ stats.totalKD }}</dd></div>
            </dl>
          </section>

          <section v-for="ranking in compactRankings" :key="ranking.key" class="summary-panel">
            <h3>{{ ranking.label }}</h3>
            <ol class="ranking-list">
              <li v-for="(player, index) in ranking.rows" :key="`${ranking.key}-${player.roleId}`">
                <span class="rank-number">{{ index + 1 }}</span>
                <span class="rank-player">
                  <img v-if="player.headImg" alt="" :src="player.headImg" @error="hideBrokenImage">
                  <span v-else class="avatar-placeholder small">{{ player.name?.charAt(0) || "?" }}</span>
                  <span>{{ player.name }}</span>
                </span>
                <strong>{{ ranking.value(player) }}</strong>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </template>

    <template v-else>
      <header class="report-heading detailed-heading">
        <div>
          <h2>{{ displayClubName }}盐场{{ periodLabel }}报</h2>
          <p>{{ date }}</p>
        </div>
        <div v-if="stats.mvpPlayer" class="mvp-player">
          <img v-if="stats.mvpPlayer.headImg" alt="" :src="stats.mvpPlayer.headImg" @error="hideBrokenImage">
          <span v-else class="avatar-placeholder large">{{ stats.mvpPlayer.name?.charAt(0) || "?" }}</span>
          <span><small>本{{ periodLabel }} MVP</small><strong>{{ stats.mvpPlayer.name }}</strong></span>
        </div>
      </header>

      <dl class="metric-grid">
        <div v-for="metric in metrics" :key="metric.label">
          <dt>{{ metric.label }}</dt>
          <dd>{{ metric.value }}</dd>
        </div>
      </dl>

      <div class="ranking-grid">
        <section v-for="ranking in detailedRankings" :key="ranking.key" class="ranking-panel">
          <h3>{{ ranking.label }}</h3>
          <ol class="ranking-list">
            <li v-for="(player, index) in ranking.rows" :key="`${ranking.key}-${player.roleId}`">
              <span class="rank-number">{{ index + 1 }}</span>
              <span class="rank-player">
                <img v-if="player.headImg" alt="" :src="player.headImg" @error="hideBrokenImage">
                <span v-else class="avatar-placeholder small">{{ player.name?.charAt(0) || "?" }}</span>
                <span>{{ player.name }}</span>
              </span>
              <strong>{{ ranking.value(player) }}</strong>
            </li>
          </ol>
        </section>
      </div>

      <div class="table-scroll detailed-table-wrap">
        <table class="records-table detailed-table">
          <thead>
            <tr>
              <th>排名</th>
              <th class="name-column">成员</th>
              <th>击杀</th>
              <th>死亡</th>
              <th>攻城</th>
              <th>复活丹</th>
              <th>K/D</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(player, index) in records" :key="player.roleId">
              <td><strong>{{ index + 1 }}</strong></td>
              <td class="name-column">
                <div class="player-cell">
                  <img v-if="player.headImg" alt="" :src="player.headImg" @error="hideBrokenImage">
                  <span v-else class="avatar-placeholder">{{ player.name?.charAt(0) || "?" }}</span>
                  <span>{{ player.name }}</span>
                </div>
              </td>
              <td><div class="bar-value"><strong>{{ player.winCnt || 0 }}</strong><i :style="barStyle(player.winCnt, stats.maxKills, 'kill')"></i></div></td>
              <td><div class="bar-value"><strong>{{ player.loseCnt || 0 }}</strong><i :style="barStyle(player.loseCnt, stats.maxDeaths, 'death')"></i></div></td>
              <td><div class="bar-value"><strong>{{ player.buildingCnt || 0 }}</strong><i :style="barStyle(player.buildingCnt, stats.maxOccupies, 'building')"></i></div></td>
              <td>{{ reviveCount(player) }}</td>
              <td>{{ formatKd(player) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";
import {
  getBattleRecordHeatColor,
  getBattleRecordPercent,
  getClubBattleReviveCount,
} from "@/utils/clubBattleRecordData";

const props = defineProps({
  clubName: { type: String, default: "" },
  date: { type: String, required: true },
  periodLabel: { type: String, default: "周" },
  records: { type: Array, default: () => [] },
  stats: { type: Object, required: true },
  variant: { type: String, default: "style1" },
});

const displayClubName = computed(() => props.clubName || "俱乐部");
const reviveCount = (player) => getClubBattleReviveCount(player);
const formatKd = (player) => {
  const deaths = Number(player?.loseCnt || 0);
  return deaths ? (Number(player?.winCnt || 0) / deaths).toFixed(2) : "0.00";
};
const hideBrokenImage = (event) => {
  event.currentTarget.style.display = "none";
};
const heatStyle = (metric, value) => ({
  backgroundColor: getBattleRecordHeatColor(metric, value),
});
const barColors = {
  building: "#d97706",
  death: "#737373",
  kill: "#16a34a",
};
const barStyle = (value, maximum, metric) => ({
  backgroundColor: barColors[metric],
  width: `${getBattleRecordPercent(value, maximum)}%`,
});

const compactRankings = computed(() => [
  { key: "kill", label: "击杀前 3", rows: props.stats.killRank, value: (player) => player.winCnt || 0 },
  { key: "building", label: "攻城前 3", rows: props.stats.occupyRank, value: (player) => player.buildingCnt || 0 },
  { key: "kd", label: "K/D 前 3", rows: props.stats.kdRank, value: (player) => player.kd },
  { key: "revive", label: "复活丹前 3", rows: props.stats.reviveRank, value: (player) => player.reviveCnt },
]);
const detailedRankings = computed(() => [
  ...compactRankings.value.slice(0, 3),
  { key: "death", label: "死亡前 3", rows: props.stats.deathRank, value: (player) => player.loseCnt || 0 },
  compactRankings.value[3],
  { key: "survival", label: "生存前 3", rows: props.stats.survivalRank, value: (player) => player.survivalCnt || 0 },
]);
const metrics = computed(() => [
  { label: "总 K/D", value: props.stats.totalKD },
  { label: "总胜率", value: `${props.stats.totalWinRate}%` },
  { label: "参战人数", value: props.records.length },
  { label: "总复活丹", value: props.stats.totalRevives },
  { label: "总击杀", value: props.stats.totalKills },
  { label: "总死亡", value: props.stats.totalDeaths },
  { label: "总攻城", value: props.stats.totalBuilding },
  { label: "人均击杀", value: props.stats.avgKills },
]);
</script>

<style scoped>
.records-list { width: 100%; min-width: 0; box-sizing: border-box; color: var(--foreground); }
.style-1, .style-2 { padding: 16px; background: var(--background); }
.report-heading { margin-bottom: 16px; padding: 12px 16px; border-bottom: 2px solid var(--foreground); }
.report-heading h2 { margin: 0; font-size: 18px; letter-spacing: 0; text-align: center; }
.detailed-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid var(--border); }
.detailed-heading h2 { text-align: left; }
.detailed-heading p { margin: 4px 0 0; color: var(--muted-foreground); font-size: 13px; }
.compact-layout { display: grid; grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr); gap: 16px; align-items: start; }
.table-scroll { min-width: 0; overflow-x: auto; }
.records-table { width: 100%; min-width: 680px; border-collapse: collapse; font-size: 13px; }
.records-table th { height: 36px; padding: 0 10px; border-bottom: 1px solid var(--border); background: var(--muted); font-weight: 600; text-align: center; }
.records-table td { height: 42px; padding: 0 10px; border-bottom: 1px solid var(--border); text-align: center; }
.records-table tbody tr:hover { background: var(--accent); }
.records-table .name-column { min-width: 160px; text-align: left; }
.player-cell, .rank-player, .mvp-player { display: flex; align-items: center; gap: 8px; min-width: 0; }
.player-cell img, .rank-player img, .mvp-player img, .avatar-placeholder { width: 28px; height: 28px; flex: 0 0 28px; border-radius: 50%; object-fit: cover; }
.avatar-placeholder { display: inline-flex; align-items: center; justify-content: center; background: var(--muted); color: var(--muted-foreground); font-size: 12px; }
.avatar-placeholder.small, .rank-player img { width: 22px; height: 22px; flex-basis: 22px; }
.avatar-placeholder.large, .mvp-player img { width: 40px; height: 40px; flex-basis: 40px; }
.summary-column { display: grid; gap: 12px; }
.summary-panel, .ranking-panel { border: 1px solid var(--border); background: var(--background); }
.summary-panel h3, .ranking-panel h3 { margin: 0; padding: 8px 12px; border-bottom: 1px solid var(--border); background: var(--muted); font-size: 13px; letter-spacing: 0; }
.summary-panel dl { margin: 0; }
.summary-panel dl div { display: flex; justify-content: space-between; padding: 7px 12px; border-bottom: 1px solid var(--border); }
.summary-panel dl div:last-child { border-bottom: 0; }
.summary-panel dt { color: var(--muted-foreground); }
.summary-panel dd { margin: 0; font-weight: 600; }
.ranking-list { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.ranking-list li { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 6px; min-height: 34px; padding: 5px 10px; border-bottom: 1px solid var(--border); }
.ranking-list li:last-child { border-bottom: 0; }
.rank-number { display: inline-flex; width: 20px; height: 20px; align-items: center; justify-content: center; border: 1px solid var(--border); color: var(--muted-foreground); font-size: 11px; }
.rank-player > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mvp-player { padding-left: 16px; border-left: 1px solid var(--border); }
.mvp-player > span:last-child { display: grid; }
.mvp-player small { color: var(--muted-foreground); }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0 0 16px; }
.metric-grid > div { min-height: 64px; padding: 10px 12px; border: 1px solid var(--border); }
.metric-grid dt { color: var(--muted-foreground); font-size: 12px; }
.metric-grid dd { margin: 5px 0 0; font-size: 18px; font-weight: 700; }
.ranking-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 16px; }
.detailed-table-wrap { border: 1px solid var(--border); }
.bar-value { display: grid; grid-template-columns: 28px minmax(60px, 1fr); align-items: center; gap: 8px; }
.bar-value i { display: block; height: 5px; max-width: 100%; }

@media (max-width: 900px) {
  .compact-layout { grid-template-columns: 1fr; }
  .summary-column { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ranking-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .style-1, .style-2 { padding: 10px; }
  .detailed-heading { align-items: flex-start; flex-direction: column; }
  .mvp-player { width: 100%; padding: 8px 0 0; border-top: 1px solid var(--border); border-left: 0; }
  .summary-column, .metric-grid, .ranking-grid { grid-template-columns: 1fr; }
}
</style>
