<template>
  <section class="result-panel">
    <header>
      <h4>切磋结果</h4>
      <dl class="result-summary">
        <div><dt>总次数</dt><dd>{{ fightNum }}</dd></div>
        <div class="wins"><dt>胜</dt><dd>{{ result.winCount }}</dd></div>
        <div class="losses"><dt>负</dt><dd>{{ lossCount }}</dd></div>
        <div><dt>胜率</dt><dd>{{ winRate }}%</dd></div>
        <div><dt>我方掉将率</dt><dd>{{ ourLossRate }}%</dd></div>
        <div><dt>敌方掉将率</dt><dd>{{ enemyLossRate }}%</dd></div>
      </dl>
    </header>

    <div class="result-list">
      <article
        v-for="(battle, index) in result.resultCount"
        :key="index"
        class="battle-result"
        :class="battle.isWin ? 'win' : 'loss'"
      >
        <div class="battle-heading">
          <strong>第 {{ index + 1 }} 场</strong>
          <Badge :variant="battle.isWin ? 'default' : 'destructive'">{{ battle.isWin ? "胜利" : "失败" }}</Badge>
        </div>
        <div class="battle-details">
          <div class="battle-side left-side">
            <img :alt="battle.leftName || '我方'" :src="battle.leftheadImg || '/icons/xiaoyugan.png'">
            <span><strong>{{ battle.leftName || "未知" }}</strong><small>战力 {{ battle.leftpower }} · 掉将 {{ battle.leftDieHero }}</small></span>
          </div>
          <b>VS</b>
          <div class="battle-side">
            <img :alt="battle.rightName || '敌方'" :src="battle.rightheadImg || '/icons/xiaoyugan.png'">
            <span><strong>{{ battle.rightName || "未知" }}</strong><small>战力 {{ battle.rightpower }} · 掉将 {{ battle.rightDieHero }}</small></span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { Badge } from "@/components/ui/badge";

const props = defineProps({
  fightNum: { type: Number, required: true },
  result: { type: Object, required: true },
});

const lossCount = computed(() => props.fightNum - props.result.winCount);
const percentage = (value) => ((value / (props.fightNum * 5)) * 100).toFixed(2);
const winRate = computed(() => ((props.result.winCount / props.fightNum) * 100).toFixed(2));
const ourLossRate = computed(() => percentage(props.result.ourTotalDieHeroCount));
const enemyLossRate = computed(() => percentage(props.result.enemyTotalDieHeroCount));
</script>

<style scoped>
.result-panel { border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--bg-primary); }
.result-panel > header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
.result-panel h4 { margin: 0; color: var(--text-primary); font-size: var(--font-size-sm); }
.result-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; margin: 0; }
.result-summary > div { display: flex; align-items: baseline; gap: 4px; }
.result-summary dt { color: var(--text-secondary); font-size: var(--font-size-xs); }
.result-summary dd { margin: 0; color: var(--text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); font-variant-numeric: tabular-nums; }
.result-summary .wins dd { color: var(--success-color); }
.result-summary .losses dd { color: var(--error-color); }
.result-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: 500px; overflow-y: auto; }
.battle-result { min-width: 0; padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
.battle-result:nth-child(odd) { border-right: 1px solid var(--border-color); }
.battle-result.win { box-shadow: inset 3px 0 0 var(--success-color); }
.battle-result.loss { box-shadow: inset 3px 0 0 var(--error-color); }
.battle-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.battle-heading strong { color: var(--text-primary); font-size: var(--font-size-xs); }
.battle-details { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 10px; }
.battle-details > b { color: var(--text-tertiary); font-size: var(--font-size-xs); }
.battle-side { display: flex; min-width: 0; align-items: center; gap: 8px; }
.battle-side.left-side { flex-direction: row-reverse; text-align: right; }
.battle-side img { width: 32px; height: 32px; flex: 0 0 32px; border: 1px solid var(--border-color); border-radius: 50%; object-fit: cover; }
.battle-side span { display: grid; min-width: 0; gap: 2px; }
.battle-side strong, .battle-side small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.battle-side strong { color: var(--text-primary); font-size: var(--font-size-xs); }
.battle-side small { color: var(--text-secondary); font-size: 11px; }

@media (max-width: 900px) {
  .result-panel > header { align-items: flex-start; flex-direction: column; }
  .result-list { grid-template-columns: 1fr; }
  .battle-result:nth-child(odd) { border-right: 0; }
}

@media (max-width: 480px) {
  .battle-details { grid-template-columns: 1fr; }
  .battle-details > b { text-align: center; }
  .battle-side.left-side { flex-direction: row; text-align: left; }
}
</style>
