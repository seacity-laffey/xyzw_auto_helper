<template>
  <section
    class="col-span-full space-y-4 rounded-xl border border-border bg-card p-4 text-card-foreground"
  >
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-lg font-semibold">
        逐鹿盐山
        <span class="text-sm text-muted-foreground">{{
          season > 0 ? `第${season}赛季` : "当前无赛季配置"
        }}</span>
      </h3>
      <Button variant="outline"
              :disabled="loading || pending"
              @click="refresh"
      >刷新角色数据</Button
      >
    </header>
    <p v-if="error" class="text-sm text-destructive" role="alert">
      {{ error }}
    </p>
    <p v-if="!season" class="text-sm text-muted-foreground">
      当前不在已知赛季内；若游戏已开启新赛季，请更新助手后重试。
    </p>
    <div class="flex flex-wrap gap-3">
      <select
        aria-label="逐鹿期次"
        class="rounded-md border border-border bg-background p-2 text-sm"
        v-model="round"
        :disabled="pending"
      >
        <option v-for="r in rounds" :key="r" :value="r">
          第{{ r }}期 ·
          {{
            getRoundPhase(r, season, now) === ApexRoundPhase.Ended
              ? "历史"
              : "当前"
          }}
        </option>
      </select>
      <select
        aria-label="逐鹿阶段"
        class="rounded-md border border-border bg-background p-2 text-sm"
        v-model="stageId"
        :disabled="pending"
      >
        <option
          v-for="tab in stages"
          :key="tab.scheduleId"
          :value="tab.scheduleId"
        >
          {{ tab.title }} · {{ statusNames[tab.state] }}
        </option>
      </select>
    </div>
    <nav aria-label="逐鹿功能" class="flex gap-2">
      <Button
        v-for="item in tabs"
        :key="item.id"
        size="sm"
        :variant="active === item.id ? 'default' : 'outline'"
        @click="active = item.id"
      >{{ item.label }}</Button
      >
    </nav>
    <ApexSchedulePanel
      v-if="active === 'schedule'"
      :loading="loading"
      :records="records"
      :schedules="schedules"
      :stage-id="stageId"
      @load="loadRecords"
    ></ApexSchedulePanel>
    <ApexGuessPanel
      v-else-if="active === 'guess'"
      :can-bet="canBet"
      :complete="complete"
      :guessed="guessed"
      :limit="limit"
      :loading="loading"
      :page="page"
      :pairs="pairs"
      :pending="pending"
      :stage="stage"
      @guess="guess"
      @load="loadPage"
    ></ApexGuessPanel>
    <ApexVotePanel
      :key="`${round}-${tokenStore.selectedToken?.id}`"
      v-else
      :loading="loading"
      :pending="pending"
      :support-count="supportCount"
      :support-open="supportOpen"
      :vote="vote"
      :votes="votes"
      @load="loadVotes"
    ></ApexVotePanel>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { useTokenStore } from "@/stores/tokenStore";
import { useApexChallenge } from "@/composables/useApexChallenge.js";
import { ApexRoundPhase, getRoundPhase } from "@/utils/apexRules.js";
import ApexGuessPanel from "./ApexGuessPanel.vue";
import ApexVotePanel from "./ApexVotePanel.vue";
import ApexSchedulePanel from "./ApexSchedulePanel.vue";

const tokenStore = useTokenStore();
const {
  now,
  round,
  rounds,
  stageId,
  stage,
  stages,
  schedules,
  season,
  pairs,
  votes,
  records,
  page,
  complete,
  loading,
  pending,
  error,
  guessed,
  supportOpen,
  supportCount,
  limit,
  canBet,
  refresh,
  loadPage,
  loadVotes,
  loadRecords,
  guess,
  vote,
} = useApexChallenge();
const active = ref("schedule");
const tabs = [
  { id: "schedule", label: "赛程 / 历史" },
  { id: "guess", label: "竞猜 / 记录" },
  { id: "vote", label: "助威" },
];
const statusNames = ["未开启", "可竞猜", "阵容锁定", "比赛中", "已结束"];
</script>
