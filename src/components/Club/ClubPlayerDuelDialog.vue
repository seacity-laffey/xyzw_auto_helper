<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>对手信息</DialogTitle>
        <DialogDescription>
          {{ player ? `角色 ID：${player.id || "未知"}` : "查看对手阵容并发起切磋" }}
        </DialogDescription>
      </DialogHeader>

      <template v-if="player">
        <div class="player-summary">
          <img
            alt="对手头像"
            class="player-avatar"
            :src="player.headImg || '/icons/xiaoyugan.png'"
          >
          <div class="player-details">
            <div class="player-title">
              <h3>{{ player.name || "未知角色" }}</h3>
              <Badge
                v-if="player.legacy > 0"
                :style="{
                  color: '#fff',
                  backgroundColor: legacycolor[player.legacy]?.value,
                }"
              >
                {{ legacycolor[player.legacy]?.name || "未知" }}
              </Badge>
            </div>
            <div class="summary-badges">
              <Badge variant="outline">{{ player.serverName || "未知区服" }}</Badge>
              <Badge variant="outline">战力 {{ formatPower(player.power) }}</Badge>
              <Badge variant="outline">红淬 {{ player.totalRedCount || 0 }}</Badge>
              <Badge variant="outline">开孔 {{ player.totalHoleCount || 0 }}</Badge>
              <Badge variant="outline">四圣 {{ player.holyBeast || 0 }}</Badge>
            </div>
            <p>俱乐部：{{ player.legionName || "无" }}</p>
          </div>
        </div>

        <div class="duel-controls">
          <label for="club-duel-count">切磋次数</label>
          <Input
            id="club-duel-count"
            class="count-input"
            max="100"
            min="1"
            step="1"
            type="number"
            v-model="countModel"
          ></Input>
          <span :class="{ invalid: !fightCountValid }">
            {{ fightCountValid ? "1 至 100 次" : "请输入 1 至 100 的整数" }}
          </span>
          <Button :disabled="!fightCountValid" @click="emit('duel')">切磋</Button>
        </div>

        <section v-if="fightProgress.visible" class="progress-section">
          <div class="section-heading">
            <h4>切磋进行中</h4>
            <strong>{{ fightProgress.percentage || 0 }}%</strong>
          </div>
          <progress max="100" :value="fightProgress.percentage || 0"></progress>
          <div class="metric-row">
            <span>总计 {{ fightProgress.totalCount || 0 }}</span>
            <span>已完成 {{ fightProgress.completedCount || 0 }}</span>
            <span>剩余 {{ fightProgress.remainingCount || 0 }}</span>
            <span class="win">胜 {{ fightProgress.winCount || 0 }}</span>
            <span class="loss">负 {{ fightProgress.lossCount || 0 }}</span>
          </div>
        </section>

        <section v-if="fightResult.visible" class="result-section">
          <div class="section-heading">
            <h4>切磋结果</h4>
            <Badge variant="outline">{{ rate(fightResult.winCount, fightResult.totalCount) }} 胜率</Badge>
          </div>
          <dl class="result-summary">
            <div><dt>总次数</dt><dd>{{ fightResult.totalCount || 0 }}</dd></div>
            <div><dt>胜</dt><dd class="win">{{ fightResult.winCount || 0 }}</dd></div>
            <div><dt>负</dt><dd class="loss">{{ fightResult.lossCount || 0 }}</dd></div>
            <div><dt>我方掉将率</dt><dd>{{ rate(dieStats.ourDieHeroGameCount, fightResult.totalCount) }}</dd></div>
            <div><dt>敌方掉将率</dt><dd>{{ rate(dieStats.enemyDieHeroGameCount, fightResult.totalCount) }}</dd></div>
          </dl>

          <div class="battle-list">
            <article
              v-for="(battle, index) in fightResult.resultCount || []"
              :key="index"
              class="battle-row"
              :class="battle.isWin ? 'win-row' : 'loss-row'"
            >
              <div class="battle-heading">
                <strong>第 {{ index + 1 }} 场</strong>
                <Badge :variant="battle.isWin ? 'default' : 'destructive'">
                  {{ battle.isWin ? "胜利" : "失败" }}
                </Badge>
              </div>
              <div class="battle-sides">
                <div class="battle-side">
                  <img alt="我方头像" :src="battle.leftheadImg || '/icons/xiaoyugan.png'">
                  <div>
                    <strong>{{ battle.leftName || "未知" }}</strong>
                    <span>战力 {{ battle.leftpower || 0 }}</span>
                    <span>掉将 {{ battle.leftDieHero || 0 }}</span>
                  </div>
                </div>
                <b>VS</b>
                <div class="battle-side">
                  <img alt="敌方头像" :src="battle.rightheadImg || '/icons/xiaoyugan.png'">
                  <div>
                    <strong>{{ battle.rightName || "未知" }}</strong>
                    <span>战力 {{ battle.rightpower || 0 }}</span>
                    <span>掉将 {{ battle.rightDieHero || 0 }}</span>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div class="result-actions">
            <Button @click="emit('resetResult')">重新切磋</Button>
            <Button variant="outline" @click="emit('closeResult')">关闭结果</Button>
          </div>
        </section>

        <section class="lineup-section">
          <div class="section-heading">
            <h4>武将阵容</h4>
            <Badge variant="outline">{{ player.heroList?.length || 0 }} 名</Badge>
          </div>
          <div v-if="player.heroList?.length" class="hero-list">
            <button
              v-for="(hero, index) in player.heroList"
              :key="hero.heroId || index"
              class="hero-row"
              type="button"
              @click="emit('selectHero', hero)"
            >
              <img alt="武将头像" :src="hero.heroAvate || '/icons/xiaoyugan.png'">
              <div>
                <strong>{{ hero.heroName || "未知武将" }}</strong>
                <span>战力 {{ formatPower(hero.power) }}</span>
                <span>星级 {{ hero.star || 0 }}</span>
                <span>红淬 {{ hero.red || 0 }}</span>
                <span>开孔 {{ hero.hole || 0 }}</span>
              </div>
              <Badge :variant="hero.HolyBeast ? 'default' : 'secondary'">
                {{ hero.HolyBeast ? `四圣 ${hero.HBlevel || 0}` : "未开四圣" }}
              </Badge>
            </button>
          </div>
          <p v-else class="empty-lineup">未查询到武将信息</p>
        </section>
      </template>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">关闭</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { computed } from "vue";
import { legacycolor } from "@/utils/heroList";
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
import { Input } from "@/components/ui/input";

const props = defineProps({
  dieStats: { type: Object, required: true },
  fightCount: { type: [Number, String], default: 1 },
  fightCountValid: { type: Boolean, default: true },
  fightProgress: { type: Object, required: true },
  fightResult: { type: Object, required: true },
  open: { type: Boolean, default: false },
  player: { type: Object, default: null },
});

const emit = defineEmits([
  "closeResult",
  "duel",
  "resetResult",
  "selectHero",
  "update:fight-count",
  "update:open",
]);

const countModel = computed({
  get: () => props.fightCount,
  set: (value) => emit("update:fight-count", value),
});

const formatPower = (power) => {
  const value = Number(power) || 0;
  if (value >= 100000000)
    return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000)
    return `${(value / 10000).toFixed(2)}万`;
  return String(value);
};

const rate = (value, total) => {
  const denominator = Number(total) || 0;
  return denominator ? `${((Number(value || 0) / denominator) * 100).toFixed(2)}%` : "0.00%";
};
</script>

<style scoped>
.player-summary {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
}

.player-avatar {
  width: 64px;
  height: 64px;
  border: 1px solid var(--border);
  border-radius: 6px;
  object-fit: cover;
}

.player-details,
.player-title,
.summary-badges,
.metric-row,
.result-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.player-title h3,
.section-heading h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}

.player-details {
  align-items: flex-start;
  flex-direction: column;
}

.player-details p {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 12px;
}

.duel-controls {
  display: grid;
  grid-template-columns: auto 100px minmax(130px, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding-block: 12px;
  border-block: 1px solid var(--border);
}

.duel-controls label {
  font-size: 13px;
  font-weight: 600;
}

.duel-controls span {
  color: var(--muted-foreground);
  font-size: 11px;
}

.duel-controls span.invalid,
.loss {
  color: var(--destructive);
}

.progress-section,
.result-section,
.lineup-section {
  display: grid;
  gap: 10px;
}

.section-heading,
.battle-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

progress {
  width: 100%;
  height: 8px;
  accent-color: var(--primary);
}

.metric-row {
  color: var(--muted-foreground);
  font-size: 12px;
}

.win {
  color: var(--success-color, #15803d);
}

.result-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin: 0;
  border-top: 1px solid var(--border);
  border-left: 1px solid var(--border);
}

.result-summary > div {
  padding: 9px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.result-summary dt {
  color: var(--muted-foreground);
  font-size: 11px;
}

.result-summary dd {
  margin: 3px 0 0;
  font-size: 13px;
  font-weight: 650;
}

.battle-list,
.hero-list {
  display: grid;
  gap: 8px;
}

.battle-row,
.hero-row {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--background);
}

.battle-row.win-row {
  border-left: 3px solid var(--success-color, #15803d);
}

.battle-row.loss-row {
  border-left: 3px solid var(--destructive);
}

.battle-sides {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.battle-side {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.battle-side img,
.hero-row img {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 4px;
  object-fit: cover;
}

.battle-side div,
.hero-row div {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 3px 8px;
}

.battle-side strong,
.hero-row strong {
  width: 100%;
  overflow-wrap: anywhere;
  font-size: 12px;
}

.battle-side span,
.hero-row span {
  color: var(--muted-foreground);
  font-size: 11px;
}

.hero-row {
  display: grid;
  width: 100%;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.hero-row:hover {
  border-color: var(--ring);
  background: var(--muted);
}

.empty-lineup {
  margin: 0;
  padding: 24px;
  border: 1px dashed var(--border);
  color: var(--muted-foreground);
  text-align: center;
  font-size: 12px;
}

@media (max-width: 640px) {
  .duel-controls {
    grid-template-columns: minmax(0, 1fr) 92px;
  }

  .duel-controls span {
    grid-column: 1 / -1;
  }

  .result-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .battle-sides {
    grid-template-columns: 1fr;
  }

  .battle-sides > b {
    display: none;
  }

  .hero-row {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .hero-row [data-slot="badge"] {
    grid-column: 1 / -1;
    justify-self: start;
  }
}
</style>
