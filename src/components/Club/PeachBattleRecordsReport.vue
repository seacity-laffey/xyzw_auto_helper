<template>
  <article class="peach-report" :class="`variant-${variant}`">
    <header class="match-heading">
      <p>{{ date }} 蟠桃大会对战战绩</p>
      <div class="club-comparison">
        <div class="club-identity own">
          <img v-if="records.ownClub.logo" alt="" :src="records.ownClub.logo" @error="hideBrokenImage">
          <span v-else class="logo-placeholder">我</span>
          <div>
            <h2>{{ records.ownClub.name }}</h2>
            <span>{{ clubMeta(records.ownClub) }}</span>
          </div>
        </div>
        <strong class="versus">VS</strong>
        <div class="club-identity opponent">
          <div>
            <h2>{{ records.opponentClub.name }}</h2>
            <span>{{ clubMeta(records.opponentClub) }}</span>
          </div>
          <img v-if="records.opponentClub.logo" alt="" :src="records.opponentClub.logo" @error="hideBrokenImage">
          <span v-else class="logo-placeholder">敌</span>
        </div>
      </div>
    </header>

    <div class="club-grid">
      <PeachBattleClubPanel
        side="own"
        :club="records.ownClub"
        :variant="variant"
      ></PeachBattleClubPanel>
      <PeachBattleClubPanel
        side="opponent"
        :club="records.opponentClub"
        :variant="variant"
      ></PeachBattleClubPanel>
    </div>
  </article>
</template>

<script setup>
import PeachBattleClubPanel from "@/components/Club/PeachBattleClubPanel.vue";
import { formatPeachBattlePower } from "@/utils/peachBattleRecordData";

defineProps({
  date: { type: String, required: true },
  records: { type: Object, required: true },
  variant: { type: String, default: "default" },
});

const clubMeta = (club) => [
  club.serverId ? `${club.serverId}服` : "",
  `ID ${club.id}`,
  `${club.memberCount}人`,
  `${club.quenchNum}红`,
  formatPeachBattlePower(club.totalPower),
].filter(Boolean).join(" · ");
const hideBrokenImage = (event) => {
  event.currentTarget.style.display = "none";
};
</script>

<style scoped>
.peach-report { display: grid; width: 100%; min-width: 0; box-sizing: border-box; gap: 14px; color: var(--foreground); }
.match-heading { padding: 14px 16px; border: 1px solid var(--border); background: var(--background); }
.match-heading > p { margin: 0 0 12px; color: var(--muted-foreground); font-size: 13px; text-align: center; }
.club-comparison { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 16px; }
.club-identity { display: flex; min-width: 0; align-items: center; gap: 10px; }
.club-identity.opponent { justify-content: flex-end; text-align: right; }
.club-identity img, .logo-placeholder { width: 42px; height: 42px; flex: 0 0 42px; border-radius: 50%; object-fit: cover; }
.logo-placeholder { display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--border); background: var(--muted); color: var(--muted-foreground); font-weight: 700; }
.club-identity div { min-width: 0; }
.club-identity h2 { overflow: hidden; margin: 0; font-size: 18px; letter-spacing: 0; text-overflow: ellipsis; white-space: nowrap; }
.club-identity div > span { display: block; overflow: hidden; margin-top: 3px; color: var(--muted-foreground); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.versus { font-size: 14px; }
.club-grid { display: grid; min-width: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: start; }
.variant-style2 .club-grid { grid-template-columns: 1fr; }
.variant-style1 .match-heading { padding-block: 10px; }

@media (max-width: 1000px) {
  .club-grid { grid-template-columns: 1fr; }
}

@media (max-width: 560px) {
  .match-heading { padding: 12px; }
  .club-comparison { gap: 8px; }
  .club-identity { align-items: flex-start; flex-direction: column; }
  .club-identity.opponent { align-items: flex-end; flex-direction: column-reverse; }
  .club-identity img, .logo-placeholder { width: 34px; height: 34px; flex-basis: 34px; }
  .club-identity h2 { font-size: 15px; }
  .club-identity div > span { max-width: 130px; white-space: normal; }
}
</style>
