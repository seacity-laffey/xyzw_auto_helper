<template>
  <section class="club-panel" :class="[`variant-${variant}`, `side-${side}`]">
    <header class="panel-heading">
      <div>
        <span class="side-label">{{ sideLabel }}</span>
        <h3>{{ club.name }}</h3>
      </div>
      <span class="member-count">{{ club.memberCount }} 人</span>
    </header>

    <dl class="metric-grid">
      <div><dt>总击杀</dt><dd>{{ club.totalKills }}</dd></div>
      <div><dt>总复活</dt><dd>{{ club.totalRevives }}</dd></div>
      <div><dt>总 K/D</dt><dd>{{ club.totalKD }}</dd></div>
      <div><dt>人均击杀</dt><dd>{{ club.averageKills }}</dd></div>
    </dl>

    <div class="ranking-grid">
      <section v-for="ranking in rankings" :key="ranking.key" class="ranking-panel">
        <h4>{{ ranking.label }}</h4>
        <ol>
          <li v-for="(player, index) in ranking.rows.slice(0, 3)" :key="playerKey(player, index)">
            <span class="rank-number">{{ index + 1 }}</span>
            <span class="rank-player">
              <img
                v-if="player.roleInfo.headImg"
                alt=""
                :src="player.roleInfo.headImg"
                @error="hideBrokenImage"
              >
              <span v-else class="avatar-placeholder">{{ playerName(player).charAt(0) }}</span>
              <span>{{ playerName(player) }}</span>
            </span>
            <strong>{{ ranking.value(player) }}</strong>
          </li>
        </ol>
      </section>
    </div>

    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>排名</th>
            <th class="member-column">成员</th>
            <th>击杀</th>
            <th>连杀</th>
            <th>抢船</th>
            <th>复活</th>
            <th>K/D</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(player, index) in club.godRank" :key="playerKey(player, index)">
            <td><strong>{{ index + 1 }}</strong></td>
            <td class="member-column">
              <div class="member-cell">
                <img
                  v-if="player.roleInfo.headImg"
                  alt=""
                  :src="player.roleInfo.headImg"
                  @error="hideBrokenImage"
                >
                <span v-else class="avatar-placeholder">{{ playerName(player).charAt(0) }}</span>
                <span>{{ playerName(player) }}</span>
              </div>
            </td>
            <td>
              <div class="bar-value">
                <strong>{{ player.killCnt }}</strong>
                <i :style="killBar(player.killCnt)"></i>
              </div>
            </td>
            <td>{{ player.mCKCnt }}</td>
            <td>{{ player.carCnt }}</td>
            <td>{{ player.reviveCnt }}</td>
            <td>{{ player.kd }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { getPeachBattlePercent } from "@/utils/peachBattleRecordData";

const props = defineProps({
  club: { type: Object, required: true },
  side: { type: String, required: true },
  variant: { type: String, default: "default" },
});

const sideLabel = computed(() => props.side === "own" ? "我方战绩" : "敌方战绩");
const rankings = computed(() => [
  { key: "kill", label: "击杀 Top 3", rows: props.club.killRank, value: (player) => player.killCnt },
  { key: "kd", label: "K/D Top 3", rows: props.club.kdRank, value: (player) => player.kd },
  { key: "revive", label: "复活 Top 3", rows: props.club.reviveRank, value: (player) => player.reviveCnt },
  { key: "streak", label: "连杀 Top 3", rows: props.club.killStreakRank, value: (player) => player.mCKCnt },
]);
const playerName = (player) => player?.roleInfo?.name || "未知成员";
const playerKey = (player, index) => player?.roleInfo?.roleId || player?.roleId || index;
const killBar = (value) => ({
  width: `${getPeachBattlePercent(value, props.club.maxKills)}%`,
});
const hideBrokenImage = (event) => {
  event.currentTarget.style.display = "none";
};
</script>

<style scoped>
.club-panel { min-width: 0; border: 1px solid var(--border); background: var(--background); }
.panel-heading { display: flex; min-height: 58px; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--border); }
.panel-heading > div { min-width: 0; }
.panel-heading h3 { overflow: hidden; margin: 2px 0 0; font-size: 16px; letter-spacing: 0; text-overflow: ellipsis; white-space: nowrap; }
.side-label { color: var(--muted-foreground); font-size: 12px; }
.member-count { flex: 0 0 auto; padding: 3px 7px; border: 1px solid var(--border); color: var(--muted-foreground); font-size: 12px; }
.side-own .panel-heading { border-left: 3px solid #16a34a; }
.side-opponent .panel-heading { border-left: 3px solid #e8798f; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0; padding: 12px; }
.metric-grid > div { min-width: 0; min-height: 58px; padding: 9px 10px; border: 1px solid var(--border); background: var(--muted); }
.metric-grid dt { color: var(--muted-foreground); font-size: 11px; }
.metric-grid dd { margin: 4px 0 0; font-size: 17px; font-weight: 700; }
.ranking-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 0 12px 12px; }
.ranking-panel { min-width: 0; border: 1px solid var(--border); }
.ranking-panel h4 { margin: 0; padding: 7px 9px; border-bottom: 1px solid var(--border); background: var(--muted); font-size: 12px; letter-spacing: 0; }
.ranking-panel ol { margin: 0; padding: 0; list-style: none; }
.ranking-panel li { display: grid; min-height: 32px; grid-template-columns: 20px minmax(0, 1fr) auto; align-items: center; gap: 6px; padding: 4px 8px; border-bottom: 1px solid var(--border); }
.ranking-panel li:last-child { border-bottom: 0; }
.rank-number { display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; border: 1px solid var(--border); color: var(--muted-foreground); font-size: 10px; }
.rank-player, .member-cell { display: flex; min-width: 0; align-items: center; gap: 7px; }
.rank-player img, .member-cell img, .avatar-placeholder { width: 24px; height: 24px; flex: 0 0 24px; border-radius: 50%; object-fit: cover; }
.avatar-placeholder { display: inline-flex; align-items: center; justify-content: center; background: var(--muted); color: var(--muted-foreground); font-size: 11px; }
.rank-player > span:last-child, .member-cell > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.table-scroll { max-width: 100%; overflow-x: auto; border-top: 1px solid var(--border); }
table { width: 100%; min-width: 610px; border-collapse: collapse; font-size: 12px; }
th, td { height: 36px; padding: 0 8px; border-bottom: 1px solid var(--border); text-align: center; }
th { background: var(--muted); font-weight: 600; }
tbody tr:hover { background: var(--accent); }
.member-column { min-width: 138px; text-align: left; }
.bar-value { display: grid; grid-template-columns: 24px minmax(42px, 1fr); align-items: center; gap: 6px; }
.bar-value i { display: block; height: 4px; background: #16a34a; }
.side-opponent .bar-value i { background: #e8798f; }
.variant-style2 .ranking-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }

@media (max-width: 900px) {
  .variant-style2 .ranking-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ranking-grid, .variant-style2 .ranking-grid { grid-template-columns: 1fr; }
}
</style>
