<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>编辑 Token</DialogTitle>
        <DialogDescription class="sr-only">编辑当前 Token 的账号和连接信息</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <div class="grid gap-2">
          <Label for="token-name">名称</Label>
          <Input id="token-name" required v-model="draft.name"></Input>
        </div>
        <div class="grid gap-2">
          <Label for="token-value">Token 字符串</Label>
          <Textarea id="token-value" required placeholder="粘贴 Token 字符串..." rows="3" v-model="draft.token"></Textarea>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <div class="grid gap-2">
            <Label for="token-server">服务器</Label>
            <Input id="token-server" v-model="draft.server"></Input>
          </div>
          <div class="grid gap-2">
            <Label for="token-ws-url">WebSocket 地址</Label>
            <Input id="token-ws-url" v-model="draft.wsUrl"></Input>
          </div>
        </div>
        <div class="grid gap-2">
          <Label for="token-remark">备注</Label>
          <Textarea id="token-remark" placeholder="添加备注信息..." rows="2" v-model="draft.remark"></Textarea>
        </div>
        <DialogFooter class="mt-2">
          <Button type="button" variant="outline" @click="$emit('update:open', false)">取消</Button>
          <Button type="submit">保存</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { reactive, watch } from "vue";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const props = defineProps({
  open: { type: Boolean, default: false },
  token: { type: Object, default: null },
});
const emit = defineEmits(["save", "update:open"]);
const draft = reactive({ name: "", remark: "", server: "", token: "", wsUrl: "" });

watch(
  [() => props.open, () => props.token],
  ([open, token]) => {
    if (!open || !token)
      return;
    Object.assign(draft, {
      name: token.name || "",
      remark: token.remark || "",
      server: token.server || "",
      token: token.token || "",
      wsUrl: token.wsUrl || "",
    });
  },
  { immediate: true },
);

const submit = () => emit("save", { ...draft });
</script>
