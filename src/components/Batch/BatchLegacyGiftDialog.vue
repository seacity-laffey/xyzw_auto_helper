<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>批量功法残卷赠送</DialogTitle>
        <DialogDescription>
          先查询并核对接收角色，再对当前批量账号执行赠送。
        </DialogDescription>
      </DialogHeader>

      <div class="gift-form">
        <div class="query-grid">
          <div class="field-group">
            <Label for="gift-recipient-id">接收者 ID</Label>
            <Input
              id="gift-recipient-id"
              inputmode="numeric"
              placeholder="角色 ID"
              :model-value="recipientId"
              @update:model-value="updateRecipientId"
            ></Input>
          </div>
          <div class="field-group">
            <Label for="gift-password">安全密码</Label>
            <Input
              id="gift-password"
              placeholder="输入安全密码"
              type="password"
              :model-value="password"
              @update:model-value="updatePassword"
            ></Input>
          </div>
          <Button
            class="query-button"
            :disabled="!recipientId || !password || querying"
            @click="emit('query')"
          >
            <LoaderCircle v-if="querying" class="spinner"></LoaderCircle>
            {{ querying ? "查询中" : "查询" }}
          </Button>
        </div>

        <p v-if="error" class="error-message">{{ error }}</p>

        <section v-if="recipientInfo" class="recipient-panel">
          <div class="avatar-container">
            <img
              v-if="recipientInfo.avatarUrl && !avatarLoadError"
              alt="角色头像"
              :src="recipientInfo.avatarUrl"
              @error="avatarLoadError = true"
              @load="avatarLoading = false"
            >
            <span v-else>{{ recipientInitial }}</span>
            <LoaderCircle v-if="avatarLoading" class="avatar-spinner"></LoaderCircle>
          </div>
          <div class="recipient-details">
            <h3>{{ recipientInfo.name || "未知角色" }}</h3>
            <dl>
              <div>
                <dt>角色 ID</dt>
                <dd>{{ recipientInfo.roleId }}</dd>
              </div>
              <div>
                <dt>服务器</dt>
                <dd>{{ recipientInfo.serverName || "-" }}</dd>
              </div>
              <div>
                <dt>战力</dt>
                <dd>{{ recipientInfo.power }}{{ recipientInfo.powerUnit }}</dd>
              </div>
              <div>
                <dt>军团</dt>
                <dd>{{ recipientInfo.legionName || "无" }}</dd>
              </div>
              <div>
                <dt>军团 ID</dt>
                <dd>{{ recipientInfo.legionId || "无" }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <div class="field-group">
          <Label for="gift-quantity">赠送数量</Label>
          <Input
            id="gift-quantity"
            type="number"
            :max="1000"
            :min="1"
            :model-value="quantity"
            :step="1"
            @update:model-value="updateQuantity"
          ></Input>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button :disabled="!recipientId || !recipientInfo" @click="emit('submit')">
          开始赠送
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { LoaderCircle } from "@lucide/vue";
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

interface RecipientInfo {
  avatarUrl?: string;
  legionId?: number | string;
  legionName?: string;
  name?: string;
  power?: number | string;
  powerUnit?: string;
  roleId?: number | string;
  serverName?: string;
}

const props = defineProps<{
  error: string;
  open: boolean;
  password: string;
  quantity: number;
  querying: boolean;
  recipientId: number | string;
  recipientInfo: RecipientInfo | null;
}>();

const emit = defineEmits<{
  "inputChange": [];
  "query": [];
  "submit": [];
  "update:open": [value: boolean];
  "update:password": [value: string];
  "update:quantity": [value: number];
  "update:recipientId": [value: string];
}>();

const avatarLoading = ref(false);
const avatarLoadError = ref(false);
const recipientInitial = computed(() => (props.recipientInfo?.name || "?").charAt(0));

watch(
  () => props.recipientInfo?.avatarUrl,
  (avatarUrl) => {
    avatarLoadError.value = false;
    avatarLoading.value = Boolean(avatarUrl);
  },
);

const updateRecipientId = (value: string | number) => {
  emit("update:recipientId", String(value).replace(/\D/g, ""));
  emit("inputChange");
};

const updatePassword = (value: string | number) => {
  emit("update:password", String(value));
  emit("inputChange");
};

const updateQuantity = (value: string | number) => {
  const nextValue = Number(value);
  if (Number.isFinite(nextValue))
    emit("update:quantity", nextValue);
};
</script>

<style scoped>
.gift-form,
.field-group {
  display: grid;
  gap: 8px;
}

.gift-form {
  gap: 18px;
}

.query-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: end;
  gap: 10px;
}

.query-button {
  min-width: 78px;
}

.spinner,
.avatar-spinner {
  animation: gift-spin 0.8s linear infinite;
}

.error-message {
  margin: -8px 0 0;
  color: var(--destructive);
  font-size: 12px;
}

.recipient-panel {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border);
  background: var(--muted);
}

.avatar-container {
  position: relative;
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
  color: var(--foreground);
  font-size: 24px;
  font-weight: 700;
}

.avatar-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-spinner {
  position: absolute;
  width: 24px;
  height: 24px;
  color: var(--muted-foreground);
}

.recipient-details h3 {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 650;
}

.recipient-details dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  margin: 0;
}

.recipient-details dt {
  color: var(--muted-foreground);
  font-size: 11px;
}

.recipient-details dd {
  margin: 2px 0 0;
  color: var(--foreground);
  font-size: 13px;
  font-weight: 550;
}

@keyframes gift-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 620px) {
  .query-grid {
    grid-template-columns: 1fr;
  }

  .recipient-panel {
    grid-template-columns: 1fr;
  }

  .recipient-details dl {
    grid-template-columns: 1fr;
  }
}
</style>
