<template>
  <Dialog :open="open && !showEditor && !showApplyDialog && !showReferencesDialog && !deleteTarget" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-3xl overflow-hidden p-0">
      <DialogHeader class="border-b border-border px-5 py-4 pr-14">
        <DialogTitle>任务模板管理</DialogTitle>
        <DialogDescription>本机已保存 {{ templates.length }} 个模板</DialogDescription>
      </DialogHeader>

      <div class="manager-toolbar">
        <div class="manager-actions">
          <Button size="sm" @click="openNewTemplate">
            <Plus :size="15"></Plus>
            新增模板
          </Button>
          <Button size="sm" variant="outline" @click="openApplyDialog">
            <ListChecks :size="15"></ListChecks>
            绑定模板
          </Button>
          <Button size="sm" variant="outline" @click="openReferencesDialog">
            <Users :size="15"></Users>
            账号引用
          </Button>
        </div>
        <div class="search-field">
          <Search :size="15"></Search>
          <Input aria-label="搜索模板" placeholder="搜索模板" v-model="searchQuery"></Input>
        </div>
      </div>

      <div class="template-list">
        <article v-for="template in filteredTemplates" :key="template.id" class="template-item">
          <div class="template-copy">
            <h3>{{ template.name }}</h3>
            <p>{{ template.id === SYSTEM_TEMPLATE_ID ? '系统预设 · 不可删除 · ' : '' }}已绑定 {{ bindingCount(template.id) }} 个账号</p>
            <p>
              创建于 {{ formatDate(template.createdAt) }}
              <span v-if="template.updatedAt"> · 更新于 {{ formatDate(template.updatedAt) }}</span>
            </p>
          </div>
          <div class="item-actions">
            <Button size="icon" title="复制模板" variant="ghost" :aria-label="`复制模板${template.name}`" @click="copyTemplate(template)"><Copy :size="15"></Copy></Button>
            <Button v-if="template.id === SYSTEM_TEMPLATE_ID" aria-label="恢复系统默认模板" size="icon" title="恢复默认" variant="ghost" @click="restoreDefault(template)"><RotateCcw :size="15"></RotateCcw></Button>
            <Button
              size="icon"
              variant="ghost"
              :aria-label="`编辑模板${template.name}`"
              :title="`编辑模板${template.name}`"
              @click="openEditTemplate(template)"
            >
              <Pencil :size="15"></Pencil>
            </Button>
            <Button
              v-if="template.id !== SYSTEM_TEMPLATE_ID"
              size="icon"
              variant="ghost"
              :aria-label="`删除模板${template.name}`"
              :disabled="bindingCount(template.id) > 0"
              :title="`删除模板${template.name}`"
              @click="deleteTarget = template"
            >
              <Trash2 :size="15"></Trash2>
            </Button>
          </div>
        </article>
        <div v-if="!filteredTemplates.length" class="empty-state">
          {{ searchQuery ? "没有匹配的模板" : "暂无模板" }}
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <BatchTaskSettingsDialog
    show-name
    save-label="保存模板"
    v-model:name="currentTemplateName"
    v-model:open="showEditor"
    :boss-times-options="bossTimesOptions"
    :formation-options="formationOptions"
    :impact-count="bindingCount(currentTemplateId || '')"
    :model-value="currentTemplate"
    :title="currentTemplateId ? '编辑任务模板' : '任务模板设置'"
    @save="saveTemplate"
    @update:model-value="Object.assign(currentTemplate, $event)"
  ></BatchTaskSettingsDialog>

  <Dialog v-model:open="showApplyDialog">
    <DialogContent class="max-h-[88vh] max-w-xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>绑定任务模板</DialogTitle>
        <DialogDescription>已选择 {{ selectedTokenIds.length }} 个账号</DialogDescription>
      </DialogHeader>

      <div class="dialog-form">
        <div class="field-row">
          <Label for="batch-template-select">选择模板</Label>
          <select id="batch-template-select" v-model="selectedTemplateId">
            <option disabled value="">请选择要应用的模板</option>
            <option v-for="template in templates" :key="template.id" :value="template.id">
              {{ template.name }}
            </option>
          </select>
        </div>

        <div class="account-selection">
          <div class="selection-heading">
            <Label>选择账号</Label>
            <label class="checkbox-label">
              <Checkbox
                :model-value="allTokensSelected ? true : someTokensSelected ? 'indeterminate' : false"
                @update:model-value="toggleAllTokens"
              ></Checkbox>
              <span>全选</span>
            </label>
          </div>

          <div v-if="groups.length" class="group-shortcuts">
            <span>分组</span>
            <button
              v-for="group in groups"
              :key="group.id"
              type="button"
              :style="{ borderColor: group.color, color: group.color }"
              @click="selectGroup(group)"
            >
              {{ group.name }}
            </button>
          </div>

          <div class="token-options">
            <label v-for="token in tokens" :key="token.id" class="token-option">
              <Checkbox
                :model-value="selectedTokenIds.includes(token.id)"
                @update:model-value="toggleToken(token.id, $event === true)"
              ></Checkbox>
              <span>{{ getTokenDisplayName(token) }}</span>
            </label>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="showApplyDialog = false">取消</Button>
        <Button :disabled="!selectedTemplateId || !selectedTokenIds.length" @click="applyTemplate">
          绑定模板
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog v-model:open="showReferencesDialog">
    <DialogContent class="max-h-[88vh] max-w-2xl overflow-hidden">
      <DialogHeader>
        <DialogTitle>账号模板引用</DialogTitle>
        <DialogDescription>共 {{ filteredReferences.length }} 个账号</DialogDescription>
      </DialogHeader>

      <div class="reference-filter">
        <Label for="batch-template-filter">按模板筛选</Label>
        <select id="batch-template-filter" v-model="selectedTemplateForFilter">
          <option value="">全部模板</option>
          <option v-for="template in templates" :key="template.id" :value="template.id">
            {{ template.name }}
          </option>
        </select>
      </div>

      <div class="reference-list">
        <div v-for="item in filteredReferences" :key="item.tokenId" class="reference-item">
          <strong>{{ item.tokenName }}</strong>
          <Badge :variant="item.templateId ? 'default' : 'secondary'">{{ item.templateName }}</Badge>
        </div>
        <div v-if="!filteredReferences.length" class="empty-state">暂无账号数据</div>
      </div>
    </DialogContent>
  </Dialog>

  <Dialog :open="Boolean(deleteTarget)" @update:open="!$event && (deleteTarget = null)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>删除任务模板</DialogTitle>
        <DialogDescription>确定删除“{{ deleteTarget?.name }}”吗？此操作不可撤销。</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="deleteTarget = null">取消</Button>
        <Button variant="destructive" @click="confirmDelete">删除</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { getTokenDisplayName } from "@/utils/roleTokenMetadata.js";
import { computed, reactive, ref, watch } from "vue";
import { Copy, ListChecks, Pencil, Plus, RotateCcw, Search, Trash2, Users } from "@lucide/vue";
import { createDefaultTemplateSettings, loadAccountTaskBinding, loadTaskTemplates, migrateTaskAccounts, saveAccountTaskBinding, saveTaskTemplates, SYSTEM_TEMPLATE_ID } from "@/utils/taskTemplateConfig";
import type { TaskTemplate } from "@/utils/taskTemplateConfig";
import BatchTaskSettingsDialog from "@/components/Batch/BatchTaskSettingsDialog.vue";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";

interface SelectOption {
  label: string;
  value: number;
}

type TaskSettings = ReturnType<typeof createDefaultTemplateSettings>;

interface BatchToken {
  id: string;
  name?: string;
}

interface TokenGroup {
  color: string;
  id: string;
  name: string;
  tokenIds?: string[];
}

interface AccountReference {
  templateId: string | null;
  templateName: string;
  tokenId: string;
  tokenName: string;
}

const props = defineProps<{
  bossTimesOptions: SelectOption[];
  formationOptions: SelectOption[];
  groups: TokenGroup[];
  open: boolean;
  tokens: BatchToken[];
}>();

const emit = defineEmits<{
  "notify": [notice: { text: string; type: "error" | "success" }];
  "update:open": [value: boolean];
}>();

const createDefaultSettings = createDefaultTemplateSettings;

const templates = ref<TaskTemplate[]>([]);
const searchQuery = ref("");
const showEditor = ref(false);
const showApplyDialog = ref(false);
const showReferencesDialog = ref(false);
const currentTemplateId = ref<string | null>(null);
const currentTemplateName = ref("");
const currentTemplate = reactive<TaskSettings>(createDefaultSettings());
const selectedTemplateId = ref("");
const selectedTokenIds = ref<string[]>([]);
const references = ref<AccountReference[]>([]);
const selectedTemplateForFilter = ref("");
const deleteTarget = ref<TaskTemplate | null>(null);

const filteredTemplates = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase();
  if (!query)
    return templates.value;
  return templates.value.filter((template) => template.name.toLocaleLowerCase().includes(query));
});

const allTokensSelected = computed(
  () => props.tokens.length > 0 && selectedTokenIds.value.length === props.tokens.length,
);
const someTokensSelected = computed(
  () => selectedTokenIds.value.length > 0 && selectedTokenIds.value.length < props.tokens.length,
);
const filteredReferences = computed(() => {
  if (!selectedTemplateForFilter.value)
    return references.value;
  return references.value.filter((item) => item.templateId === selectedTemplateForFilter.value);
});

const loadTemplates = () => {
  try {
    migrateTaskAccounts(props.tokens);
    templates.value = loadTaskTemplates();
  } catch (error) {
    console.error("Failed to load task templates:", error);
    templates.value = [];
    emit("notify", { text: "任务模板数据格式错误", type: "error" });
  }
};

const persistTemplates = () => {
  saveTaskTemplates(templates.value);
};

const bindingCount = (id: string) => props.tokens.filter((token) => loadAccountTaskBinding(token.id).templateId === id).length;
const copyTemplate = (template: TaskTemplate) => {
  resetEditor();
  currentTemplateName.value = `${template.name} · 副本`;
  Object.assign(currentTemplate, JSON.parse(JSON.stringify(template.settings)));
  showEditor.value = true;
};
const restoreDefault = (template: TaskTemplate) => {
  openEditTemplate(template);
  Object.assign(currentTemplate, createDefaultSettings());
};

const resetEditor = () => {
  currentTemplateId.value = null;
  currentTemplateName.value = "";
  Object.assign(currentTemplate, createDefaultSettings());
};

const openNewTemplate = () => {
  resetEditor();
  showEditor.value = true;
};

const openEditTemplate = (template: TaskTemplate) => {
  currentTemplateId.value = template.id;
  currentTemplateName.value = template.name;
  Object.assign(currentTemplate, createDefaultSettings(), template.settings);
  showEditor.value = true;
};

const saveTemplate = () => {
  const name = currentTemplateName.value.trim();
  if (!name) {
    emit("notify", { text: "请输入模板名称", type: "error" });
    return;
  }

  const existingIndex = templates.value.findIndex((template) => template.id === currentTemplateId.value);
  if (currentTemplateId.value && existingIndex >= 0) {
    templates.value[existingIndex] = {
      ...templates.value[existingIndex],
      name,
      settings: JSON.parse(JSON.stringify(currentTemplate)),
      updatedAt: new Date().toISOString(),
    };
    emit("notify", { text: `已更新模板“${name}”`, type: "success" });
  } else {
    templates.value.push({
      createdAt: new Date().toISOString(),
      id: `${Date.now()}`,
      name,
      settings: JSON.parse(JSON.stringify(currentTemplate)),
    });
    emit("notify", { text: `已保存模板“${name}”`, type: "success" });
  }

  persistTemplates();
  showEditor.value = false;
  resetEditor();
};

const openApplyDialog = () => {
  loadTemplates();
  selectedTemplateId.value = "";
  selectedTokenIds.value = [];
  showApplyDialog.value = true;
};

const toggleAllTokens = (checked: boolean | "indeterminate") => {
  selectedTokenIds.value = checked === true ? props.tokens.map((token) => token.id) : [];
};

const toggleToken = (tokenId: string, checked: boolean) => {
  const next = new Set(selectedTokenIds.value);
  if (checked)
    next.add(tokenId);
  else
    next.delete(tokenId);
  selectedTokenIds.value = [...next];
};

const selectGroup = (group: TokenGroup) => {
  const validIds = new Set(props.tokens.map((token) => token.id));
  selectedTokenIds.value = [
    ...new Set([
      ...selectedTokenIds.value,
      ...(group.tokenIds || []).filter((tokenId) => validIds.has(tokenId)),
    ]),
  ];
};

const applyTemplate = () => {
  const template = templates.value.find((item) => item.id === selectedTemplateId.value);
  if (!template || !selectedTokenIds.value.length) {
    emit("notify", { text: "请选择模板和要应用的账号", type: "error" });
    return;
  }

  selectedTokenIds.value.forEach((tokenId) => {
    const binding = loadAccountTaskBinding(tokenId);
    saveAccountTaskBinding(tokenId, { ...binding, templateId: template.id });
  });
  emit("notify", {
    text: `已绑定模板到 ${selectedTokenIds.value.length} 个账号，采购专属配置保留`,
    type: "success",
  });
  showApplyDialog.value = false;
};

const openReferencesDialog = () => {
  loadTemplates();
  selectedTemplateForFilter.value = "";
  references.value = props.tokens.map((token) => {
    try {
      const templateId = loadAccountTaskBinding(token.id).templateId;
      const template = templates.value.find((item) => item.id === templateId);
      return {
        templateId,
        templateName: template ? template.name : "模板已缺失，需重新绑定",
        tokenId: token.id,
        tokenName: getTokenDisplayName(token),
      };
    } catch (error) {
      console.error(`Failed to load settings for ${token.name}:`, error);
      return {
        templateId: null,
        templateName: "设置数据异常",
        tokenId: token.id,
        tokenName: getTokenDisplayName(token),
      };
    }
  });
  showReferencesDialog.value = true;
};

const confirmDelete = () => {
  if (!deleteTarget.value)
    return;
  if (deleteTarget.value.id === SYSTEM_TEMPLATE_ID || bindingCount(deleteTarget.value.id) > 0)
    return;
  const name = deleteTarget.value.name;
  templates.value = templates.value.filter((template) => template.id !== deleteTarget.value?.id);
  persistTemplates();
  deleteTarget.value = null;
  emit("notify", { text: `已删除模板“${name}”`, type: "success" });
};

const formatDate = (value: string) => new Date(value).toLocaleString();

watch(() => props.open, (isOpen) => {
  if (isOpen)
    loadTemplates();
});
defineExpose({ editTemplate: (id: string) => {
  loadTemplates();
  const template = templates.value.find((item) => item.id === id);
  if (template)
    openEditTemplate(template);
} });
</script>

<style scoped>
.manager-toolbar,
.manager-actions,
.search-field,
.template-item,
.item-actions,
.selection-heading,
.checkbox-label,
.group-shortcuts,
.token-option,
.reference-item {
  display: flex;
  align-items: center;
}

.manager-toolbar {
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

.manager-actions {
  flex-wrap: wrap;
  gap: 8px;
}

.search-field {
  position: relative;
  width: min(220px, 100%);
}

.search-field > svg {
  position: absolute;
  left: 10px;
  color: var(--muted-foreground);
}

.search-field input {
  padding-left: 32px;
}

.template-list,
.reference-list {
  min-height: 160px;
  overflow-y: auto;
}

.template-list {
  max-height: 55vh;
  padding: 8px 20px 20px;
}

.template-item {
  min-height: 68px;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border);
}

.template-copy {
  min-width: 0;
}

.template-copy h3,
.template-copy p {
  margin: 0;
}

.template-copy h3 {
  color: var(--foreground);
  font-size: 14px;
  font-weight: 600;
}

.template-copy p {
  margin-top: 4px;
  color: var(--muted-foreground);
  font-size: 11px;
}

.item-actions {
  flex: 0 0 auto;
  gap: 2px;
}

.item-actions button {
  width: 32px;
  height: 32px;
}

.empty-state {
  padding: 40px 16px;
  color: var(--muted-foreground);
  font-size: 13px;
  text-align: center;
}

.dialog-form,
.field-row,
.account-selection {
  display: grid;
  gap: 12px;
}

.field-row select,
.reference-filter select {
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--input);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--foreground);
  font: inherit;
  font-size: 13px;
}

.selection-heading {
  justify-content: space-between;
  gap: 12px;
}

.checkbox-label,
.token-option {
  gap: 8px;
  color: var(--foreground);
  font-size: 13px;
}

.group-shortcuts {
  flex-wrap: wrap;
  gap: 7px;
  padding: 10px 0;
  border-block: 1px solid var(--border);
}

.group-shortcuts > span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.group-shortcuts button {
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid;
  border-radius: var(--radius);
  background: transparent;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.token-options {
  display: grid;
  max-height: 260px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  overflow-y: auto;
  padding: 2px;
}

.token-option {
  min-width: 0;
  min-height: 38px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.token-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reference-filter {
  display: grid;
  grid-template-columns: auto minmax(160px, 220px);
  align-items: center;
  justify-content: end;
  gap: 10px;
}

.reference-list {
  max-height: 52vh;
  border-top: 1px solid var(--border);
}

.reference-item {
  min-height: 52px;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--border);
}

.reference-item strong {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .manager-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .search-field {
    width: 100%;
  }

  .token-options {
    grid-template-columns: 1fr;
  }

  .reference-filter {
    grid-template-columns: 1fr;
  }
}
</style>
