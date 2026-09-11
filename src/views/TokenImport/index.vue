<template>
  <div
    class="min-h-[calc(100vh-56px)] bg-background py-6 pb-10 max-md:py-3 max-md:pb-6"
  >
    <div class="mx-auto w-full max-w-[1480px] px-6 max-md:px-3">
      <p class="mb-4"><a href="/migration.html" @click="confirmMigration">完整数据备份与迁移</a></p>
      <TokenImportDialog v-model:open="showImportForm"></TokenImportDialog>

      <!-- Token列表 -->
      <div
        v-if="tokenStore.hasTokens"
        class="rounded-md border border-border bg-background p-6 max-md:p-3"
        data-testid="token-management-panel"
      >
        <div
          class="mb-8 flex flex-wrap items-center justify-between gap-4 max-md:mb-5"
          data-testid="token-list-header"
        >
          <div
            class="flex items-center gap-6 max-md:w-full max-md:items-start max-md:justify-between max-md:gap-3"
          >
            <h2
              class="m-0 text-headline-md font-bold text-on-surface max-md:text-lg"
            >
              我的Token列表 ({{ tokenStore.gameTokens.length }}个)
            </h2>
            <div
              class="flex overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest"
            >
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
          <div
            aria-label="Token 排序"
            class="ml-auto flex items-center max-xl:order-3 max-xl:w-full max-xl:overflow-x-auto"
            data-testid="token-sort-controls"
          >
            <div
              class="flex min-w-max overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest"
            >
              <button
                class="flex items-center gap-1 border-r border-outline-variant px-3 py-1.5 text-body-sm font-medium transition-colors"
                type="button"
                :class="
                  sortConfig.field === 'name'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                "
                @click="toggleSort('name')"
              >
                名称 {{ getSortIcon("name") }}
              </button>
              <button
                class="border-r border-outline-variant px-3 py-1.5 text-body-sm font-medium transition-colors"
                type="button"
                :class="
                  sortConfig.field === 'server'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                "
                @click="toggleSort('server')"
              >
                服务器 {{ getSortIcon("server") }}
              </button>
              <button
                class="border-r border-outline-variant px-3 py-1.5 text-body-sm font-medium transition-colors"
                type="button"
                :class="
                  sortConfig.field === 'createdAt'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                "
                @click="toggleSort('createdAt')"
              >
                创建时间 {{ getSortIcon("createdAt") }}
              </button>
              <button
                class="px-3 py-1.5 text-body-sm font-medium transition-colors"
                type="button"
                :class="
                  sortConfig.field === 'lastUsed'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                "
                @click="toggleSort('lastUsed')"
              >
                最后使用 {{ getSortIcon("lastUsed") }}
              </button>
            </div>
          </div>
          <div
            class="flex flex-wrap items-center gap-2 max-md:grid max-md:w-full max-md:grid-cols-2"
            data-testid="token-header-actions"
          >
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

        <TokenAccountCollection
          :connection-statuses="tokenStore.wsConnections"
          :tokens="sortedTokens"
          :view-mode="viewMode"
          @action="handleTokenAction"
          @drag-over="handleDragOver"
          @drag-start="handleDragStart"
          @drop="handleDrop"
          @save-remark="saveRemark"
          @upgrade="upgradeTokenToPermanent"
        ></TokenAccountCollection>
      </div>

      <!-- 空状态 -->
      <div
        v-if="!tokenStore.hasTokens && !showImportForm"
        class="flex min-h-[clamp(360px,62vh,620px)] flex-col items-center justify-center rounded-md border border-dashed border-border bg-background px-6 py-12 text-center max-md:min-h-[calc(100vh-110px)] max-md:px-5 max-md:py-9"
      >
        <div
          aria-hidden="true"
          class="mb-5 grid h-14 w-14 place-items-center rounded-md border border-border bg-muted text-foreground"
        >
          <KeyIcon class="h-6 w-6"></KeyIcon>
        </div>
        <h2 class="m-0 text-2xl font-bold text-on-surface">暂无 Token</h2>
        <p
          class="mb-6 mt-2.5 max-w-[420px] text-body-sm text-on-surface-variant"
        >
          添加 Token 后即可管理单个角色或执行批量任务
        </p>
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

    <TokenEditDialog
      v-model:open="showEditModal"
      :token="editingToken"
      @save="saveEdit"
    ></TokenEditDialog>
  </div>
</template>

<script setup>
import { useTokenStore } from "@/stores/tokenStore";
import {
  Plus as AddIcon,
  KeyRound as KeyIcon,
  Menu as MenuIcon,
} from "@lucide/vue";
import { useDialog, useMessage } from "naive-ui";
import TokenAccountCollection from "@/components/Token/TokenAccountCollection.vue";
import TokenEditDialog from "@/components/Token/TokenEditDialog.vue";
import TokenImportDialog from "@/components/Token/TokenImportDialog.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { computed, onMounted, ref, watch } from "vue";
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
// 从localStorage读取上次的视图模式，默认为列表视图
const viewMode = ref(localStorage.getItem("tokenViewMode") || "list");
const dragIndex = ref(null);

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
  showEditModal.value = true;
};

const saveEdit = async (form) => {
  if (!editingToken.value)
    return;
  if (!form.name.trim() || !form.token.trim()) {
    message.warning("名称和 Token 字符串不能为空");
    return;
  }

  tokenStore.updateToken(editingToken.value.id, {
    name: form.name,
    token: form.token,
    server: form.server,
    wsUrl: form.wsUrl,
    remark: form.remark,
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

const saveRemark = (token, remark) => {
  tokenStore.updateToken(token.id, {
    remark,
  });
  message.success("备注已保存");
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

const confirmMigration = (event) => {
  // 页面将整体跳转，需要先确认停止任务。
  // eslint-disable-next-line no-alert
  if (!window.confirm("进入备份页面将停止当前窗口的任务。请先停止任务并关闭其他游戏窗口。继续？"))
    event.preventDefault();
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
            router.push({ name: "RoleManagement" });
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
