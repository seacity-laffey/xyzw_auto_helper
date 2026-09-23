<template>
  <section class="space-y-3">
    <div class="overflow-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr>
            <th>阶段</th>
            <th>日期</th>
            <th>开赛时间</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in schedules"
            :key="item.id"
            class="border-t border-border"
          >
            <td class="py-2">{{ getStageName(item.stage) }}</td>
            <td>{{ item.date }}</td>
            <td>{{ formatTime(item.fightTime) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <Button
      size="sm"
      variant="outline"
      :disabled="loading || !stageId"
      @click="$emit('load')"
    >加载选中阶段历史对阵</Button
    >
    <p v-if="!records.length" class="text-sm text-muted-foreground">
      暂无已加载的历史对阵。
    </p>
    <div
      v-for="(record, index) in records"
      :key="record.id || index"
      class="rounded-lg border border-border p-3 text-sm"
    >
      {{ teamName(record.battleInfo?.team1) }} 对阵
      {{ teamName(record.battleInfo?.team2) }}
      <span class="text-muted-foreground">
        · 赛程 {{ record.scheduleId || stageId }}</span
      >
    </div>
  </section>
</template>

<script setup>
import { Button } from "@/components/ui/button";
import { getStageName } from "@/utils/apexRules.js";

defineProps({
  schedules: Array,
  records: Array,
  loading: Boolean,
  stageId: Number,
});
defineEmits(["load"]);
const teamName = (team) =>
  team?.members?.[0]?.role?.name || team?.name || team?.teamId || "未知队伍";
const formatTime = (seconds) =>
  Number.isFinite(seconds)
    ? `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}`
    : "—";
</script>
