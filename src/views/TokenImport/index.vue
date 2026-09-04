<template>
  <div class="min-h-[calc(100vh-56px)] bg-background py-6 pb-10 max-md:py-3 max-md:pb-6">
    <div class="mx-auto w-full max-w-[1480px] px-6 max-md:px-3">
      <!-- Token导入区域 -->
      <Dialog v-model:open="showImportForm">
        <DialogContent class="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加游戏 Token</DialogTitle>
            <DialogDescription class="sr-only">选择一种 Token 导入方式</DialogDescription>
          </DialogHeader>
          <div class="mb-8 flex justify-center max-md:mb-5">
            <!-- 导入方式选择 -->
            <div class="flex overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest max-md:hidden">
              <button
                v-for="option in importMethodOptions"
                :key="option.value"
                class="border-r border-outline-variant px-3 py-2 text-body-sm font-medium transition-colors last:border-r-0"
                type="button"
                :class="importMethod === option.value ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
                @click="importMethod = option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <select
              aria-label="Token 导入方式"
              class="hidden w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary max-md:block"
              v-model="importMethod"
            >
              <option v-for="option in importMethodOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div>
            <ManualTokenForm
              v-if="importMethod === 'manual'"
              @cancel="() => (showImportForm = false)"
              @ok="() => (showImportForm = false)"
            ></ManualTokenForm>
            <WxQrcodeForm
              v-if="importMethod === 'wxQrcode'"
              @cancel="() => (showImportForm = false)"
              @ok="() => (showImportForm = false)"
            ></WxQrcodeForm>
            <BinTokenForm
              v-if="importMethod === 'bin'"
              @cancel="() => (showImportForm = false)"
              @ok="() => (showImportForm = false)"
            ></BinTokenForm>
            <single-bin-token-form
              v-if="importMethod === 'singlebin'"
              @cancel="() => (showImportForm = false)"
              @ok="() => (showImportForm = false)"
            ></single-bin-token-form>
          </div>
        </DialogContent>
      </Dialog>

      <!-- Token列表 -->
      <div
        v-if="tokenStore.hasTokens"
        class="rounded-md border border-border bg-background p-6 max-md:p-3"
        data-testid="token-management-panel"
      >
        <div class="mb-8 flex flex-wrap items-center justify-between gap-4 max-md:mb-5" data-testid="token-list-header">
          <div class="flex items-center gap-6 max-md:w-full max-md:items-start max-md:justify-between max-md:gap-3">
            <h2 class="m-0 text-headline-md font-bold text-on-surface max-md:text-lg">
              我的Token列表 ({{ tokenStore.gameTokens.length }}个)
            </h2>
            <div class="flex overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest">
              <button
                class="border-r border-outline-variant px-4 py-1.5 text-body-sm font-medium transition-colors"
                type="button"
                :class="
                  viewMode === 'list'
                    ? 'bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                "
                @click="viewMode = 'list'"
              >
                列表
              </button>
              <button
                class="px-4 py-1.5 text-body-sm font-medium transition-colors"
                type="button"
                :class="
                  viewMode === 'card'
                    ? 'bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                "
                @click="viewMode = 'card'"
              >
                卡片
              </button>
            </div>
          </div>
          <div aria-label="Token 排序" class="ml-auto flex items-center max-xl:order-3 max-xl:w-full max-xl:overflow-x-auto" data-testid="token-sort-controls">
            <div class="flex min-w-max overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest">
              <button
                class="flex items-center gap-1 border-r border-outline-variant px-3 py-1.5 text-body-sm font-medium transition-colors"
                type="button"
                :class="sortConfig.field === 'name' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
                @click="toggleSort('name')"
              >
                名称 {{ getSortIcon("name") }}
              </button>
              <button
                class="border-r border-outline-variant px-3 py-1.5 text-body-sm font-medium transition-colors"
                type="button"
                :class="sortConfig.field === 'server' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
                @click="toggleSort('server')"
              >
                服务器 {{ getSortIcon("server") }}
              </button>
              <button
                class="border-r border-outline-variant px-3 py-1.5 text-body-sm font-medium transition-colors"
                type="button"
                :class="sortConfig.field === 'createdAt' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
                @click="toggleSort('createdAt')"
              >
                创建时间 {{ getSortIcon("createdAt") }}
              </button>
              <button
                class="px-3 py-1.5 text-body-sm font-medium transition-colors"
                type="button"
                :class="sortConfig.field === 'lastUsed' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
                @click="toggleSort('lastUsed')"
              >
                最后使用 {{ getSortIcon("lastUsed") }}
              </button>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 max-md:grid max-md:w-full max-md:grid-cols-2" data-testid="token-header-actions">
            <button
              v-if="!showImportForm"
              class="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-label-sm font-semibold text-on-primary transition-[filter] hover:brightness-110"
              type="button"
              @click="showImportForm = true"
            >
              <AddIcon class="h-4 w-4"></AddIcon>
              添加 Token
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <button
                  class="flex items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface-container-high px-4 py-2 text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-highest max-md:w-full"
                  type="button"
                >
                  <MenuIcon class="h-4 w-4"></MenuIcon>
                  批量操作
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>批量操作</DropdownMenuLabel>
                <DropdownMenuSeparator></DropdownMenuSeparator>
                <DropdownMenuItem
                  v-for="option in bulkOptions"
                  :key="option.key"
                  :class="{ 'text-destructive': option.key === 'clear' }"
                  @select="handleBulkAction(option.key)"
                >
                  {{ option.label }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div v-if="viewMode === 'card'" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article
            v-for="(token, index) in sortedTokens"
            :key="token.id"
            class="overflow-hidden rounded-md border border-outline-variant bg-background transition-colors hover:border-input"
            data-testid="token-card"
            draggable="true"
            @dragover="handleDragOver($event)"
            @dragstart="handleDragStart(index, $event)"
            @drop="handleDrop(index, $event)"
          >
            <header class="flex items-center justify-between gap-4 border-b border-outline-variant px-5 py-4">
              <div class="flex min-w-0 items-center gap-3">
                <img
                  class="h-10 w-10 shrink-0 rounded-full border border-outline-variant object-cover"
                  :alt="`${token.name}头像`"
                  :src="token.avatar || '/icons/xiaoyugan.png'"
                >
                <div class="min-w-0">
                  <div class="flex min-w-0 items-center gap-2">
                    <strong class="truncate text-base font-bold text-on-surface">{{ token.name }}</strong>
                    <span v-if="token.server" class="shrink-0 rounded border border-outline-variant px-2 py-0.5 font-mono text-[11px] text-primary">
                      {{ token.server }}
                    </span>
                  </div>
                  <div class="mt-1 flex items-center gap-2 text-xs text-on-surface-variant">
                    <span
                      class="h-2 w-2 rounded-full"
                      :class="getConnectionStatus(token.id) === 'connected' ? 'bg-primary' : getConnectionStatus(token.id) === 'connecting' || getConnectionStatus(token.id) === 'disconnecting' ? 'bg-tertiary' : 'bg-error'"
                    ></span>
                    {{ getConnectionStatusText(token.id) }}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button aria-label="更多操作" class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-primary" type="button" @click.stop>
                    <EllipsisHorizontal class="h-5 w-5"></EllipsisHorizontal>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <template v-for="action in getTokenActions(token)" :key="action.key || 'separator'">
                    <DropdownMenuSeparator v-if="action.type === 'divider'"></DropdownMenuSeparator>
                    <DropdownMenuItem
                      v-else
                      :class="{ 'text-destructive': action.key === 'delete' }"
                      @select="handleTokenAction(action.key, token)"
                    >
                      <component :is="action.icon" class="h-4 w-4"></component>
                      {{ action.label }}
                    </DropdownMenuItem>
                  </template>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>

            <div class="space-y-4 p-5">
              <div class="flex min-w-0 items-center gap-2 rounded-md bg-surface-container px-3 py-2">
                <span class="shrink-0 text-xs font-medium text-on-surface-variant">Token:</span>
                <code class="truncate font-mono text-xs text-on-surface">{{ maskToken(token.token) }}</code>
              </div>

              <!-- 备注信息 -->
              <div
                v-if="editingRemark === token.id"
                class="flex items-start gap-2 rounded-md border border-primary bg-surface-container p-3"
                @click.stop
              >
                <span class="shrink-0 text-body-sm font-medium text-on-surface">备注：</span>
                <textarea
                  autofocus
                  class="min-w-0 flex-1 resize-none rounded border border-outline-variant bg-surface-container-lowest px-2 py-1 text-body-sm text-on-surface outline-none focus:border-primary"
                  placeholder="添加备注信息..."
                  rows="2"
                  v-model="tempRemarks[token.id]"
                  @blur="saveRemark(token)"
                  @keyup.enter="saveRemark(token)"
                  @keyup.esc="cancelEditRemark()"
                ></textarea>
              </div>
              <button
                v-else
                class="flex w-full items-center gap-2 rounded-md bg-surface-container px-3 py-2 text-left text-body-sm text-on-surface-variant hover:text-primary"
                type="button"
                @click.stop="startEditRemark(token)"
              >
                <span class="shrink-0 font-medium text-on-surface">备注：</span>
                <span class="min-w-0 flex-1 truncate">{{ token.remark || "点击添加备注" }}</span>
                <Create class="h-4 w-4 shrink-0"></Create>
              </button>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                  <span class="text-xs text-on-surface-variant">创建：</span>
                  <span class="text-xs text-on-surface">{{ formatTime(token.createdAt) }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs text-on-surface-variant">使用：</span>
                  <span class="text-xs text-on-surface">{{ formatTime(token.lastUsed) }}</span>
                </div>
              </div>

              <!-- 存储类型信息 -->
              <div class="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-4">
                <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
                  <span>存储类型：</span>
                  <span :class="isPermanentToken(token) ? 'text-primary' : 'text-tertiary'">
                    {{ isPermanentToken(token) ? "长期有效" : "临时存储" }}
                  </span>
                </div>
                <button
                  v-if="!isPermanentToken(token)"
                  class="flex items-center gap-1 text-xs font-semibold text-tertiary hover:underline"
                  type="button"
                  @click.stop="upgradeTokenToPermanent(token)"
                >
                  <Star class="h-4 w-4"></Star>
                  升级为长期有效
                </button>
              </div>
            </div>
          </article>
        </div>

        <!-- List View -->
        <div v-else class="space-y-3" data-testid="token-account-list">
          <article
            v-for="(token, index) in sortedTokens"
            :key="token.id"
            class="group flex items-center justify-between gap-6 rounded-md border border-[color-mix(in_srgb,var(--outline-variant)_72%,transparent)] bg-background px-6 py-5 transition-colors hover:border-input max-xl:flex-col max-xl:items-stretch max-xl:gap-4 max-md:px-4 max-md:py-4"
            data-testid="token-account-row"
            draggable="true"
            @dragover="handleDragOver($event)"
            @dragstart="handleDragStart(index, $event)"
            @drop="handleDrop(index, $event)"
          >
            <div class="flex min-w-0 flex-1 items-center gap-12 max-xl:w-full max-md:grid max-md:grid-cols-[88px_minmax(0,1fr)] max-md:gap-x-3 max-md:gap-y-4">
              <div class="flex min-w-[100px] items-center gap-2 text-body-sm font-medium text-on-surface max-md:min-w-0 max-md:text-xs">
                <span
                  class="h-2 w-2 shrink-0 rounded-full"
                  :class="
                    getConnectionStatus(token.id) === 'connected'
                      ? 'bg-primary'
                      : getConnectionStatus(token.id) === 'connecting' || getConnectionStatus(token.id) === 'disconnecting'
                        ? 'bg-tertiary'
                        : 'bg-error'
                  "
                ></span>
                <span>{{ getConnectionStatusText(token.id) }}</span>
              </div>

              <div class="flex min-w-[210px] items-center gap-4 max-md:min-w-0">
                <img
                  class="h-10 w-10 shrink-0 rounded-full border border-outline-variant object-cover"
                  :alt="`${token.name}头像`"
                  :src="token.avatar || '/icons/xiaoyugan.png'"
                >
                <div class="flex min-w-0 items-center gap-2">
                  <strong class="max-w-28 truncate text-[15px] font-bold text-on-surface">{{ token.name }}</strong>
                  <span
                    v-if="token.server"
                    class="shrink-0 rounded border px-2 py-0.5 font-mono text-[11px] leading-[1.4]"
                    :class="
                      getConnectionStatus(token.id) === 'connected'
                        ? 'border-[color-mix(in_srgb,var(--primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary'
                        : 'border-[color-mix(in_srgb,var(--error)_24%,transparent)] bg-[color-mix(in_srgb,var(--error)_10%,transparent)] text-error'
                    "
                  >
                    {{ token.server }}
                  </span>
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
                  @keyup.esc="cancelEditRemark()"
                >
                <button
                  v-else
                  class="flex min-w-0 max-w-full items-center gap-1 text-body-sm text-on-surface-variant transition-colors hover:text-primary"
                  type="button"
                  @click="startEditRemark(token)"
                >
                  <DocumentIcon class="h-4 w-4 shrink-0"></DocumentIcon>
                  <span class="truncate">{{ token.remark || "点击添加备注" }}</span>
                  <Create class="h-3 w-3 shrink-0"></Create>
                </button>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-3 max-xl:w-full max-xl:justify-end max-md:justify-start max-md:gap-2" @click.stop>
              <button
                v-if="!isPermanentToken(token)"
                class="min-w-14 px-2 text-center text-body-sm font-semibold text-tertiary hover:underline max-md:px-0 max-md:text-left"
                type="button"
                @click="upgradeTokenToPermanent(token)"
              >
                临时 · 升级
              </button>
              <span v-else class="min-w-14 px-2 text-center text-body-sm font-semibold text-primary max-md:px-0 max-md:text-left">长期</span>

              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    aria-label="更多操作"
                    class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                    type="button"
                  >
                    <EllipsisHorizontal class="h-5 w-5"></EllipsisHorizontal>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <template v-for="action in getTokenActions(token)" :key="action.key || 'separator'">
                    <DropdownMenuSeparator v-if="action.type === 'divider'"></DropdownMenuSeparator>
                    <DropdownMenuItem
                      v-else
                      :class="{ 'text-destructive': action.key === 'delete' }"
                      @select="handleTokenAction(action.key, token)"
                    >
                      <component :is="action.icon" class="h-4 w-4"></component>
                      {{ action.label }}
                    </DropdownMenuItem>
                  </template>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </article>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-if="!tokenStore.hasTokens && !showImportForm"
        class="flex min-h-[clamp(360px,62vh,620px)] flex-col items-center justify-center rounded-md border border-dashed border-border bg-background px-6 py-12 text-center max-md:min-h-[calc(100vh-110px)] max-md:px-5 max-md:py-9"
      >
        <div aria-hidden="true" class="mb-5 grid h-14 w-14 place-items-center rounded-md border border-border bg-muted text-foreground">
          <KeyIcon class="h-6 w-6"></KeyIcon>
        </div>
        <h2 class="m-0 text-2xl font-bold text-on-surface">暂无 Token</h2>
        <p class="mb-6 mt-2.5 max-w-[420px] text-body-sm text-on-surface-variant">添加 Token 后即可管理单个角色或执行批量任务</p>
        <button
          class="flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-label-sm font-semibold text-on-primary hover:brightness-110"
          type="button"
          @click="openshowImportForm"
        >
          <AddIcon class="h-4 w-4"></AddIcon>
          添加 Token
        </button>
      </div>
    </div>

    <!-- 编辑Token模态框 -->
    <Dialog v-model:open="showEditModal">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑 Token</DialogTitle>
          <DialogDescription class="sr-only">编辑当前 Token 的账号和连接信息</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" @submit.prevent="saveEdit">
          <div class="grid gap-2">
            <Label for="token-name">名称</Label>
            <Input id="token-name" required v-model="editForm.name"></Input>
          </div>
          <div class="grid gap-2">
            <Label for="token-value">Token 字符串</Label>
            <Textarea id="token-value" required placeholder="粘贴 Token 字符串..." rows="3" v-model="editForm.token"></Textarea>
          </div>
          <div class="grid gap-2 sm:grid-cols-2">
            <div class="grid gap-2">
              <Label for="token-server">服务器</Label>
              <Input id="token-server" v-model="editForm.server"></Input>
            </div>
            <div class="grid gap-2">
              <Label for="token-ws-url">WebSocket 地址</Label>
              <Input id="token-ws-url" v-model="editForm.wsUrl"></Input>
            </div>
          </div>
          <div class="grid gap-2">
            <Label for="token-remark">备注</Label>
            <Textarea id="token-remark" placeholder="添加备注信息..." rows="2" v-model="editForm.remark"></Textarea>
          </div>
          <DialogFooter class="mt-2">
            <Button type="button" variant="outline" @click="showEditModal = false">取消</Button>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
import ManualTokenForm from "./manual.vue";
import BinTokenForm from "./bin.vue";
import singleBinTokenForm from "./singlebin.vue";
import WxQrcodeForm from "./wxqrcode.vue";

import { useTokenStore } from "@/stores/tokenStore";
import {
  Plus as AddIcon,
  Copy,
  Pencil as Create,
  FileText as DocumentIcon,
  Ellipsis as EllipsisHorizontal,
  KeyRound as KeyIcon,
  Menu as MenuIcon,
  Star,
  Trash2 as TrashBin,
} from "@lucide/vue";
import { useDialog, useMessage } from "naive-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

// 接收路由参数
const props = defineProps({
  token: String,
  name: String,
  server: String,
  wsUrl: String,
  api: String,
  auto: Boolean,
});
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const tokenStore = useTokenStore();

// 响应式数据
const showImportForm = ref(false);
const isImporting = ref(false);
const showEditModal = ref(false);
const editingToken = ref(null);
const importMethod = ref("manual");
// 从localStorage读取上次的视图模式，默认为列表视图
const viewMode = ref(localStorage.getItem("tokenViewMode") || "list");
const importMethodOptions = [
  { label: "手动输入", value: "manual" },
  { label: "微信扫码", value: "wxQrcode" },
  { label: "BIN 多角色", value: "bin" },
  { label: "BIN 单角色", value: "singlebin" },
];
const dragIndex = ref(null);

// 备注编辑状态管理
const editingRemark = ref(null); // 当前正在编辑备注的tokenId
const tempRemarks = ref({}); // 临时保存编辑中的备注内容

// 监听视图模式变化，保存到localStorage
watch(viewMode, (newViewMode) => {
  localStorage.setItem("tokenViewMode", newViewMode);
});

// 排序状态管理 - 从localStorage读取上次的排序设置
const savedSortConfig = localStorage.getItem("tokenSortConfig");
const sortConfig = ref(
  savedSortConfig
    ? JSON.parse(savedSortConfig)
    : {
        field: "createdAt", // 排序字段：name, server, createdAt, lastUsed
        direction: "asc", // 排序方向：asc, desc
      },
);

// 排序后的游戏角色Token列表
const sortedTokens = computed(() => {
  if (sortConfig.value.field === "manual") {
    return tokenStore.gameTokens;
  }

  return [...tokenStore.gameTokens].sort((tokenA, tokenB) => {
    let valueA, valueB;

    // 根据排序字段获取比较值
    switch (sortConfig.value.field) {
      case "name":
        valueA = tokenA.name?.toLowerCase() || "";
        valueB = tokenB.name?.toLowerCase() || "";
        break;
      case "server":
        valueA = tokenA.server?.toLowerCase() || "";
        valueB = tokenB.server?.toLowerCase() || "";
        break;
      case "createdAt":
        valueA = new Date(tokenA.createdAt || 0).getTime();
        valueB = new Date(tokenB.createdAt || 0).getTime();
        break;
      case "lastUsed":
        valueA = new Date(tokenA.lastUsed || 0).getTime();
        valueB = new Date(tokenB.lastUsed || 0).getTime();
        break;
      default:
        valueA = tokenA.name?.toLowerCase() || "";
        valueB = tokenB.name?.toLowerCase() || "";
    }

    // 根据排序方向比较值
    if (valueA < valueB) {
      return sortConfig.value.direction === "asc" ? -1 : 1;
    }
    if (valueA > valueB) {
      return sortConfig.value.direction === "asc" ? 1 : -1;
    }
    return 0;
  });
});

const isPermanentToken = (token) =>
  ["url", "bin", "wxQrcode"].includes(token.importMethod)
  || token.upgradedToPermanent;

// 切换排序
const toggleSort = (field) => {
  if (sortConfig.value.field === field) {
    // 如果点击的是当前排序字段，则切换排序方向
    sortConfig.value.direction
      = sortConfig.value.direction === "asc" ? "desc" : "asc";
  } else {
    // 如果点击的是新的排序字段，则默认升序
    sortConfig.value.field = field;
    sortConfig.value.direction = "asc";
  }

  // 保存排序设置到localStorage
  localStorage.setItem("tokenSortConfig", JSON.stringify(sortConfig.value));
};

// 获取排序图标
const getSortIcon = (field) => {
  if (sortConfig.value.field !== field)
    return null;
  return sortConfig.value.direction === "asc" ? "↑" : "↓";
};

const handleDragStart = (index, event) => {
  dragIndex.value = index;
  event.dataTransfer.effectAllowed = "move";
  // 可以在这里设置拖拽时的预览图等
};

const handleDragOver = (event) => {
  event.preventDefault(); // 允许放置
  event.dataTransfer.dropEffect = "move";
};

const handleDrop = (index, event) => {
  event.preventDefault();
  if (dragIndex.value === null || dragIndex.value === index)
    return;

  // 使用当前显示的列表（sortedTokens）来进行重新排序
  // 这样可以确保用户看到的顺序就是最终保存的顺序
  const currentTokens = [...sortedTokens.value];
  const draggedItem = currentTokens[dragIndex.value];

  // 移动元素
  currentTokens.splice(dragIndex.value, 1);
  currentTokens.splice(index, 0, draggedItem);

  // 更新 store
  tokenStore.gameTokens = currentTokens;

  // 切换到手动排序模式，防止自动排序打乱顺序
  sortConfig.value.field = "manual";
  // 保存排序设置
  localStorage.setItem("tokenSortConfig", JSON.stringify(sortConfig.value));

  dragIndex.value = null;
  message.success("Token 顺序已更新");
};

// 编辑表单
const editForm = reactive({
  name: "",
  token: "",
  server: "",
  wsUrl: "",
  remark: "",
});

const bulkOptions = [
  { label: "导出所有Token", key: "export" },
  { label: "导入Token文件", key: "import" },
  { label: "清除所有Token", key: "clear" },
];

/**
 * 手动打开Token管理卡片
 */
const openshowImportForm = () => {
  showImportForm.value = true;
};

// 升级Token为长期有效
const upgradeTokenToPermanent = (token) => {
  dialog.warning({
    title: "升级为长期有效",
    content: `确认要将Token "${token.name}" 升级为长期有效吗？升级后该Token将不会因24小时未使用而被自动清理。`,
    positiveText: "确认升级",
    negativeText: "取消",
    onPositiveClick: () => {
      const success = tokenStore.upgradeTokenToPermanent(token.id);
      if (success) {
        message.success(`Token "${token.name}" 已升级为长期有效！`);
      } else {
        message.error("升级失败，该Token可能已经是长期有效状态");
      }
    },
  });
};

const getConnectionStatus = (tokenId) => {
  return tokenStore.getWebSocketStatus(tokenId);
};

const getConnectionStatusText = (tokenId) => {
  const status = getConnectionStatus(tokenId);
  const statusMap = {
    connected: "已连接",
    connecting: "连接中...",
    disconnected: "已断开",
    error: "连接错误",
    disconnecting: "断开中...",
  };
  return statusMap[status] || "未连接";
};

const getTokenActions = () => {
  return [
    {
      label: "编辑",
      key: "edit",
      icon: Create,
    },
    {
      label: "复制Token",
      key: "copy",
      icon: Copy,
    },
    { type: "divider" },
    {
      label: "删除",
      key: "delete",
      icon: TrashBin,
    },
  ];
};

const handleTokenAction = async (key, token) => {
  switch (key) {
    case "edit":
      editToken(token);
      break;
    case "copy":
      copyToken(token);
      break;
    case "delete":
      deleteToken(token);
      break;
  }
};

const editToken = (token) => {
  editingToken.value = token;
  Object.assign(editForm, {
    name: token.name,
    token: token.token,
    server: token.server || "",
    wsUrl: token.wsUrl || "",
    remark: token.remark || "",
  });
  showEditModal.value = true;
};

const saveEdit = async () => {
  if (!editingToken.value)
    return;
  if (!editForm.name.trim() || !editForm.token.trim()) {
    message.warning("名称和 Token 字符串不能为空");
    return;
  }

  tokenStore.updateToken(editingToken.value.id, {
    name: editForm.name,
    token: editForm.token,
    server: editForm.server,
    wsUrl: editForm.wsUrl,
    remark: editForm.remark,
  });

  message.success("Token信息已更新");
  showEditModal.value = false;
  editingToken.value = null;
};

const copyToken = async (token) => {
  try {
    await navigator.clipboard.writeText(token.token);
    message.success("Token已复制到剪贴板");
  } catch (error) {
    message.error("复制失败");
  }
};

// 快速编辑备注功能
const startEditRemark = (token) => {
  editingRemark.value = token.id;
  tempRemarks.value[token.id] = token.remark || "";
};

// 保存备注的通用函数
const saveCurrentRemark = () => {
  if (!editingRemark.value)
    return;

  const editingTokenId = editingRemark.value;
  const remark = tempRemarks.value[editingTokenId] || "";
  tokenStore.updateToken(editingTokenId, {
    remark,
  });
  editingRemark.value = null;
  message.success("备注已保存");
};

const saveRemark = (token) => {
  saveCurrentRemark();
};

const cancelEditRemark = () => {
  editingRemark.value = null;
};

const deleteToken = (token) => {
  dialog.warning({
    title: "删除Token",
    content: `确定要删除Token "${token.name}" 吗？此操作无法恢复。`,
    positiveText: "确定删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      await tokenStore.removeToken(token.id);
      message.success("Token已删除");
    },
  });
};

const handleBulkAction = (key) => {
  switch (key) {
    case "export":
      exportTokens();
      break;
    case "import":
      importTokenFile();
      break;
    case "clear":
      clearAllTokens();
      break;
  }
};

const exportTokens = () => {
  try {
    const data = tokenStore.exportTokens();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = `tokens_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();

    message.success("Token数据已导出");
  } catch (error) {
    message.error("导出失败");
  }
};

const importTokenFile = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const result = tokenStore.importTokens(data);
          if (result.success) {
            message.success(result.message);
          } else {
            message.error(result.message);
          }
        } catch (error) {
          message.error("文件格式错误");
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
};

const clearAllTokens = () => {
  dialog.error({
    title: "清除所有Token",
    content: "确定要清除所有Token吗？此操作无法恢复！",
    positiveText: "确定清除",
    negativeText: "取消",
    onPositiveClick: async () => {
      await tokenStore.clearAllTokens();
      message.success("所有Token已清除");
    },
  });
};

const maskToken = (token) => {
  if (!token)
    return "";
  const len = token.length;
  if (len <= 8)
    return token;
  return `${token.substring(0, 4)}***${token.substring(len - 4)}`;
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString("zh-CN");
};

// URL参数处理函数
const handleUrlParams = async () => {
  // 检查是否通过URL传递了token参数
  if (props.token || props.api) {
    try {
      isImporting.value = true;
      let tokenResult = null;

      if (props.api) {
        // 通过API获取token
        // 降噪
        message.info("正在从API获取token...");

        const response = await fetch(props.api, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          mode: "cors",
        });

        if (!response.ok) {
          throw new Error(
            `API请求失败: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (!data.token) {
          throw new Error("API返回数据中未找到token字段");
        }

        // 使用API获取的token
        tokenResult = tokenStore.importBase64Token(
          props.name || data.name || "通过API导入的Token",
          data.token,
          {
            server: props.server || data.server,
            wsUrl: props.wsUrl,
            sourceUrl: props.api,
            importMethod: "url",
          },
        );
      } else if (props.token) {
        // 直接使用URL中的token
        // 降噪
        message.info("正在导入token...");

        tokenResult = tokenStore.importBase64Token(
          props.name || "通过URL导入的Token",
          props.token,
          {
            server: props.server,
            wsUrl: props.wsUrl,
            importMethod: "url",
          },
        );
      }

      if (tokenResult && tokenResult.success) {
        message.success(`Token "${tokenResult.tokenName}" 导入成功！`);

        // 如果 auto=true，聚焦新账号并进入详情，但不自动连接。
        if (props.auto && tokenResult.token) {
          tokenStore.focusToken(tokenResult.token.id);
          message.success("正在进入账号详情...");
          setTimeout(() => {
            router.push("/admin/game-features");
          }, 1500);
        } else {
          // 清除URL参数，避免重复处理
          router.replace("/tokens");
        }
      } else {
        throw new Error(tokenResult?.message || "Token导入失败");
      }
    } catch (error) {
      console.error("URL参数处理失败:", error);
      message.error(`导入失败: ${error.message}`);
      // 清除URL参数
      router.replace("/tokens");
    } finally {
      isImporting.value = false;
    }
  }
};

// 监听路由参数变化
watch(() => [props.token, props.api], handleUrlParams, { immediate: false });

// 生命周期
onMounted(async () => {
  tokenStore.initTokenStore();

  // 处理URL参数
  await handleUrlParams();
});
</script>
