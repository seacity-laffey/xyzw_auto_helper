<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <span>助威道具 {{ supportCount }}</span
      ><Button
        size="sm"
        variant="outline"
        :disabled="loading || pending"
        @click="$emit('load')"
      >刷新助威榜</Button
      >
    </div>
    <p v-if="!supportOpen" class="text-sm text-muted-foreground">
      当前期不在助威时间内。
    </p>
    <p v-if="!votes.length" class="text-sm text-muted-foreground">
      暂无榜单，请刷新。
    </p>
    <div
      v-for="(team, index) in votes"
      :key="team.teamId"
      class="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
    >
      <div>
        <strong>{{ index + 1 }}. {{ team.name }}</strong>
        <p class="text-xs text-muted-foreground">
          助威 {{ team.cheerCnt || 0 }} · 战力
          {{ (Number(team.power || 0) / 1e8).toFixed(2) }}亿
        </p>
      </div>
      <Button
        size="sm"
        :disabled="pending || !supportOpen || !supportCount || team.isOut"
        @click="
          target = team;
          count = 1;
        "
      >{{ team.isOut ? "已淘汰" : "助威" }}</Button
      >
    </div>
    <Dialog
      :open="!!target"
      @update:open="!pending && !$event && (target = null)"
    >
      <DialogContent
      ><DialogHeader
       ><DialogTitle>助威 {{ target?.name }}</DialogTitle
       ><DialogDescription
       >消耗助威道具，当前持有 {{ supportCount }} 个。</DialogDescription
       ></DialogHeader
       >
        <Input
          aria-label="助威数量"
          min="1"
          type="number"
          v-model="count"
          :max="supportCount"
        ></Input>
        <DialogFooter
        ><Button
          :disabled="
            pending
              || !supportOpen
              || !Number.isInteger(Number(count))
              || count < 1
              || count > supportCount
          "
          @click="confirm"
        >确认助威</Button
        ></DialogFooter
        >
      </DialogContent>
    </Dialog>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const props = defineProps({
  votes: Array,
  supportCount: Number,
  supportOpen: Boolean,
  loading: Boolean,
  pending: Boolean,
  vote: Function,
});
defineEmits(["load"]);
const target = ref(null);
const count = ref(1);
const confirm = async () => {
  if (await props.vote(target.value, count.value))
    target.value = null;
};
</script>
