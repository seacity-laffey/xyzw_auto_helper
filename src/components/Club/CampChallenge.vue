<template>
  <section
    class="col-span-full space-y-4 rounded-xl border border-border bg-card p-4 text-card-foreground"
  >
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-lg font-semibold">营地挑战</h3>
      <Button variant="outline"
              :disabled="loading"
              @click="refresh"
      >刷新</Button
      >
    </header>
    <p v-if="error" class="text-sm text-destructive" role="alert">
      {{ error }}
    </p>
    <div class="flex flex-wrap items-center gap-3">
      <select
        aria-label="比赛日"
        class="rounded border border-border bg-background p-2"
        v-model="day"
      >
        <option v-for="value in days" :key="value" :value="value">
          周{{ ["日", "一", "二", "三", "四", "五", "六"][value] }}
        </option>
      </select>
      <span class="text-sm"
      >{{ opponent?.name || "暂无对手" }} · 周期 {{ phase || "—" }} ·
        个人本周战功 {{ data.siege?.score ?? "—" }}</span
      >
    </div>
    <nav aria-label="营地视图" class="flex flex-wrap gap-2">
      <Button
        v-for="item in tabs"
        :key="item.id"
        size="sm"
        :variant="active === item.id ? 'default' : 'outline'"
        @click="active = item.id"
      >{{ item.label }}</Button
      >
    </nav>
    <template v-if="active === 'members'">
      <div class="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          :variant="side === 'own' ? 'default' : 'outline'"
          @click="side = 'own'"
        >我方</Button
        ><Button
          size="sm"
          :variant="side === 'opponent' ? 'default' : 'outline'"
          @click="side = 'opponent'"
        >敌方</Button
        ><select
          aria-label="据点排序"
          class="rounded border border-border bg-background p-2 text-sm"
          v-model="sort"
        >
          <option value="slot">据点序号</option>
          <option value="power">战力降序</option>
          <option value="score">战功降序</option></select
        ><label class="text-sm"
        ><input type="checkbox" v-model="onlyAlive" > 仅未击败</label
        >
      </div>
      <p class="text-xs text-muted-foreground">
        {{
          loading
            ? `查询据点 ${progress}/${total}`
            : failed
              ? `${failed} 个据点查询失败，≥ 为已查到次数，未知不按零次处理`
              : "战报已加载"
        }}。进攻统计按所选比赛日；据点战功与防守次数为接口当前快照。
      </p>
      <CampMemberTable
        :caption="`营地${side === 'own' ? '我方' : '敌方'}统计 · 周期 ${phase || '—'} · 比赛日 ${day} · ${loading ? '加载中' : failed ? '部分数据缺失' : '查询完成'}`"
        :loading="loading"
        :members="members"
        :only-alive="onlyAlive"
        :sort="sort"
        @detail="showDetail"
      ></CampMemberTable>
    </template>
    <ClubBonfireOpponents
      v-else-if="active === 'lineups'"
      :match-date="matchDate"
      :response="data"
      :token-id="tokenId"
    ></ClubBonfireOpponents>
    <CampRecordTable
      v-else-if="active === 'records'"
      :records="attackRows"
    ></CampRecordTable>
    <div v-else class="space-y-2">
      <div
        v-for="(rank, index) in ranks"
        :key="rank.legionId || index"
        class="flex justify-between rounded border border-border p-3 text-sm"
      >
        <strong
        >{{ index + 1 }}.
          {{ rank.name || rank.legionName || rank.legionId }}</strong
        ><span>{{ rank.score ?? rank.value ?? "—" }} 分</span>
      </div>
      <p v-if="!ranks.length" class="text-sm text-muted-foreground">暂无排行</p>
    </div>
    <Dialog :open="!!detail"
            @update:open="!$event && (detail = null)"
    ><DialogContent class="max-h-[85vh] max-w-3xl overflow-auto"
    ><DialogHeader
     ><DialogTitle
     >{{ detail?.mirror ? "[镜像] " : "" }}{{ detail?.name }} ·
       防守流水</DialogTitle
     ><DialogDescription
     >所选比赛日的防守战报，结果以该据点防守方为准。</DialogDescription
     ></DialogHeader
     >
      <p v-if="detailLoading">加载中…</p>
      <CampRecordTable
        v-else
        defense
        :records="filteredDetails"
      ></CampRecordTable></DialogContent
    ></Dialog>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCampChallenge } from "@/composables/useCampChallenge.js";
import ClubBonfireOpponents from "./ClubBonfireOpponents.vue";
import CampMemberTable from "./CampMemberTable.vue";
import CampRecordTable from "./CampRecordTable.vue";

const {
  tokenId,
  matchDate,
  data,
  day,
  side,
  days,
  phase,
  opponent,
  members,
  ranks,
  attackRows,
  loading,
  error,
  failed,
  progress,
  total,
  detail,
  filteredDetails,
  detailLoading,
  refresh,
  showDetail,
} = useCampChallenge();
const active = ref("members");
const sort = ref("slot");
const onlyAlive = ref(false);
const tabs = [
  { id: "members", label: "据点与攻防统计" },
  { id: "lineups", label: "敌方阵容" },
  { id: "records", label: "我的进攻战报" },
  { id: "rank", label: "分组排行" },
];
</script>
