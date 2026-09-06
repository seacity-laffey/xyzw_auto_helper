<template>
  <div v-if="viewMode === 'card'" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <article
      v-for="(token, index) in tokens"
      :key="token.id"
      class="overflow-hidden rounded-md border border-outline-variant bg-background transition-colors hover:border-input"
      data-testid="token-card"
      draggable="true"
      @dragover="$emit('dragOver', $event)"
      @dragstart="$emit('dragStart', index, $event)"
      @drop="$emit('drop', index, $event)"
    >
      <header class="flex items-center justify-between gap-4 border-b border-outline-variant px-5 py-4">
        <div class="flex min-w-0 items-center gap-3">
          <img class="h-10 w-10 shrink-0 rounded-full border border-outline-variant object-cover" :alt="`${token.name}头像`" :src="token.avatar || '/icons/xiaoyugan.png'">
          <div class="min-w-0">
            <div class="flex min-w-0 items-center gap-2">
              <strong class="truncate text-base font-bold text-on-surface">{{ token.name }}</strong>
              <span v-if="token.server" class="shrink-0 rounded border border-outline-variant px-2 py-0.5 font-mono text-[11px] text-primary">{{ token.server }}</span>
            </div>
            <div class="mt-1 flex items-center gap-2 text-xs text-on-surface-variant">
              <span class="h-2 w-2 rounded-full" :class="statusClass(token.id)"></span>
              {{ statusText(token.id) }}
            </div>
          </div>
        </div>
        <TokenAccountActions @action="$emit('action', $event, token)"></TokenAccountActions>
      </header>

      <div class="space-y-4 p-5">
        <div class="flex min-w-0 items-center gap-2 rounded-md bg-surface-container px-3 py-2">
          <span class="shrink-0 text-xs font-medium text-on-surface-variant">Token:</span>
          <code class="truncate font-mono text-xs text-on-surface">{{ maskToken(token.token) }}</code>
        </div>

        <div v-if="editingRemark === token.id" class="flex items-start gap-2 rounded-md border border-primary bg-surface-container p-3" @click.stop>
          <span class="shrink-0 text-body-sm font-medium text-on-surface">备注：</span>
          <textarea
            autofocus
            class="min-w-0 flex-1 resize-none rounded border border-outline-variant bg-surface-container-lowest px-2 py-1 text-body-sm text-on-surface outline-none focus:border-primary"
            placeholder="添加备注信息..."
            rows="2"
            v-model="tempRemarks[token.id]"
            @blur="saveRemark(token)"
            @keyup.enter="saveRemark(token)"
            @keyup.esc="cancelRemark"
          ></textarea>
        </div>
        <button v-else class="flex w-full items-center gap-2 rounded-md bg-surface-container px-3 py-2 text-left text-body-sm text-on-surface-variant hover:text-primary" type="button" @click.stop="startRemark(token)">
          <span class="shrink-0 font-medium text-on-surface">备注：</span>
          <span class="min-w-0 flex-1 truncate">{{ token.remark || "点击添加备注" }}</span>
          <Pencil class="h-4 w-4 shrink-0"></Pencil>
        </button>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1"><span class="text-xs text-on-surface-variant">创建：</span><span class="text-xs text-on-surface">{{ formatTime(token.createdAt) }}</span></div>
          <div class="flex flex-col gap-1"><span class="text-xs text-on-surface-variant">使用：</span><span class="text-xs text-on-surface">{{ formatTime(token.lastUsed) }}</span></div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-4">
          <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <span>存储类型：</span>
            <span :class="isPermanent(token) ? 'text-primary' : 'text-tertiary'">{{ isPermanent(token) ? "长期有效" : "临时存储" }}</span>
          </div>
          <button v-if="!isPermanent(token)" class="flex items-center gap-1 text-xs font-semibold text-tertiary hover:underline" type="button" @click.stop="$emit('upgrade', token)">
            <Star class="h-4 w-4"></Star>
            升级为长期有效
          </button>
        </div>
      </div>
    </article>
  </div>

  <div v-else class="space-y-3" data-testid="token-account-list">
    <article
      v-for="(token, index) in tokens"
      :key="token.id"
      class="group flex items-center justify-between gap-6 rounded-md border border-[color-mix(in_srgb,var(--outline-variant)_72%,transparent)] bg-background px-6 py-5 transition-colors hover:border-input max-xl:flex-col max-xl:items-stretch max-xl:gap-4 max-md:px-4 max-md:py-4"
      data-testid="token-account-row"
      draggable="true"
      @dragover="$emit('dragOver', $event)"
      @dragstart="$emit('dragStart', index, $event)"
      @drop="$emit('drop', index, $event)"
    >
      <div class="flex min-w-0 flex-1 items-center gap-12 max-xl:w-full max-md:grid max-md:grid-cols-[88px_minmax(0,1fr)] max-md:gap-x-3 max-md:gap-y-4">
        <div class="flex min-w-[100px] items-center gap-2 text-body-sm font-medium text-on-surface max-md:min-w-0 max-md:text-xs">
          <span class="h-2 w-2 shrink-0 rounded-full" :class="statusClass(token.id)"></span>
          <span>{{ statusText(token.id) }}</span>
        </div>

        <div class="flex min-w-[210px] items-center gap-4 max-md:min-w-0">
          <img class="h-10 w-10 shrink-0 rounded-full border border-outline-variant object-cover" :alt="`${token.name}头像`" :src="token.avatar || '/icons/xiaoyugan.png'">
          <div class="flex min-w-0 items-center gap-2">
            <strong class="max-w-28 truncate text-[15px] font-bold text-on-surface">{{ token.name }}</strong>
            <span v-if="token.server" class="shrink-0 rounded border px-2 py-0.5 font-mono text-[11px] leading-[1.4]" :class="status(token.id) === 'connected' ? connectedServerClass : disconnectedServerClass">{{ token.server }}</span>
          </div>
        </div>

        <div class="min-w-[140px] max-w-xs flex-1 max-md:col-span-2 max-md:w-full max-md:max-w-none" @click.stop>
          <input
            v-if="editingRemark === token.id"
            autofocus
            class="w-full rounded-md border border-outline-variant bg-surface-container px-3 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
            data-testid="token-remark-input"
            placeholder="添加备注..."
            v-model="tempRemarks[token.id]"
            @blur="saveRemark(token)"
            @keyup.enter="saveRemark(token)"
            @keyup.esc="cancelRemark"
          >
          <button v-else class="flex min-w-0 max-w-full items-center gap-1 text-body-sm text-on-surface-variant transition-colors hover:text-primary" type="button" @click="startRemark(token)">
            <FileText class="h-4 w-4 shrink-0"></FileText>
            <span class="truncate">{{ token.remark || "点击添加备注" }}</span>
            <Pencil class="h-3 w-3 shrink-0"></Pencil>
          </button>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-3 max-xl:w-full max-xl:justify-end max-md:justify-start max-md:gap-2" @click.stop>
        <button v-if="!isPermanent(token)" class="min-w-14 px-2 text-center text-body-sm font-semibold text-tertiary hover:underline max-md:px-0 max-md:text-left" type="button" @click="$emit('upgrade', token)">临时 · 升级</button>
        <span v-else class="min-w-14 px-2 text-center text-body-sm font-semibold text-primary max-md:px-0 max-md:text-left">长期</span>
        <TokenAccountActions @action="$emit('action', $event, token)"></TokenAccountActions>
      </div>
    </article>
  </div>
</template>

<script setup>
import { FileText, Pencil, Star } from "@lucide/vue";
import { ref } from "vue";
import TokenAccountActions from "./TokenAccountActions.vue";

const props = defineProps({
  connectionStatuses: { type: Object, default: () => ({}) },
  tokens: { type: Array, default: () => [] },
  viewMode: { type: String, default: "list" },
});
const emit = defineEmits(["action", "dragOver", "dragStart", "drop", "saveRemark", "upgrade"]);

const editingRemark = ref(null);
const tempRemarks = ref({});
const connectedServerClass = "border-[color-mix(in_srgb,var(--primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary";
const disconnectedServerClass = "border-[color-mix(in_srgb,var(--error)_24%,transparent)] bg-[color-mix(in_srgb,var(--error)_10%,transparent)] text-error";

const status = (tokenId) => {
  const connection = props.connectionStatuses[tokenId];
  return typeof connection === "string" ? connection : connection?.status || "disconnected";
};
const statusText = (tokenId) => ({
  connected: "已连接",
  connecting: "连接中...",
  disconnected: "已断开",
  disconnecting: "断开中...",
  error: "连接错误",
})[status(tokenId)] || "未连接";
const statusClass = (tokenId) => {
  const value = status(tokenId);
  if (value === "connected")
    return "bg-primary";
  if (["connecting", "disconnecting"].includes(value))
    return "bg-tertiary";
  return "bg-error";
};
const isPermanent = (token) => ["url", "bin", "wxQrcode"].includes(token.importMethod) || token.upgradedToPermanent;
const maskToken = (token) => token?.length > 8 ? `${token.slice(0, 4)}***${token.slice(-4)}` : token || "";
const formatTime = (timestamp) => new Date(timestamp).toLocaleString("zh-CN");
const startRemark = (token) => {
  editingRemark.value = token.id;
  tempRemarks.value[token.id] = token.remark || "";
};
const cancelRemark = () => {
  editingRemark.value = null;
};
const saveRemark = (token) => {
  if (editingRemark.value !== token.id)
    return;
  const remark = tempRemarks.value[token.id] || "";
  editingRemark.value = null;
  emit("saveRemark", token, remark);
};
</script>
