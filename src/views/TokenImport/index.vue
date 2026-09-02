<template>
  <div class="min-h-[calc(100vh-68px)] bg-surface py-6 pb-10 max-md:min-h-[calc(100vh-62px)] max-md:py-3 max-md:pb-6">
    <div class="mx-auto w-full max-w-[1480px] px-6 max-md:px-3">
      <!-- 限流等待提示 -->
      <n-alert v-if="rateLimitWaiting" type="warning" class="mb-4">
        {{ rateLimitMessage }}
      </n-alert>

      <!-- Token导入区域 -->
      <n-modal
        v-model:show="showImportForm"
        preset="card"
        title="添加游戏Token"
        class="w-[40rem] max-w-[calc(100vw-24px)]"
      >
        <div class="mb-8 flex justify-center max-md:mb-5">
          <!-- 导入方式选择 -->
          <div class="flex overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest max-md:hidden">
            <button
              v-for="option in importMethodOptions"
              :key="option.value"
              type="button"
              class="border-r border-outline-variant px-3 py-2 text-body-sm font-medium transition-colors last:border-r-0"
              :class="importMethod === option.value ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
              @click="importMethod = option.value"
            >
              {{ option.label }}
            </button>
          </div>
          <select
            v-model="importMethod"
            class="hidden w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary max-md:block"
            aria-label="Token 导入方式"
          >
            <option v-for="option in importMethodOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div>
          <manual-token-form
            @cancel="() => (showImportForm = false)"
            @ok="() => (showImportForm = false)"
            v-if="importMethod === 'manual'"
          />
          <url-token-form
            @cancel="() => (showImportForm = false)"
            @ok="() => (showImportForm = false)"
            v-if="importMethod === 'url'"
          />
          <wx-qrcode-form
            @cancel="() => (showImportForm = false)"
            @ok="() => (showImportForm = false)"
            v-if="importMethod === 'wxQrcode'"
          />
          <bin-token-form
            @cancel="() => (showImportForm = false)"
            @ok="() => (showImportForm = false)"
            v-if="importMethod === 'bin'"
          />
          <single-bin-token-form
            @cancel="() => (showImportForm = false)"
            @ok="() => (showImportForm = false)"
            v-if="importMethod === 'singlebin'"
          />
        </div>
      </n-modal>

      <!-- Token列表 -->
      <div
        v-if="tokenStore.hasTokens"
        data-testid="token-management-panel"
        class="rounded-2xl border border-outline-variant bg-surface-container-low p-6 shadow-xl max-md:rounded-lg max-md:p-3"
      >
        <div data-testid="token-list-header" class="mb-8 flex flex-wrap items-center justify-between gap-4 max-md:mb-5">
          <div class="flex items-center gap-6 max-md:w-full max-md:items-start max-md:justify-between max-md:gap-3">
            <h2 class="m-0 text-headline-md font-bold text-on-surface max-md:text-lg">
              我的Token列表 ({{ tokenStore.gameTokens.length }}个)
            </h2>
            <div class="flex overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest">
              <button
                class="border-r border-outline-variant px-4 py-1.5 text-body-sm font-medium transition-colors"
                :class="
                  viewMode === 'list'
                    ? 'bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                "
                type="button"
                @click="viewMode = 'list'"
              >
                列表
              </button>
              <button
                class="px-4 py-1.5 text-body-sm font-medium transition-colors"
                :class="
                  viewMode === 'card'
                    ? 'bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                "
                type="button"
                @click="viewMode = 'card'"
              >
                卡片
              </button>
            </div>
          </div>
          <div data-testid="token-sort-controls" class="ml-auto flex items-center max-xl:order-3 max-xl:w-full max-xl:overflow-x-auto" aria-label="Token 排序">
            <div class="flex min-w-max overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest">
              <button
                class="flex items-center gap-1 border-r border-outline-variant px-3 py-1.5 text-body-sm font-medium transition-colors"
                :class="sortConfig.field === 'name' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
                type="button"
                @click="toggleSort('name')"
              >
                名称 {{ getSortIcon("name") }}
              </button>
              <button
                class="border-r border-outline-variant px-3 py-1.5 text-body-sm font-medium transition-colors"
                :class="sortConfig.field === 'server' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
                type="button"
                @click="toggleSort('server')"
              >
                服务器 {{ getSortIcon("server") }}
              </button>
              <button
                class="border-r border-outline-variant px-3 py-1.5 text-body-sm font-medium transition-colors"
                :class="sortConfig.field === 'createdAt' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
                type="button"
                @click="toggleSort('createdAt')"
              >
                创建时间 {{ getSortIcon("createdAt") }}
              </button>
              <button
                class="px-3 py-1.5 text-body-sm font-medium transition-colors"
                :class="sortConfig.field === 'lastUsed' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
                type="button"
                @click="toggleSort('lastUsed')"
              >
                最后使用 {{ getSortIcon("lastUsed") }}
              </button>
            </div>
          </div>
          <div data-testid="token-header-actions" class="flex flex-wrap items-center gap-2 max-md:grid max-md:w-full max-md:grid-cols-2">
            <button
              class="flex items-center justify-center gap-2 rounded-md border border-primary bg-transparent px-4 py-2 text-label-sm font-semibold text-primary transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
              type="button"
              @click="openGame"
            >
              <GameController class="h-4 w-4"></GameController>
              打开游戏
            </button>
            <button
              v-if="!showImportForm"
              class="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-label-sm font-semibold text-on-primary transition-[filter] hover:brightness-110"
              type="button"
              @click="showImportForm = true"
            >
              <AddIcon class="h-4 w-4"></AddIcon>
              添加 Token
            </button>

            <n-dropdown :options="bulkOptions" @select="handleBulkAction">
              <button
                class="flex items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface-container-high px-4 py-2 text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-highest max-md:w-full"
                type="button"
              >
                <MenuIcon class="h-4 w-4"></MenuIcon>
                批量操作
              </button>
            </n-dropdown>
          </div>
        </div>

        <div v-if="viewMode === 'card'" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article
            v-for="(token, index) in sortedTokens"
            :key="token.id"
            data-testid="token-card"
            draggable="true"
            @dragstart="handleDragStart(index, $event)"
            @dragover="handleDragOver($event)"
            @drop="handleDrop(index, $event)"
            class="overflow-hidden rounded-lg border bg-surface-container-lowest transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
            :class="selectedTokenId === token.id ? 'border-primary ring-2 ring-[color-mix(in_srgb,var(--primary)_14%,transparent)]' : 'border-outline-variant'"
            @click="selectToken(token)"
          >
            <header class="flex items-center justify-between gap-4 border-b border-outline-variant px-5 py-4">
              <div class="flex min-w-0 items-center gap-3">
                <img
                  class="h-10 w-10 shrink-0 rounded-full border border-outline-variant object-cover"
                  :src="token.avatar || '/icons/xiaoyugan.png'"
                  :alt="`${token.name}头像`"
                />
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
              <n-dropdown
                :options="getTokenActions(token)"
                @select="(key) => handleTokenAction(key, token)"
              >
                <button class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-primary" type="button" aria-label="更多操作" @click.stop>
                  <EllipsisHorizontal class="h-5 w-5"></EllipsisHorizontal>
                </button>
              </n-dropdown>
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
                  v-model="tempRemarks[token.id]"
                  rows="2"
                  class="min-w-0 flex-1 resize-none rounded border border-outline-variant bg-surface-container-lowest px-2 py-1 text-body-sm text-on-surface outline-none focus:border-primary"
                  placeholder="添加备注信息..."
                  @blur="saveRemark(token)"
                  @keyup.enter="saveRemark(token)"
                  @keyup.esc="cancelEditRemark()"
                  autofocus
                ></textarea>
              </div>
              <button
                v-else
                type="button"
                class="flex w-full items-center gap-2 rounded-md bg-surface-container px-3 py-2 text-left text-body-sm text-on-surface-variant hover:text-primary"
                @click.stop="startEditRemark(token)"
              >
                <span class="shrink-0 font-medium text-on-surface">备注：</span>
                <span class="min-w-0 flex-1 truncate">{{ token.remark || "点击添加备注" }}</span>
                <Create class="h-4 w-4 shrink-0"></Create>
              </button>

              <button
                class="flex w-full items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface-container px-4 py-2 text-body-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-60"
                type="button"
                :disabled="refreshingTokens.has(token.id)"
                @click.stop="refreshToken(token)"
              >
                <Refresh class="h-4 w-4" :class="{ 'animate-spin': refreshingTokens.has(token.id) }"></Refresh>
                {{ token.sourceUrl ? "刷新" : "重新获取" }}
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
                  type="button"
                  class="flex items-center gap-1 text-xs font-semibold text-tertiary hover:underline"
                  @click.stop="upgradeTokenToPermanent(token)"
                >
                  <Star class="h-4 w-4"></Star>
                  升级为长期有效
                </button>
              </div>
            </div>
            <footer class="border-t border-outline-variant p-4">
              <button
                type="button"
                class="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-body-sm font-semibold text-on-primary hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
                :disabled="connectingTokens.has(token.id)"
                @click.stop="startTaskManagement(token)"
              >
                <Home class="h-4 w-4"></Home>
                进入控制台
              </button>
            </footer>
          </article>
        </div>

        <!-- List View -->
        <div v-else data-testid="token-account-list" class="space-y-3">
          <article
            v-for="(token, index) in sortedTokens"
            :key="token.id"
            data-testid="token-account-row"
            class="group flex items-center justify-between gap-6 rounded-lg border bg-surface-container-lowest px-6 py-6 transition-all hover:border-primary max-xl:flex-col max-xl:items-stretch max-xl:gap-4 max-md:px-4 max-md:py-4"
            :class="
              selectedTokenId === token.id
                ? 'border-primary shadow-[inset_2px_0_0_var(--primary)]'
                : 'border-[color-mix(in_srgb,var(--outline-variant)_72%,transparent)]'
            "
            draggable="true"
            @dragstart="handleDragStart(index, $event)"
            @dragover="handleDragOver($event)"
            @drop="handleDrop(index, $event)"
            @click="selectToken(token)"
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
                  :src="token.avatar || '/icons/xiaoyugan.png'"
                  :alt="`${token.name}头像`"
                />
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
                  v-model="tempRemarks[token.id]"
                  data-testid="token-remark-input"
                  class="w-full rounded-md border border-outline-variant bg-surface-container px-3 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
                  placeholder="添加备注..."
                  autofocus
                  @blur="saveRemark(token)"
                  @keyup.enter="saveRemark(token)"
                  @keyup.esc="cancelEditRemark()"
                />
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

              <button
                class="flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-body-sm font-medium text-on-primary transition-[filter] hover:brightness-110 disabled:cursor-wait disabled:opacity-60 max-md:flex-1 max-md:justify-center"
                type="button"
                :disabled="connectingTokens.has(token.id)"
                @click="startTaskManagement(token)"
              >
                <Home class="h-4 w-4"></Home>
                控制台
              </button>
              <button
                class="flex items-center gap-2 rounded-md border border-outline-variant bg-surface-container px-4 py-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-60 max-md:flex-1 max-md:justify-center"
                type="button"
                :disabled="refreshingTokens.has(token.id)"
                @click="refreshToken(token)"
              >
                <Refresh class="h-4 w-4" :class="{ 'animate-spin': refreshingTokens.has(token.id) }"></Refresh>
                刷新
              </button>
              <n-dropdown
                :options="getTokenActions(token)"
                placement="bottom-end"
                @select="(key) => handleTokenAction(key, token)"
              >
                <button
                  class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                  type="button"
                  aria-label="更多操作"
                >
                  <EllipsisHorizontal class="h-5 w-5"></EllipsisHorizontal>
                </button>
              </n-dropdown>
            </div>
          </article>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-if="!tokenStore.hasTokens && !showImportForm"
        class="flex min-h-[clamp(360px,62vh,620px)] flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-6 py-12 text-center max-md:min-h-[calc(100vh-110px)] max-md:px-5 max-md:py-9"
      >
        <div class="mb-6 grid h-[104px] w-[104px] place-items-center rounded-full border border-[color-mix(in_srgb,var(--primary)_32%,var(--outline-variant))] bg-[color-mix(in_srgb,var(--primary)_12%,var(--surface-container-lowest))] text-primary max-md:h-[88px] max-md:w-[88px]" aria-hidden="true">
          <KeyIcon class="h-12 w-12 max-md:h-10 max-md:w-10"></KeyIcon>
        </div>
        <h2 class="m-0 text-2xl font-bold text-on-surface">暂无 Token</h2>
        <p class="mb-6 mt-2.5 max-w-[420px] text-body-sm text-on-surface-variant">添加 Token 后即可管理单个角色或执行批量任务</p>
        <button
          type="button"
          class="flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-label-sm font-semibold text-on-primary hover:brightness-110"
          @click="openshowImportForm"
        >
          <AddIcon class="h-4 w-4"></AddIcon>
          添加 Token
        </button>
      </div>
    </div>

    <!-- 编辑Token模态框 -->
    <n-modal
      v-model:show="showEditModal"
      preset="card"
      title="编辑Token"
      class="w-[500px] max-w-[calc(100vw-24px)]"
    >
      <n-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-placement="left"
        label-width="80px"
      >
        <n-form-item label="名称" path="name">
          <n-input v-model:value="editForm.name" />
        </n-form-item>
        <n-form-item label="Token字符串" path="token">
          <n-input
            v-model:value="editForm.token"
            type="textarea"
            :rows="3"
            placeholder="粘贴Token字符串..."
            clearable
          />
        </n-form-item>
        <n-form-item label="服务器">
          <n-input v-model:value="editForm.server" />
        </n-form-item>
        <n-form-item label="WebSocket地址">
          <n-input v-model:value="editForm.wsUrl" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input
            v-model:value="editForm.remark"
            type="textarea"
            :rows="2"
            placeholder="添加备注信息..."
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="flex justify-end gap-4">
          <n-button @click="showEditModal = false"> 取消 </n-button>
          <n-button type="primary" @click="saveEdit"> 保存 </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import ManualTokenForm from "./manual.vue";
import UrlTokenForm from "./url.vue";
import BinTokenForm from "./bin.vue";
import singleBinTokenForm from "./singlebin.vue";
import WxQrcodeForm from "./wxqrcode.vue";

import { useTokenStore, selectedTokenId } from "@/stores/tokenStore";
import {
  Add as AddIcon,
  Copy,
  Create,
  DocumentTextOutline as DocumentIcon,
  EllipsisHorizontal,
  Home,
  GameController,
  Key as KeyIcon,
  Menu as MenuIcon,
  Refresh,
  Star,
  SyncCircle,
  TrashBin,
} from "@vicons/ionicons5";
import { NIcon, useDialog, useMessage } from "naive-ui";
import { computed, h, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { transformToken, scheduleAuthUserRequest } from "@/utils/token";
import { $emit } from "@/stores/events/index";
import useIndexedDB from "@/hooks/useIndexedDB";
import { prepareEmbeddedGameSession } from "@/utils/gameLauncher";
const { getArrayBuffer, storeArrayBuffer, deleteArrayBuffer, clearAll } =
  useIndexedDB();
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

// 限流等待状态
const rateLimitWaiting = ref(false);
const rateLimitMessage = ref("");

// 响应式数据
const showImportForm = ref(false);
const isImporting = ref(false);
const showEditModal = ref(false);
const importFormRef = ref(null);
const urlFormRef = ref(null);
const editFormRef = ref(null);
const editingToken = ref(null);
const importMethod = ref("manual");
const refreshingTokens = ref(new Set());
const connectingTokens = ref(new Set());
// 从localStorage读取上次的视图模式，默认为列表视图
const viewMode = ref(localStorage.getItem("tokenViewMode") || "list");
const importMethodOptions = [
  { label: "手动输入", value: "manual" },
  { label: "URL 获取", value: "url" },
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
  ["url", "bin", "wxQrcode"].includes(token.importMethod) ||
  token.upgradedToPermanent;

// 切换排序
const toggleSort = (field) => {
  if (sortConfig.value.field === field) {
    // 如果点击的是当前排序字段，则切换排序方向
    sortConfig.value.direction =
      sortConfig.value.direction === "asc" ? "desc" : "asc";
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
  if (sortConfig.value.field !== field) return null;
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
  if (dragIndex.value === null || dragIndex.value === index) return;

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

const editRules = {
  name: [{ required: true, message: "请输入Token名称", trigger: "blur" }],
  token: [{ required: true, message: "请输入Token字符串", trigger: "blur" }],
};

const bulkOptions = [
  { label: "刷新所有Token", key: "refreshAll" },
  { label: "更新token信息", key: "updateInfo" },
  { label: "导出所有Token", key: "export" },
  { label: "导入Token文件", key: "import" },
  { label: "清理过期Token", key: "clean" },
  { label: "断开所有连接", key: "disconnect" },
  { label: "清除所有Token", key: "clear" },
];

/**
 * 手动打开Token管理卡片
 */
const openshowImportForm = () => {
  showImportForm.value = true;
};

// 刷新Token
const refreshToken = async (token) => {
  refreshingTokens.value.add(token.id);

  try {
    if (token.importMethod === "url") {
      // 有源URL的token - 从URL重新获取（使用限流）
      const data = await scheduleAuthUserRequest(async () => {
        let response;

        const isLocalUrl =
          token.sourceUrl.startsWith(window.location.origin) ||
          token.sourceUrl.startsWith("/") ||
          token.sourceUrl.startsWith("http://localhost") ||
          token.sourceUrl.startsWith("http://127.0.0.1");

        if (isLocalUrl) {
          response = await fetch(token.sourceUrl);
        } else {
          try {
            response = await fetch(token.sourceUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
              mode: "cors",
            });
          } catch (corsError) {
            throw new Error(
              `跨域请求被阻止。请确保目标服务器支持CORS。错误详情: ${corsError.message}`,
            );
          }
        }

        if (!response.ok) {
          throw new Error(
            `请求失败: ${response.status} ${response.statusText}`,
          );
        }

        const result = await response.json();

        if (!result.token) {
          throw new Error("返回数据中未找到token字段");
        }

        return result;
      });

      // 更新token信息
      tokenStore.updateToken(token.id, {
        token: data.token,
        server: data.server || token.server,
        lastRefreshed: Date.now(),
      });

      message.success("Token刷新成功");
    } else if (
      token.importMethod === "wxQrcode" ||
      token.importMethod === "bin"
    ) {
      let userToken = await getArrayBuffer(token.id);
      let usedOldKey = false;
      if (!userToken) {
        userToken = await getArrayBuffer(token.name);
        usedOldKey = true;
      }
      if (userToken) {
        const newToken = await transformToken(userToken);
        tokenStore.updateToken(token.id, {
          token: newToken,
          lastRefreshed: Date.now(),
        });
        if (usedOldKey) {
          await storeArrayBuffer(token.id, userToken);
          await deleteArrayBuffer(token.name);
          console.log("已迁移IndexedDB数据:", token.name, "->", token.id);
        }
        message.success("Token刷新成功");
      }
    } else {
      dialog.info({
        title: "重新获取Token",
        content: `Token "${token.name}" 是通过微信扫码登录导入的，没有配置自动刷新地址。

请选择以下操作：
1. 重新手动导入新的Token
2. 尝试重新连接现有Token`,
        positiveText: "重新导入",
        negativeText: "重新连接",
        onPositiveClick: () => {
          showImportForm.value = true;
          importMethod.value = "manual";
          importForm.name = token.name;
          importForm.server = token.server;
          importForm.wsUrl = token.wsUrl;
        },
        onNegativeClick: () => {
          // 断开现有连接
          if (tokenStore.getWebSocketStatus(token.id) === "connected") {
            tokenStore.closeWebSocketConnection(token.id);
          }

          // 尝试重新连接
          setTimeout(() => {
            tokenStore.createWebSocketConnection(
              token.id,
              token.token,
              token.wsUrl,
            );
            message.info("正在尝试重新连接...");
          }, 500);
        },
      });
      return;
    }

    // 如果当前token有连接，需要重新连接
    if (tokenStore.getWebSocketStatus(token.id) === "connected") {
      tokenStore.closeWebSocketConnection(token.id);
      setTimeout(() => {
        tokenStore.createWebSocketConnection(
          token.id,
          token.token,
          token.wsUrl,
        );
      }, 500);
    }
  } catch (error) {
    console.error("刷新Token失败:", error);
    message.error(error.message || "Token刷新失败");
  } finally {
    refreshingTokens.value.delete(token.id);
    // 关闭限流等待提示
    rateLimitWaiting.value = false;
  }
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

const selectToken = (token, forceReconnect = false) => {
  // 如果有备注正在编辑，保存备注并取消编辑
  if (editingRemark.value) {
    saveCurrentRemark();
    return;
  }

  const isAlreadySelected = selectedTokenId.value === token.id;
  const connectionStatus = getConnectionStatus(token.id);

  // 降噪日志已移除

  // 如果已经选中且已连接，断开连接
  if (
    isAlreadySelected &&
    connectionStatus === "connected" &&
    !forceReconnect
  ) {
    // 断开连接
    tokenStore.closeWebSocketConnection(token.id);
    message.success(`已断开 ${token.name} 的连接`);
    return;
  }

  // 如果未选中但已连接，断开连接
  if (
    !isAlreadySelected &&
    connectionStatus === "connected" &&
    !forceReconnect
  ) {
    // 断开连接
    tokenStore.closeWebSocketConnection(token.id);
    message.success(`已断开 ${token.name} 的连接`);
    return;
  }

  // 如果已经选中但正在连接，也不执行操作
  if (
    isAlreadySelected &&
    connectionStatus === "connecting" &&
    !forceReconnect
  ) {
    message.info(`${token.name} 正在连接中...`);
    return;
  }

  // 选择token（带智能连接判断）
  const result = tokenStore.selectToken(token.id, forceReconnect);

  if (result) {
    if (forceReconnect) {
      message.success(`强制重连：${token.name}`);
    } else if (isAlreadySelected) {
      message.success(`重新连接：${token.name}`);
    } else {
      message.success(`已选择：${token.name}`);
    }
  } else {
    message.error(`选择Token失败：${token.name}`);
  }
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

const getTokenStyle = (tokenId) => {
  const status = getConnectionStatus(tokenId);
  const statusMap = {
    connected: "success",
    connecting: "warning",
    disconnected: "error",
    error: "error",
    disconnecting: "warning",
  };
  return statusMap[status] || "error";
};

const getServerTagType = (tokenId) => {
  const status = getConnectionStatus(tokenId);
  // 连接成功时服务器标签使用绿色，其他状态保持红色
  return status === "connected" ? "success" : "error";
};

const getServerTagColor = (tokenId) => {
  const status = getConnectionStatus(tokenId);
  // 连接成功时服务器标签使用绿色，其他状态保持红色
  return status === "connected" ? "green" : "red";
};

const getTokenActions = (token) => {
  const actions = [
    {
      label: "编辑",
      key: "edit",
      icon: () => h(NIcon, null, { default: () => h(Create) }),
    },
    {
      label: "复制Token",
      key: "copy",
      icon: () => h(NIcon, null, { default: () => h(Copy) }),
    },
  ];

  // 根据Token类型添加刷新选项
  if (token.importMethod === "url" && token.sourceUrl) {
    actions.push({
      label: "从URL刷新",
      key: "refresh-url",
      icon: () => h(NIcon, null, { default: () => h(SyncCircle) }),
    });
  } else {
    actions.push({
      label: "重新获取",
      key: "refresh",
      icon: () => h(NIcon, null, { default: () => h(Refresh) }),
    });
  }

  actions.push(
    { type: "divider" },
    {
      label: "删除",
      key: "delete",
      icon: () => h(NIcon, null, { default: () => h(TrashBin) }),
      props: { style: { color: "#e74c3c" } },
    },
  );

  return actions;
};

const handleTokenAction = async (key, token) => {
  switch (key) {
    case "edit":
      editToken(token);
      break;
    case "copy":
      copyToken(token);
      break;
    case "refresh":
      // 重新获取Token
      refreshToken(token);
      break;
    case "refresh-url":
      // URL获取的Token刷新
      refreshToken(token);
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
  if (!editFormRef.value || !editingToken.value) return;

  try {
    await editFormRef.value.validate();

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
  } catch (error) {
    // 验证失败
  }
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
  if (!editingRemark.value) return;

  const editingTokenId = editingRemark.value;
  const remark = tempRemarks.value[editingTokenId] || "";
  tokenStore.updateToken(editingTokenId, {
    remark: remark,
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

// 批量刷新所有URLToken
const refreshAllTokens = async () => {
  if (!tokenStore.gameTokens.length) {
    message.warning("没有可刷新的Token");
    return;
  }

  const tokensToRefresh = tokenStore.gameTokens.filter(
    (token) =>
      token.importMethod === "url" ||
      token.importMethod === "wxQrcode" ||
      token.importMethod === "bin",
  );
  const manualTokens = tokenStore.gameTokens.filter(
    (token) => token.importMethod === "manual",
  );

  if (tokensToRefresh.length === 0) {
    message.warning("没有支持自动刷新的Token");
    return;
  }

  // 显示确认对话框
  dialog.warning({
    title: "批量刷新Token",
    content: "确定要刷新所有支持自动刷新的Token吗?",
    positiveText: "开始刷新",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        let successCount = 0;
        let failCount = 0;

        // 显示进度提示
        const loadingMessage = message.loading(
          `正在批量刷新Token (0/${tokensToRefresh.length})`,
          {
            duration: 0,
          },
        );

        for (let i = 0; i < tokensToRefresh.length; i++) {
          const token = tokensToRefresh[i];

          try {
            // 更新进度显示
            loadingMessage.content = `正在刷新Token (${i + 1}/${tokensToRefresh.length}): ${token.name}`;

            // 调用单个刷新函数（限流器会自动处理等待）
            await refreshToken(token);
            successCount++;
          } catch (error) {
            console.error(`刷新Token "${token.name}" 失败:`, error);
            failCount++;
          }
        }

        // 关闭进度提示
        loadingMessage.destroy();

        // 关闭限流等待提示
        rateLimitWaiting.value = false;

        // 显示结果
        if (failCount === 0) {
          message.success(`批量刷新完成！成功刷新 ${successCount} 个Token`);
        } else {
          message.warning(
            `批量刷新完成，成功 ${successCount} 个，失败 ${failCount} 个`,
          );
        }

        // 如果有手动导入的Token，提示用户
        if (manualTokens.length > 0) {
          message.info(`${manualTokens.length} 个手动导入的Token需要手动刷新`);
        }
      } catch (error) {
        message.error("批量刷新过程中发生错误: " + error.message);
      }
    },
  });
};

const handleBulkAction = (key) => {
  switch (key) {
    case "refreshAll":
      refreshAllTokens();
      break;
    case "updateInfo":
      updateAllTokenInfo();
      break;
    case "export":
      exportTokens();
      break;
    case "import":
      importTokenFile();
      break;
    case "clean":
      cleanExpiredTokens();
      break;
    case "disconnect":
      disconnectAll();
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

const cleanExpiredTokens = async () => {
  const count = await tokenStore.cleanExpiredTokens();
  message.success(`已清理 ${count} 个过期Token`);
};

const disconnectAll = () => {
  tokenStore.gameTokens.forEach((token) => {
    tokenStore.closeWebSocketConnection(token.id);
  });
  message.success("所有连接已断开");
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

// 一键连接更新所有token信息
const updateAllTokenInfo = async () => {
  if (tokenStore.gameTokens.length === 0) {
    message.warning("没有可更新的Token");
    return;
  }

  dialog.warning({
    title: "更新所有Token信息",
    content:
      "此操作将逐个连接所有Token，获取最新的角色名称和服务器信息，完成后自动断开连接。\n\n预计耗时：约3-5秒/个Token",
    positiveText: "开始更新",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        let successCount = 0;
        let failCount = 0;
        const totalTokens = tokenStore.gameTokens.length;

        // 显示进度提示
        const loadingMessage = message.loading(
          `正在更新Token信息 (0/${totalTokens})`,
          {
            duration: 0,
          },
        );

        // 顺序处理每个token
        for (let i = 0; i < tokenStore.gameTokens.length; i++) {
          const token = tokenStore.gameTokens[i];

          // 更新进度显示
          loadingMessage.content = `正在更新Token信息 (${i + 1}/${totalTokens}): ${token.name}`;

          try {
            // 连接token获取角色信息
            await tokenStore.selectToken(token.id);

            // 等待1秒确保角色信息已获取（可根据实际情况调整）
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // 断开连接
            tokenStore.closeWebSocketConnection(token.id);

            successCount++;
            message.success(`Token "${token.name}" 信息更新成功`);
          } catch (error) {
            console.error(`更新Token "${token.name}" 失败:`, error);
            failCount++;
            message.error(`Token "${token.name}" 信息更新失败`);
          }

          // 添加短暂延迟，避免服务器压力过大
          if (i < tokenStore.gameTokens.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        // 关闭进度提示
        loadingMessage.destroy();

        // 显示结果
        if (failCount === 0) {
          message.success(
            `所有Token信息更新完成！成功更新 ${successCount} 个Token`,
          );
        } else {
          message.warning(
            `Token信息更新完成，成功 ${successCount} 个，失败 ${failCount} 个`,
          );
        }
      } catch (error) {
        message.error("更新过程中发生错误: " + error.message);
      }
    },
  });
};

const maskToken = (token) => {
  if (!token) return "";
  const len = token.length;
  if (len <= 8) return token;
  return token.substring(0, 4) + "***" + token.substring(len - 4);
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString("zh-CN");
};

const openGame = async () => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择一个 Token");
    return;
  }

  const binData = await getArrayBuffer(token.id);
  if (!binData) {
    message.error("未找到该 Token 的 BIN 数据");
    return;
  }

  prepareEmbeddedGameSession(token, binData);
  router.push("/game");
};

// 开始任务管理 - 直接跳转到控制台
const startTaskManagement = (token) => {
  // 选择token
  tokenStore.selectToken(token.id);
  // 直接跳转到控制台，不等待连接
  message.success(`正在进入 ${token.name} 的控制台`);
  router.push("/admin/game-features");
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

        // 如果auto=true，自动选择并跳转到控制台
        if (props.auto && tokenResult.token) {
          tokenStore.selectToken(tokenResult.token.id);
          message.success("正在跳转到控制台...");
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

// 限流等待事件处理
const handleRateLimitWaiting = (data) => {
  rateLimitWaiting.value = true;
  rateLimitMessage.value = `Token刷新限流等待中，预计等待 ${data.waitSeconds} 秒（队列: ${data.queueSize}）`;
};

// 生命周期
onMounted(async () => {
  tokenStore.initTokenStore();

  // 监听限流等待事件
  $emit.on("token:refresh:waiting", handleRateLimitWaiting);

  // 处理URL参数
  await handleUrlParams();

});

onUnmounted(() => {
  // 移除限流等待事件监听
  $emit.off("token:refresh:waiting", handleRateLimitWaiting);
});
</script>
