<template>
  <div class="overview">
    <section class="club-profile">
      <img alt="俱乐部头像" class="club-avatar" :src="club.logo || '/icons/xiaoyugan.png'">
      <div class="club-profile-copy">
        <strong>{{ club.name }}</strong>
        <div class="club-meta">
          <Badge variant="outline">ID: {{ club.id }}</Badge>
          <Badge variant="outline">服务器: {{ club.serverId - 27 }}</Badge>
          <Badge variant="outline">成员: {{ memberCount }}</Badge>
        </div>
      </div>
      <Button
        size="sm"
        :disabled="signedIn"
        :variant="signedIn ? 'outline' : 'default'"
        @click="$emit('signIn')"
      >
        <ShieldCheck :size="14"></ShieldCheck>
        {{ signedIn ? "已签到" : "俱乐部签到" }}
      </Button>
    </section>

    <dl class="club-metrics">
      <div><dt><ChartNoAxesCombined :size="15"></ChartNoAxesCombined>战力</dt><dd>{{ formatClubNumber(overview.power) }}</dd></div>
      <div><dt><Flame :size="15"></Flame>红粹</dt><dd>{{ overview.redQuench }}</dd></div>
      <div><dt><Skull :size="15"></Skull>当前 Boss ID</dt><dd>{{ overview.currentBossId }}</dd></div>
      <div><dt><HeartPulse :size="15"></HeartPulse>Boss 剩余血量</dt><dd>{{ overview.currentHP }}</dd></div>
    </dl>

    <details v-if="overview.unfoughtBosses?.length" class="boss-summary">
      <summary>
        <span><Skull :size="16"></Skull>Boss 击杀情况</span>
        <span>已击杀 {{ 150 - overview.unfoughtBosses.length }}/150，遗漏 {{ overview.unfoughtBosses.length }}</span>
      </summary>
      <div class="boss-list">
        <Badge v-for="boss in overview.unfoughtBosses" :key="boss" variant="destructive">{{ boss }}</Badge>
      </div>
    </details>

    <section v-if="club.announcement" class="club-detail-section">
      <header><Megaphone :size="16"></Megaphone><strong>公告</strong></header>
      <p>{{ club.announcement }}</p>
    </section>

    <section v-if="leader" class="club-detail-section">
      <header><UserRound :size="16"></UserRound><strong>会长</strong></header>
      <div class="leader-row">
        <img alt="会长头像" :src="leader.headImg || '/icons/xiaoyugan.png'">
        <div><strong>{{ leader.name }}</strong><span>ID: {{ leader.roleId }}</span></div>
      </div>
    </section>
  </div>
</template>

<script setup>
import {
  ChartNoAxesCombined,
  Flame,
  HeartPulse,
  Megaphone,
  ShieldCheck,
  Skull,
  UserRound,
} from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatClubNumber } from "@/utils/clubInfoData";

defineProps({
  club: { type: Object, required: true },
  leader: { type: Object, default: null },
  memberCount: { type: Number, default: 0 },
  overview: { type: Object, required: true },
  signedIn: { type: Boolean, default: false },
});
defineEmits(["signIn"]);
</script>

<style scoped>
.overview { display: grid; gap: var(--spacing-md); }
.club-profile, .club-detail-section, .boss-summary { border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--bg-primary); }
.club-profile { display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-md); }
.club-avatar { width: 52px; height: 52px; flex: 0 0 52px; border: 1px solid var(--border-color); border-radius: var(--radius); object-fit: cover; }
.club-profile-copy { min-width: 0; flex: 1; }
.club-profile-copy > strong { display: block; overflow: hidden; color: var(--text-primary); font-size: var(--font-size-lg); text-overflow: ellipsis; white-space: nowrap; }
.club-meta { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); margin-top: var(--spacing-xs); }
.club-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--spacing-sm); margin: 0; }
.club-metrics > div { min-width: 0; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--bg-primary); }
.club-metrics dt { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: var(--font-size-xs); }
.club-metrics dd { overflow: hidden; margin: 5px 0 0; color: var(--text-primary); font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }
.boss-summary { padding: var(--spacing-sm) var(--spacing-md); border-color: color-mix(in srgb, var(--warning-color) 38%, var(--border-color)); }
.boss-summary summary { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); color: var(--text-secondary); font-size: var(--font-size-xs); cursor: pointer; }
.boss-summary summary > span:first-child { display: inline-flex; align-items: center; gap: 6px; color: var(--text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); }
.boss-list { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); padding-top: var(--spacing-sm); }
.club-detail-section { padding: var(--spacing-md); }
.club-detail-section header { display: flex; align-items: center; gap: 6px; margin-bottom: var(--spacing-sm); color: var(--text-primary); font-size: var(--font-size-sm); }
.club-detail-section p { margin: 0; color: var(--text-secondary); font-size: var(--font-size-sm); line-height: 1.65; white-space: pre-wrap; }
.leader-row { display: flex; align-items: center; gap: var(--spacing-sm); }
.leader-row img { width: 38px; height: 38px; border: 1px solid var(--border-color); border-radius: 50%; object-fit: cover; }
.leader-row div { display: grid; gap: 2px; }
.leader-row span { color: var(--text-tertiary); font-size: var(--font-size-xs); }

@media (max-width: 768px) {
  .club-profile { display: grid; grid-template-columns: 52px minmax(0, 1fr); }
  .club-profile > button { width: 100%; grid-column: 1 / -1; }
  .club-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .boss-summary summary { align-items: flex-start; flex-direction: column; }
}
</style>
