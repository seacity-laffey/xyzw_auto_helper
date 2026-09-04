<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[90vh] max-w-4xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>分组管理</DialogTitle>
        <DialogDescription>
          创建账号分组，并维护每个分组包含的账号。
        </DialogDescription>
      </DialogHeader>

      <section class="manager-section">
        <h3>创建新分组</h3>
        <div class="create-row">
          <Input placeholder="输入分组名称" v-model="newGroupName"></Input>
          <div aria-label="新分组颜色" class="color-picker">
            <button
              v-for="color in groupColors"
              :key="color"
              class="color-swatch"
              type="button"
              :aria-label="`选择颜色 ${color}`"
              :aria-pressed="newGroupColor === color"
              :style="{ backgroundColor: color }"
              @click="newGroupColor = color"
            ></button>
          </div>
          <Button :disabled="!newGroupName.trim()" @click="createGroup">
            创建分组
          </Button>
        </div>

        <div class="account-picker">
          <div class="picker-heading">
            <strong>包含账号（{{ newGroupTokenIds.length }}）</strong>
            <span>
              <Button size="sm" variant="ghost" @click="selectAll">全选</Button>
              <Button size="sm" variant="ghost" @click="newGroupTokenIds = []">
                清空
              </Button>
            </span>
          </div>
          <div v-if="tokens.length" class="account-grid">
            <label v-for="token in tokens" :key="token.id" class="account-option">
              <Checkbox
                :model-value="newGroupTokenIds.includes(token.id)"
                @update:model-value="toggleNewGroupToken(token.id, $event === true)"
              ></Checkbox>
              <span>{{ token.name || token.id }}</span>
            </label>
          </div>
          <p v-else class="empty-state">尚未导入账号</p>
        </div>
      </section>

      <section class="manager-section">
        <h3>分组列表</h3>
        <div v-if="groups.length" class="group-list">
          <article v-for="group in groups" :key="group.id" class="group-item">
            <template v-if="editingGroupId === group.id">
              <div class="edit-row">
                <Input placeholder="分组名称" v-model="editingGroupName"></Input>
                <div aria-label="编辑分组颜色" class="color-picker">
                  <button
                    v-for="color in groupColors"
                    :key="color"
                    class="color-swatch compact"
                    type="button"
                    :aria-label="`选择颜色 ${color}`"
                    :aria-pressed="editingGroupColor === color"
                    :style="{ backgroundColor: color }"
                    @click="editingGroupColor = color"
                  ></button>
                </div>
                <Button size="sm" :disabled="!editingGroupName.trim()" @click="saveEdit">
                  保存
                </Button>
                <Button size="sm" variant="outline" @click="cancelEdit">取消</Button>
              </div>
            </template>

            <template v-else>
              <div class="group-heading">
                <div class="group-title">
                  <span class="group-color" :style="{ backgroundColor: group.color }"></span>
                  <strong>{{ group.name }}</strong>
                  <small>{{ validTokenIds(group.id).length }} 个账号</small>
                </div>
                <div class="group-actions">
                  <Button
                    size="icon"
                    variant="ghost"
                    :aria-label="`编辑${group.name}`"
                    :title="`编辑${group.name}`"
                    @click="startEdit(group)"
                  >
                    <Pencil></Pencil>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    :aria-label="`删除${group.name}`"
                    :title="`删除${group.name}`"
                    @click="pendingDeleteGroupId = group.id"
                  >
                    <Trash2></Trash2>
                  </Button>
                </div>
              </div>

              <div v-if="pendingDeleteGroupId === group.id" class="delete-confirm">
                <span>删除该分组？账号本身不会被删除。</span>
                <Button size="sm" variant="destructive" @click="confirmDelete(group)">
                  删除
                </Button>
                <Button size="sm" variant="ghost" @click="pendingDeleteGroupId = null">
                  取消
                </Button>
              </div>

              <div v-if="validTokenIds(group.id).length" class="member-list">
                <span
                  v-for="tokenId in validTokenIds(group.id)"
                  :key="tokenId"
                  class="member-chip"
                >
                  {{ tokenName(tokenId) }}
                  <button
                    type="button"
                    :aria-label="`从${group.name}移除${tokenName(tokenId)}`"
                    @click="removeToken(group.id, tokenId)"
                  >
                    <X></X>
                  </button>
                </span>
              </div>

              <select
                class="add-token-select"
                value=""
                :aria-label="`添加账号到${group.name}`"
                :disabled="availableTokens(group.id).length === 0"
                @change="addToken(group.id, $event)"
              >
                <option disabled value="">
                  {{ availableTokens(group.id).length ? "添加账号到分组" : "全部账号已加入" }}
                </option>
                <option
                  v-for="token in availableTokens(group.id)"
                  :key="token.id"
                  :value="token.id"
                >
                  {{ token.name || token.id }}
                </option>
              </select>
            </template>
          </article>
        </div>
        <p v-else class="empty-state">暂无分组</p>
      </section>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">关闭</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Pencil, Trash2, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { gameTokens, tokenGroups, useTokenStore } from "@/stores/tokenStore";

interface TokenGroup {
  color: string;
  id: string;
  name: string;
  tokenIds: string[];
}

defineProps<{ open: boolean }>();
const emit = defineEmits<{
  "notify": [payload: { text: string; type: "success" | "warning" }];
  "update:open": [value: boolean];
}>();

const tokenStore = useTokenStore();
const tokens = gameTokens;
const groups = tokenGroups;
const newGroupName = ref("");
const newGroupColor = ref("#315f86");
const newGroupTokenIds = ref<string[]>([]);
const editingGroupId = ref<string | null>(null);
const editingGroupName = ref("");
const editingGroupColor = ref("");
const pendingDeleteGroupId = ref<string | null>(null);
const groupColors = [
  "#315f86",
  "#2f7d4a",
  "#9a6700",
  "#b42318",
  "#6b4ea0",
  "#147d79",
  "#a63871",
  "#b55620",
];

const notify = (type: "success" | "warning", text: string) => {
  emit("notify", { type, text });
};

const validTokenIds = (groupId: string) =>
  tokenStore.getValidGroupTokenIds(groupId);

const tokenName = (tokenId: string) =>
  tokens.value.find((token) => token.id === tokenId)?.name || tokenId;

const availableTokens = (groupId: string) => {
  const existingIds = new Set(validTokenIds(groupId));
  return tokens.value.filter((token) => !existingIds.has(token.id));
};

const toggleNewGroupToken = (tokenId: string, checked: boolean) => {
  const selectedIds = new Set(newGroupTokenIds.value);
  if (checked)
    selectedIds.add(tokenId);
  else selectedIds.delete(tokenId);
  newGroupTokenIds.value = [...selectedIds];
};

const selectAll = () => {
  newGroupTokenIds.value = tokens.value.map((token) => token.id);
};

const createGroup = () => {
  const name = newGroupName.value.trim();
  if (!name) {
    notify("warning", "请输入分组名称");
    return;
  }

  const group = tokenStore.createTokenGroup(name, newGroupColor.value);
  newGroupTokenIds.value.forEach((tokenId) => {
    tokenStore.addTokenToGroup(group.id, tokenId);
  });
  newGroupName.value = "";
  newGroupColor.value = groupColors[0];
  newGroupTokenIds.value = [];
  notify("success", "分组创建成功");
};

const startEdit = (group: TokenGroup) => {
  editingGroupId.value = group.id;
  editingGroupName.value = group.name;
  editingGroupColor.value = group.color;
};

const cancelEdit = () => {
  editingGroupId.value = null;
  editingGroupName.value = "";
  editingGroupColor.value = "";
};

const saveEdit = () => {
  const name = editingGroupName.value.trim();
  if (!editingGroupId.value || !name) {
    notify("warning", "请输入分组名称");
    return;
  }
  tokenStore.updateTokenGroup(editingGroupId.value, {
    name,
    color: editingGroupColor.value,
  });
  cancelEdit();
  notify("success", "分组已更新");
};

const confirmDelete = (group: TokenGroup) => {
  tokenStore.deleteTokenGroup(group.id);
  pendingDeleteGroupId.value = null;
  notify("success", "分组已删除");
};

const addToken = (groupId: string, event: Event) => {
  const select = event.target as HTMLSelectElement;
  if (!select.value)
    return;
  tokenStore.addTokenToGroup(groupId, select.value);
  select.value = "";
  notify("success", "账号已添加到分组");
};

const removeToken = (groupId: string, tokenId: string) => {
  tokenStore.removeTokenFromGroup(groupId, tokenId);
  notify("success", "账号已从分组移除");
};
</script>

<style scoped>
.manager-section {
  display: grid;
  gap: 14px;
}

.manager-section + .manager-section {
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.manager-section h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
}

.create-row,
.edit-row,
.group-heading,
.group-title,
.group-actions,
.picker-heading,
.color-picker {
  display: flex;
  align-items: center;
}

.create-row,
.edit-row {
  flex-wrap: wrap;
  gap: 10px;
}

.create-row > :first-child,
.edit-row > :first-child {
  width: min(220px, 100%);
}

.color-picker {
  gap: 6px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border: 2px solid var(--background);
  border-radius: 4px;
  box-shadow: 0 0 0 1px var(--border);
}

.color-swatch.compact {
  width: 20px;
  height: 20px;
  flex-basis: 20px;
}

.color-swatch[aria-pressed="true"] {
  box-shadow: 0 0 0 2px var(--foreground);
}

.account-picker,
.group-item {
  padding: 12px;
  border: 1px solid var(--border);
  background: var(--muted);
}

.picker-heading,
.group-heading {
  justify-content: space-between;
  gap: 12px;
}

.picker-heading strong,
.group-title strong {
  font-size: 13px;
}

.account-grid {
  display: grid;
  max-height: 150px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
  margin-top: 10px;
  overflow-y: auto;
}

.account-option {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.account-option span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-list {
  display: grid;
  max-height: 430px;
  gap: 10px;
  overflow-y: auto;
}

.group-item {
  display: grid;
  gap: 10px;
  background: var(--background);
}

.group-title {
  min-width: 0;
  gap: 8px;
}

.group-title small {
  padding: 2px 6px;
  border: 1px solid var(--border);
  color: var(--muted-foreground);
  font-size: 11px;
}

.group-color {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  border-radius: 3px;
}

.group-actions {
  gap: 2px;
}

.delete-confirm {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--destructive) 35%, var(--border));
  background: color-mix(in srgb, var(--destructive) 6%, var(--background));
  color: var(--muted-foreground);
  font-size: 12px;
}

.group-actions svg {
  width: 15px;
  height: 15px;
}

.member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.member-chip {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border: 1px solid var(--border);
  background: var(--background);
  font-size: 12px;
}

.member-chip button {
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  color: var(--muted-foreground);
}

.member-chip svg {
  width: 12px;
  height: 12px;
}

.add-token-select {
  width: min(240px, 100%);
  height: 34px;
  padding: 0 9px;
  border: 1px solid var(--input);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--foreground);
  font: inherit;
  font-size: 12px;
}

.empty-state {
  margin: 0;
  padding: 20px;
  color: var(--muted-foreground);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 640px) {
  .account-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
