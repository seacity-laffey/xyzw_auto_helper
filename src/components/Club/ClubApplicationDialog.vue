<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-h-[80vh] max-w-[700px] overflow-hidden p-0">
      <DialogHeader class="border-b border-border px-5 py-4 pr-14">
        <DialogTitle>俱乐部申请列表</DialogTitle>
        <DialogDescription>审核申请加入当前俱乐部的角色</DialogDescription>
      </DialogHeader>
      <div class="dialog-toolbar">
        <Button size="sm" :disabled="applications.length === 0" @click="$emit('approveAll')">一键通过</Button>
        <Button size="sm" variant="destructive" :disabled="applications.length === 0" @click="$emit('rejectAll')">一键拒绝</Button>
      </div>
      <div v-if="loading" class="loading">
        <LoaderCircle class="spinning" :size="17"></LoaderCircle><span>正在加载申请列表...</span>
      </div>
      <div v-else-if="applications.length === 0" class="empty-apply">
        <Inbox :size="22"></Inbox><span>暂无申请</span>
      </div>
      <div v-else class="apply-list">
        <article v-for="application in applications" :key="application.roleId" class="apply-item">
          <div class="apply-left">
            <img alt="申请人头像" class="apply-avatar" :src="application.headImg || '/icons/xiaoyugan.png'">
            <div class="apply-info">
              <strong>{{ application.name }} <small>ID: {{ application.roleId }}</small></strong>
              <div><span>等级 {{ application.level || 0 }}</span><span>{{ formatClubNumber(application.power) }}</span><span v-if="application.serverId">服务器 {{ application.serverId }}</span></div>
              <p v-if="application.applyReason">申请留言: {{ application.applyReason }}</p>
            </div>
          </div>
          <div class="apply-actions">
            <Button size="sm" @click="$emit('approve', application.roleId)">通过</Button>
            <Button size="sm" variant="outline" @click="$emit('reject', application.roleId)">拒绝</Button>
          </div>
        </article>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { Inbox, LoaderCircle } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatClubNumber } from "@/utils/clubInfoData";

defineProps({
  applications: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  open: { type: Boolean, default: false },
});
defineEmits(["approve", "approveAll", "reject", "rejectAll", "update:open"]);
</script>

<style scoped>
.dialog-toolbar { display: flex; justify-content: flex-end; gap: var(--spacing-xs); padding: var(--spacing-sm) var(--spacing-md); border-bottom: 1px solid var(--border-color); }
.loading, .empty-apply { display: grid; min-height: 160px; place-items: center; align-content: center; gap: var(--spacing-xs); color: var(--text-secondary); font-size: var(--font-size-sm); }
.spinning { animation: club-application-spin 800ms linear infinite; }
@keyframes club-application-spin { to { transform: rotate(360deg); } }
.apply-list { max-height: calc(80vh - 176px); overflow-y: auto; }
.apply-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
.apply-item:last-child { border-bottom: 0; }
.apply-left { display: flex; min-width: 0; flex: 1; align-items: center; gap: 12px; }
.apply-avatar { width: 32px; height: 32px; flex: 0 0 32px; border: 1px solid var(--border-color); border-radius: 50%; object-fit: cover; }
.apply-info { display: grid; min-width: 0; flex: 1; gap: 4px; }
.apply-info strong { color: var(--text-primary); font-size: var(--font-size-sm); }
.apply-info small { color: var(--text-tertiary); font-weight: 400; }
.apply-info > div { display: flex; flex-wrap: wrap; gap: 12px; color: var(--text-secondary); font-size: var(--font-size-xs); }
.apply-info p { margin: 0; color: var(--text-secondary); font-size: var(--font-size-xs); line-height: 1.4; word-break: break-word; }
.apply-actions { display: flex; gap: 8px; }

@media (max-width: 560px) {
  .apply-item { align-items: flex-start; flex-direction: column; }
  .apply-actions { width: 100%; padding-left: 44px; }
  .apply-actions > button { flex: 1; }
}
</style>
