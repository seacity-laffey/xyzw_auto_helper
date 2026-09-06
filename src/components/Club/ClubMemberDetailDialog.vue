<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-h-[85vh] max-w-[800px] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>成员信息</DialogTitle>
        <DialogDescription v-if="player">角色 ID: {{ player.id }}</DialogDescription>
      </DialogHeader>
      <div v-if="player" class="player-info-content">
        <div class="player-info-main">
          <img alt="成员头像" class="player-avatar" :src="player.headImg || '/icons/xiaoyugan.png'">
          <div class="player-info-detail">
            <h3>
              {{ player.name }}
              <Badge v-if="player.legacy > 0" :style="legacyStyle">{{ legacyLabel }}</Badge>
            </h3>
            <div class="detail-row"><span>战力: <strong>{{ formatClubNumber(player.power) }}</strong></span><span>服务器: {{ player.serverName }}</span></div>
            <div class="detail-row"><span>俱乐部: {{ player.legionName }}</span></div>
            <div class="detail-row"><span>总红数: <strong>{{ player.totalRedCount }}</strong></span><span>总开孔: <strong>{{ player.totalHoleCount }}</strong></span><span>四圣: <strong>{{ player.holyBeast }}</strong></span></div>
          </div>
        </div>
        <section class="hero-section">
          <div class="section-heading"><h4>武将阵容</h4><Badge variant="outline">{{ player.heroList?.length || 0 }} 名</Badge></div>
          <div v-if="player.heroList?.length" class="hero-list">
            <button v-for="(hero, index) in player.heroList" :key="hero.heroId || index" class="hero-item" type="button" @click="$emit('selectHero', hero)">
              <img alt="武将头像" class="hero-avatar" :src="hero.heroAvate || '/icons/xiaoyugan.png'">
              <div class="hero-info">
                <strong>{{ hero.heroName }}</strong>
                <div>
                  <span>战力 {{ formatClubNumber(hero.power) }}</span><span>星级 {{ hero.star || 0 }}</span><span>红数 {{ hero.red || 0 }}</span><span>开孔 {{ hero.hole || 0 }}</span>
                  <span :class="hero.HolyBeast ? 'opened' : 'closed'">{{ hero.HolyBeast ? "已开四圣" : "未开四圣" }}</span>
                  <span v-if="hero.HolyBeast">四圣等级 {{ hero.HBlevel || 0 }}</span>
                </div>
              </div>
              <ChevronRight :size="16"></ChevronRight>
            </button>
          </div>
          <div v-else class="empty-heroes"><UsersRound :size="22"></UsersRound><span>未查询到武将信息</span></div>
        </section>
      </div>
      <DialogFooter><Button variant="outline" @click="$emit('update:open', false)">关闭</Button></DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { computed } from "vue";
import { ChevronRight, UsersRound } from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatClubNumber } from "@/utils/clubInfoData";

const props = defineProps({
  legacyColors: { type: Object, default: () => ({}) },
  open: { type: Boolean, default: false },
  player: { type: Object, default: null },
});
defineEmits(["selectHero", "update:open"]);

const legacy = computed(() => props.legacyColors[props.player?.legacy] || {});
const legacyLabel = computed(() => legacy.value.name || "未知");
const legacyStyle = computed(() => ({
  backgroundColor: legacy.value.value,
  color: "#fff",
}));
</script>

<style scoped>
.player-info-content { min-width: 0; }
.player-info-main { display: flex; align-items: center; gap: 16px; padding: var(--spacing-md); border: 1px solid var(--border-color); border-radius: var(--radius); }
.player-avatar { width: 56px; height: 56px; flex: 0 0 56px; border: 1px solid var(--border-color); border-radius: 50%; object-fit: cover; }
.player-info-detail { min-width: 0; }
.player-info-detail h3 { display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing-xs); margin: 0 0 8px; color: var(--text-primary); font-size: var(--font-size-lg); }
.detail-row { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 4px; color: var(--text-secondary); font-size: var(--font-size-sm); }
.detail-row strong { color: var(--text-primary); }
.hero-section { margin-top: var(--spacing-md); }
.section-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-sm); }
.section-heading h4 { margin: 0; }
.hero-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.hero-item { display: flex; width: 100%; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--bg-primary); color: var(--text-primary); font: inherit; text-align: left; cursor: pointer; }
.hero-item:hover { border-color: var(--text-tertiary); background: var(--bg-secondary); }
.hero-avatar { width: 40px; height: 40px; flex: 0 0 40px; border: 1px solid var(--border-color); border-radius: 50%; object-fit: cover; }
.hero-info { display: grid; min-width: 0; flex: 1; gap: 4px; }
.hero-info > div { display: flex; flex-wrap: wrap; gap: 6px; color: var(--text-secondary); font-size: var(--font-size-xs); }
.hero-info > div span { padding: 1px 5px; border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--bg-secondary); }
.hero-info > div span.opened { border-color: var(--success-color); background: color-mix(in srgb, var(--success-color) 10%, transparent); color: var(--success-color); }
.hero-info > div span.closed { border-color: var(--warning-color); background: color-mix(in srgb, var(--warning-color) 10%, transparent); color: var(--warning-color); }
.empty-heroes { display: grid; min-height: 120px; place-items: center; align-content: center; gap: var(--spacing-xs); padding: var(--spacing-lg); border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--bg-secondary); color: var(--text-secondary); font-size: var(--font-size-sm); }

@media (max-width: 560px) {
  .player-info-main { align-items: flex-start; }
  .hero-list { grid-template-columns: 1fr; }
}
</style>
