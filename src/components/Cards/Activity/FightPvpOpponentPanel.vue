<template>
  <div class="opponent-layout">
    <section class="opponent-panel profile-panel">
      <header><h4>对手信息</h4></header>
      <div class="profile-heading">
        <img :alt="member.name" :src="member.headImg || '/icons/xiaoyugan.png'">
        <div>
          <strong>{{ member.name }}</strong>
          <Badge v-if="member.legacy > 0" :style="legacyStyle">{{ legacyLabel }}</Badge>
          <span>{{ member.serverName }}</span>
        </div>
      </div>
      <dl class="opponent-details">
        <div><dt>战力</dt><dd>{{ member.power }}</dd></div>
        <div><dt>玩具</dt><dd>{{ member.lordWeaponId }}</dd></div>
        <div><dt>阵容</dt><dd><span class="red-count">{{ member.red }} 红</span> / <span class="hole-count">{{ member.hole }} 孔</span></dd></div>
        <div><dt>俱乐部</dt><dd>{{ member.legionName }}</dd></div>
        <div><dt>俱乐部战力</dt><dd>{{ member.MaxPower }}</dd></div>
        <div><dt>当前红数</dt><dd>{{ member.legionRed }}</dd></div>
      </dl>
    </section>

    <section class="opponent-panel lineup-panel">
      <header>
        <h4>对手阵容</h4>
        <span>{{ member.heroList?.length || 0 }} 名武将</span>
      </header>
      <div class="hero-list">
        <button
          v-for="hero in member.heroList || []"
          :key="hero.heroId || hero.heroName"
          class="hero-row"
          type="button"
          @click="$emit('selectHero', hero)"
        >
          <img v-if="hero.heroAvate" :alt="hero.heroName" :src="hero.heroAvate">
          <span v-else class="hero-placeholder">{{ hero.heroName?.substring(0, 2) || "?" }}</span>
          <span class="hero-copy">
            <strong>{{ hero.heroName || "未知武将" }}</strong>
            <small>战力 {{ hero.power || "0" }} · 星级 {{ hero.star || "0" }} · {{ hero.red || "0" }} 红</small>
          </span>
          <Badge :variant="hero.HolyBeast ? 'default' : 'secondary'">
            {{ hero.HolyBeast ? `四圣 ${hero.HBlevel || 0}` : "未开四圣" }}
          </Badge>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Badge } from "@/components/ui/badge";

const props = defineProps({
  legacyColors: { type: Object, default: () => ({}) },
  member: { type: Object, required: true },
});
defineEmits(["selectHero"]);

const legacy = computed(() => props.legacyColors[props.member.legacy] || {});
const legacyLabel = computed(() => legacy.value.name || "未知");
const legacyStyle = computed(() => ({
  backgroundColor: legacy.value.value,
  color: "#fff",
}));
</script>

<style scoped>
.opponent-layout { display: grid; grid-template-columns: minmax(270px, 320px) minmax(0, 1fr); gap: 16px; }
.opponent-panel { min-width: 0; border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--bg-primary); }
.opponent-panel > header { display: flex; min-height: 42px; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--border-color); }
.opponent-panel h4 { margin: 0; color: var(--text-primary); font-size: var(--font-size-sm); }
.opponent-panel header > span { color: var(--text-tertiary); font-size: var(--font-size-xs); }
.profile-heading { display: flex; align-items: center; gap: 12px; padding: 14px 12px; }
.profile-heading > img, .hero-row > img, .hero-placeholder { width: 44px; height: 44px; flex: 0 0 44px; border: 1px solid var(--border-color); border-radius: 50%; object-fit: cover; }
.profile-heading > div { display: flex; min-width: 0; flex: 1; align-items: center; flex-wrap: wrap; gap: 6px; }
.profile-heading strong { overflow: hidden; color: var(--text-primary); font-size: var(--font-size-base); text-overflow: ellipsis; white-space: nowrap; }
.profile-heading div > span { width: 100%; color: var(--text-secondary); font-size: var(--font-size-xs); }
.opponent-details { margin: 0; border-top: 1px solid var(--border-color); }
.opponent-details > div { display: grid; grid-template-columns: 92px minmax(0, 1fr); min-height: 34px; align-items: center; border-bottom: 1px solid var(--border-color); }
.opponent-details > div:last-child { border-bottom: 0; }
.opponent-details dt, .opponent-details dd { margin: 0; padding: 7px 10px; font-size: var(--font-size-xs); }
.opponent-details dt { color: var(--text-secondary); text-align: right; }
.opponent-details dd { overflow: hidden; border-left: 1px solid var(--border-color); color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; }
.red-count { color: var(--error-color); }
.hole-count { color: var(--success-color); }
.hero-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
.hero-row { display: flex; min-width: 0; min-height: 74px; align-items: center; gap: 10px; padding: 10px 12px; border: 0; border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); background: transparent; color: var(--text-primary); font: inherit; text-align: left; cursor: pointer; }
.hero-row:hover { background: var(--bg-secondary); }
.hero-placeholder { display: grid; place-items: center; background: var(--bg-tertiary); color: var(--text-secondary); font-size: var(--font-size-xs); }
.hero-copy { display: grid; min-width: 0; flex: 1; gap: 3px; }
.hero-copy strong, .hero-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hero-copy strong { font-size: var(--font-size-sm); }
.hero-copy small { color: var(--text-secondary); font-size: var(--font-size-xs); }

@media (max-width: 900px) {
  .opponent-layout { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .hero-list { grid-template-columns: 1fr; }
  .hero-row { border-right: 0; }
}
</style>
