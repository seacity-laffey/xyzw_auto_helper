<template>
  <section class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span>已竞猜 {{ guessed.length }} / {{ limit }} 队</span>
      <Button
        size="sm"
        variant="outline"
        :disabled="loading || pending || !stage"
        @click="$emit('load', page)"
      >加载 / 重试</Button
      >
    </div>
    <p v-if="!pairs.length" class="text-sm text-muted-foreground">
      选择阶段后加载对阵；历史阶段仅可查看。
    </p>
    <div
      v-for="(pair, index) in pairs.slice(page * 10, page * 10 + 10)"
      :key="index"
      class="grid grid-cols-2 gap-3 rounded-lg border border-border p-3"
    >
      <div v-for="team in pair" :key="team.teamId" class="space-y-2">
        <strong>{{ team.name || team.teamId }}</strong>
        <p class="text-xs text-muted-foreground">
          战力 {{ (Number(team.power || 0) / 1e8).toFixed(2) }}亿 · 助威
          {{ team.cheerCnt || 0 }} <span v-if="team.isWin">· 获胜</span>
        </p>
        <Button
          size="sm"
          :disabled="!canBet(pair, team)"
          @click="$emit('guess', pair, team)"
        >{{ guessed.includes(team.teamId) ? "已竞猜" : "竞猜此队" }}</Button
        >
      </div>
    </div>
    <div class="flex items-center justify-end gap-3">
      <Button
        size="sm"
        variant="outline"
        :disabled="loading || !page"
        @click="$emit('load', page - 1)"
      >上一页</Button
      >
      <span class="text-sm"
      >第 {{ page + 1 }} 页 · 已加载 {{ pairs.length }} 场</span
      >
      <Button
        size="sm"
        variant="outline"
        :disabled="loading || (complete && (page + 1) * 10 >= pairs.length)"
        @click="$emit('load', page + 1)"
      >下一页</Button
      >
    </div>
  </section>
</template>

<script setup>
import { Button } from "@/components/ui/button";

defineProps({
  pairs: Array,
  guessed: Array,
  limit: Number,
  stage: Object,
  page: Number,
  complete: Boolean,
  loading: Boolean,
  pending: Boolean,
  canBet: Function,
});
defineEmits(["load", "guess"]);
</script>
