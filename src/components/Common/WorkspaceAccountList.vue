<template>
  <section aria-label="账号列表" class="account-directory">
    <div class="directory-heading">
      <span>账号</span>
      <small v-if="gameTokens.length" class="selection-summary" role="status">批量已选 {{ validSelectedCount }}/{{ gameTokens.length }}</small>
    </div>

    <div v-if="gameTokens.length" class="directory-tools">
      <div class="search-field">
        <Search :size="14"></Search>
        <Input
          aria-label="搜索账号"
          class="search-input"
          placeholder="搜索名称或区服"
          v-model="searchQuery"
        ></Input>
      </div>

      <div class="filter-row">
        <select aria-label="筛选账号分组" v-model="activeGroupId">
          <option value="">全部分组</option>
          <option
            v-for="group in tokenGroups"
            :key="group.id"
            :value="group.id"
          >
            {{ group.name }}
          </option>
        </select>
        <label class="select-all">
          <Checkbox
            :model-value="
              allVisibleSelected
                ? true
                : someVisibleSelected
                  ? 'indeterminate'
                  : false
            "
            @update:model-value="toggleVisibleTokens"
          ></Checkbox>
          <span>全选</span>
        </label>
      </div>

      <div class="connection-actions">
        <Button
          size="sm"
          :disabled="selectedTokens.length === 0 || connectionAction !== null"
          @click="connectSelected"
        >
          <LoaderCircle
            v-if="connectionAction === 'connect'"
            class="animate-spin"
          ></LoaderCircle>
          <Power v-else></Power>
          上线
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="selectedTokens.length === 0 || connectionAction !== null"
          @click="disconnectSelected"
        >
          <LoaderCircle
            v-if="connectionAction === 'disconnect'"
            class="animate-spin"
          ></LoaderCircle>
          <PowerOff v-else></PowerOff>
          下线
        </Button>
      </div>
    </div>

    <div v-if="filteredTokens.length" class="account-list">
      <article
        v-for="token in filteredTokens"
        :key="token.id"
        class="account-row"
        :class="{
          focused: selectedToken?.id === token.id,
          selected: batchSelectedTokenIds.includes(token.id),
        }"
      >
        <Checkbox
          :aria-label="`批量选择${getTokenDisplayName(token)}`"
          :model-value="batchSelectedTokenIds.includes(token.id)"
          @update:model-value="
            (value) => toggleBatchToken(token.id, value === true)
          "
        ></Checkbox>
        <button class="account-open" type="button" @click="openRole(token.id)">
          <img alt="" :src="token.avatar || '/icons/xiaoyugan.png'">
          <span class="account-copy">
            <strong>{{ getTokenDisplayName(token) }}</strong>
            <small>{{ token.server || "未标注区服" }}</small>
          </span>
          <span
            class="connection-dot"
            :class="connectionStatus(token.id)"
            :title="connectionStatusLabel(token.id)"
          ></span>
        </button>
      </article>
    </div>

    <div v-else class="directory-empty">
      <template v-if="gameTokens.length">没有匹配的账号</template>
      <template v-else>尚未导入账号</template>
    </div>

  </section>
</template>

<script setup lang="ts">
import { getTokenDisplayName } from "@/utils/roleTokenMetadata.js";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { LoaderCircle, Power, PowerOff, Search } from "@lucide/vue";
import { useMessage } from "naive-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  batchSelectedTokenIds,
  gameTokens,
  selectedToken,
  tokenGroups,
  useTokenStore,
} from "@/stores/tokenStore";

const emit = defineEmits<{
  navigate: [];
}>();

const router = useRouter();
const tokenStore = useTokenStore();
const message = useMessage();
const searchQuery = ref("");
const activeGroupId = ref("");
const connectionAction = ref<"connect" | "disconnect" | null>(null);

const filteredTokens = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase();
  const activeGroup = tokenGroups.value.find(
    (group) => group.id === activeGroupId.value,
  );
  const groupTokenIds = activeGroup
    ? new Set(activeGroup.tokenIds || [])
    : null;

  return gameTokens.value.filter((token) => {
    if (groupTokenIds && !groupTokenIds.has(token.id))
      return false;
    if (!query)
      return true;
    return [getTokenDisplayName(token), token.name, token.server].some((value) =>
      String(value || "")
        .toLocaleLowerCase()
        .includes(query),
    );
  });
});

const visibleTokenIds = computed(() =>
  filteredTokens.value.map((token) => token.id),
);
const allVisibleSelected = computed(
  () =>
    visibleTokenIds.value.length > 0
    && visibleTokenIds.value.every((tokenId) =>
      batchSelectedTokenIds.value.includes(tokenId),
    ),
);
const someVisibleSelected = computed(
  () =>
    !allVisibleSelected.value
    && visibleTokenIds.value.some((tokenId) =>
      batchSelectedTokenIds.value.includes(tokenId),
    ),
);
const validSelectedCount = computed(() => {
  const validIds = new Set(gameTokens.value.map((token) => token.id));
  return batchSelectedTokenIds.value.filter((tokenId) => validIds.has(tokenId))
    .length;
});
const selectedTokens = computed(() => {
  const selectedIds = new Set(batchSelectedTokenIds.value);
  return gameTokens.value.filter((token) => selectedIds.has(token.id));
});

const toggleVisibleTokens = (checked: boolean | "indeterminate") => {
  const selectedIds = new Set(batchSelectedTokenIds.value);
  visibleTokenIds.value.forEach((tokenId) => {
    if (checked === true)
      selectedIds.add(tokenId);
    else selectedIds.delete(tokenId);
  });
  batchSelectedTokenIds.value = [...selectedIds];
};

const toggleBatchToken = (tokenId: string, checked: boolean) => {
  const selectedIds = new Set(batchSelectedTokenIds.value);
  if (checked)
    selectedIds.add(tokenId);
  else selectedIds.delete(tokenId);
  batchSelectedTokenIds.value = [...selectedIds];
};

const openRole = async (tokenId: string) => {
  tokenStore.focusToken(tokenId);
  await router.push({ name: "RoleManagement" });
  emit("navigate");
};

const connectSelected = async () => {
  connectionAction.value = "connect";
  let startedCount = 0;
  try {
    for (const token of selectedTokens.value) {
      const status = tokenStore.getWebSocketStatus(token.id);
      if (status === "connected" || status === "connecting")
        continue;
      const client = await tokenStore.createWebSocketConnection(
        token.id,
        token.token,
        token.wsUrl,
      );
      if (client)
        startedCount++;
    }
    message.success(
      startedCount > 0
        ? `已启动 ${startedCount} 个账号连接`
        : "所选账号已在线或正在连接",
    );
  } finally {
    connectionAction.value = null;
  }
};

const disconnectSelected = () => {
  connectionAction.value = "disconnect";
  let stoppedCount = 0;
  selectedTokens.value.forEach((token) => {
    const status = tokenStore.getWebSocketStatus(token.id);
    if (status === "disconnected")
      return;
    tokenStore.closeWebSocketConnection(token.id);
    stoppedCount++;
  });
  message.success(
    stoppedCount > 0 ? `正在下线 ${stoppedCount} 个账号` : "所选账号均未上线",
  );
  connectionAction.value = null;
};

const connectionStatus = (tokenId: string) =>
  tokenStore.getWebSocketStatus(tokenId) || "disconnected";

const connectionStatusLabel = (tokenId: string) => {
  const labels: Record<string, string> = {
    connected: "已连接",
    connecting: "连接中",
    disconnecting: "断开中",
    disconnected: "未连接",
    error: "连接失败",
  };
  return labels[connectionStatus(tokenId)] || "未连接";
};
</script>

<style scoped>
.account-directory {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  border-top: 1px solid var(--border);
}

.directory-heading,
.filter-row,
.select-all,
.account-row,
.account-open {
  display: flex;
  align-items: center;
}

.directory-heading {
  min-height: 40px;
  padding: 0 14px;
  justify-content: space-between;
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 600;
}

.selection-summary {
  font-size: 11px;
  font-weight: 400;
  white-space: nowrap;
}

.directory-tools {
  display: grid;
  gap: 8px;
  padding: 0 12px 10px;
}

.search-field {
  position: relative;
}

.search-field > svg {
  position: absolute;
  top: 50%;
  left: 9px;
  z-index: 1;
  color: var(--muted-foreground);
  transform: translateY(-50%);
}

.search-input {
  height: 32px;
  padding-left: 32px !important;
  font-size: 12px;
}

.filter-row {
  gap: 8px;
}

.filter-row select {
  min-width: 0;
  height: 30px;
  flex: 1;
  padding: 0 8px;
  border: 1px solid var(--input);
  border-radius: var(--radius);
  outline: none;
  background: var(--background);
  color: var(--foreground);
  font-size: 11px;
}

.filter-row select:focus-visible {
  border-color: var(--ring);
}

.select-all {
  flex: 0 0 auto;
  gap: 5px;
  color: var(--muted-foreground);
  font-size: 11px;
}

.connection-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.connection-actions > button {
  width: 100%;
}

.account-list {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.account-row {
  min-width: 0;
  min-height: 56px;
  gap: 10px;
  padding: 7px 9px;
  border: 1px solid transparent;
  border-radius: var(--radius);
}

.account-row:hover {
  background: var(--muted);
}

.account-row.focused {
  border-color: var(--input);
  background: var(--background);
}

.account-row.selected:not(.focused) {
  background: color-mix(in srgb, var(--muted) 72%, transparent);
}

.account-open {
  min-width: 0;
  flex: 1;
  gap: 8px;
  padding: 2px 0;
  color: var(--foreground);
  text-align: left;
}

.account-open img {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  object-fit: cover;
  border-radius: 50%;
}

.account-copy {
  display: grid;
  min-width: 0;
  flex: 1;
}

.account-copy strong,
.account-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-copy strong {
  font-size: 12px;
  font-weight: 600;
}

.account-copy small {
  color: var(--muted-foreground);
  font-size: 10px;
}

.connection-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  background: var(--outline);
  border-radius: 50%;
}

.connection-dot.connected {
  background: var(--success);
}

.connection-dot.connecting,
.connection-dot.disconnecting {
  background: var(--warning);
}

.connection-dot.error {
  background: var(--destructive);
}

.directory-empty {
  display: grid;
  min-height: 90px;
  flex: 1;
  padding: 20px;
  place-items: center;
  color: var(--muted-foreground);
  font-size: 12px;
  text-align: center;
}
</style>
