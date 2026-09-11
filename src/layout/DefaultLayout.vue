<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <aside id="desktop-sidebar" class="app-sider">
      <div class="sider-heading">
        <router-link aria-label="xyzw后台" class="brand" :to="homePath">
          <span class="brand-mark"><Zap :size="17"></Zap></span>
          <span class="brand-copy"><strong>xyzw后台</strong></span>
        </router-link>
        <button
          aria-controls="desktop-sidebar"
          class="sidebar-toggle"
          type="button"
          :aria-expanded="!sidebarCollapsed"
          :aria-label="sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
          :title="sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
          @click="toggleSidebar"
        >
          <component :is="sidebarCollapsed ? PanelLeftOpen : PanelLeftClose" :size="18"></component>
        </button>
      </div>

      <nav aria-label="主导航" class="primary-nav">
        <router-link
          v-for="item in navigation"
          :key="item.path"
          class="nav-link"
          :aria-disabled="item.disabled"
          :aria-label="item.label"
          :class="{ disabled: item.disabled }"
          :title="item.label"
          :to="item.disabled ? route.fullPath : item.path"
          @click="handleNavigation(item, $event)"
        >
          <component :is="item.icon" :size="17"></component>
          <span>{{ item.label }}</span>
          <LockKeyhole
            v-if="item.disabled"
            class="nav-lock"
            :size="13"
          ></LockKeyhole>
        </router-link>
      </nav>

      <WorkspaceAccountList v-show="!sidebarCollapsed"></WorkspaceAccountList>

      <div class="sider-footer">
        <router-link aria-label="关于" class="footer-link" title="关于" to="/about">
          <Info :size="16"></Info><span>关于</span>
        </router-link>
      </div>
    </aside>

    <Sheet v-model:open="mobileMenuOpen">
      <SheetContent
        class="mobile-drawer flex w-[min(320px,88vw)] flex-col bg-surface-container-low"
      >
        <SheetTitle class="sr-only">主导航</SheetTitle>
        <div class="mobile-drawer-head">
          <router-link
            class="brand"
            :to="homePath"
            @click="mobileMenuOpen = false"
          >
            <span class="brand-mark"><Zap :size="17"></Zap></span>
            <span class="brand-copy"><strong>xyzw后台</strong></span>
          </router-link>
          <Button
            aria-label="关闭菜单"
            size="icon"
            variant="ghost"
            @click="mobileMenuOpen = false"
          >
            <X></X>
          </Button>
        </div>
        <nav aria-label="移动端主导航" class="primary-nav">
          <router-link
            v-for="item in navigation"
            :key="item.path"
            class="nav-link"
            :aria-disabled="item.disabled"
            :class="{ disabled: item.disabled }"
            :to="item.disabled ? route.fullPath : item.path"
            @click="handleNavigation(item, $event)"
          >
            <component :is="item.icon" :size="17"></component>
            <span>{{ item.label }}</span>
            <LockKeyhole
              v-if="item.disabled"
              class="nav-lock"
              :size="13"
            ></LockKeyhole>
          </router-link>
        </nav>
        <WorkspaceAccountList
          @navigate="mobileMenuOpen = false"
        ></WorkspaceAccountList>
        <div class="sider-footer">
          <router-link class="footer-link" to="/about" @click="mobileMenuOpen = false">
            <Info :size="16"></Info><span>关于</span>
          </router-link>
        </div>
      </SheetContent>
    </Sheet>

    <div class="workspace">
      <header
        class="topbar"
        :class="{ 'immersive-topbar': route.meta.immersive }"
      >
        <div class="topbar-title">
          <Button
            aria-label="打开菜单"
            class="mobile-menu-button"
            size="icon"
            variant="ghost"
            @click="mobileMenuOpen = true"
          >
            <Menu></Menu>
          </Button>
          <div>
            <h1>{{ route.meta.title }}</h1>
            <p>{{ route.meta.description }}</p>
          </div>
        </div>

        <div class="topbar-actions">
          <ThemeToggle></ThemeToggle>
          <div
            v-if="route.name === 'RoleManagement' && selectedToken"
            class="focused-role"
          >
            <img alt="" :src="selectedToken.avatar || '/icons/xiaoyugan.png'">
            <span>
              <strong>{{ selectedToken.name || "未命名角色" }}</strong>
              <small>{{ selectedToken.server || "未标注区服" }}</small>
            </span>
          </div>
        </div>
      </header>

      <main
        class="content-area"
        :class="{ 'immersive-content': route.meta.immersive }"
      >
        <template v-if="isDesktop">
          <div v-show="route.name === 'BatchTasks'">
            <BatchDailyTasks></BatchDailyTasks>
          </div>
          <router-view v-if="route.name !== 'BatchTasks'"></router-view>
        </template>
        <router-view v-else></router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, ref } from "vue";
import { useRoute } from "vue-router";
import {
  Info,
  LayoutGrid,
  LockKeyhole,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  X,
  Zap,
} from "@lucide/vue";
import { selectedToken } from "@/stores/tokenStore";
import ThemeToggle from "@/components/Common/ThemeToggle.vue";
import WorkspaceAccountList from "@/components/Common/WorkspaceAccountList.vue";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const isDesktop = window.desktop?.isDesktop === true;
const BatchDailyTasks = defineAsyncComponent(() => import("@/views/BatchDailyTasks.vue"));
const route = useRoute();
const mobileMenuOpen = ref(false);
const sidebarCollapsed = ref(localStorage.getItem("sidebarCollapsed") === "true");
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed.value));
};

const navigation = computed(() => [
  {
    path: "/batch-tasks",
    label: "批量任务",
    icon: LayoutGrid,
    disabled: false,
  },
  {
    path: "/tokens",
    label: "账号管理",
    icon: Settings2,
    disabled: false,
  },
]);

const homePath = "/batch-tasks";

const handleNavigation = (item, event) => {
  if (item.disabled) {
    event.preventDefault();
    return;
  }
  mobileMenuOpen.value = false;
};
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--background);
}

.app-sider {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 30;
  display: flex;
  width: 320px;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface-container-low);
  border-right: 1px solid var(--border);
}

.sidebar-toggle {
  display: grid;
  min-height: 36px;
  width: 36px;
  place-items: center;
  flex: 0 0 auto;
  color: var(--muted-foreground);
  border-radius: var(--radius);
  cursor: pointer;
}

.sidebar-toggle:hover {
  background: var(--muted);
}

.sidebar-collapsed .app-sider {
  width: 64px;
}

.sidebar-collapsed .workspace {
  margin-left: 64px;
}

.sidebar-collapsed .sider-heading {
  justify-content: center;
}

.sidebar-collapsed .app-sider .brand,
.sidebar-collapsed .app-sider .nav-link > span,
.sidebar-collapsed .app-sider .nav-lock,
.sidebar-collapsed .app-sider .footer-link > span {
  display: none;
}

.sidebar-collapsed .app-sider .primary-nav {
  padding: 12px 8px;
}

.sidebar-collapsed .app-sider .nav-link {
  display: flex;
  justify-content: center;
}

.sidebar-collapsed .sider-footer {
  padding: 8px;
}

.sidebar-collapsed .app-sider .footer-link {
  justify-content: center;
  padding: 0;
}

.sider-heading,
.mobile-drawer-head {
  display: flex;
  height: 64px;
  flex: 0 0 auto;
  padding: 0 12px;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 11px;
  color: var(--foreground);
}

.brand:hover {
  color: var(--foreground);
}

.brand-mark {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  color: var(--primary-foreground);
  background: var(--primary);
  border-radius: var(--radius);
}

.brand-copy {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.brand-copy strong {
  font-size: 15px;
  font-weight: 650;
}

.primary-nav {
  display: grid;
  flex: 0 0 auto;
  gap: 2px;
  padding: 12px;
}

.nav-link {
  position: relative;
  display: grid;
  grid-template-columns: 18px 1fr 14px;
  min-height: 40px;
  padding: 0 12px;
  align-items: center;
  gap: 10px;
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--radius);
  transition:
    color 150ms ease,
    background 150ms ease;
}

.nav-link:hover {
  color: var(--foreground);
  background: var(--muted);
}

.nav-link.router-link-active {
  color: var(--foreground);
  background: var(--muted);
  font-weight: 600;
}

.nav-link.router-link-active::before {
  position: absolute;
  inset: 8px auto 8px 0;
  width: 2px;
  background: var(--foreground);
  content: "";
}

.nav-link.disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.nav-lock {
  justify-self: end;
}

.sider-footer {
  flex: 0 0 auto;
  display: grid;
  margin-top: auto;
  padding: 8px 12px;
  border-top: 1px solid var(--border);
}

.footer-link {
  display: flex;
  min-height: 36px;
  padding: 0 9px;
  align-items: center;
  gap: 9px;
  border-radius: var(--radius);
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 500;
}

.footer-link:hover,
.footer-link.router-link-active {
  background: var(--muted);
  color: var(--foreground);
}

.workspace {
  min-width: 0;
  min-height: 100vh;
  margin-left: 320px;
  background: var(--background);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  height: 56px;
  padding: 0 24px;
  align-items: center;
  justify-content: space-between;
  background: var(--background);
  border-bottom: 1px solid var(--border);
}

.topbar.immersive-topbar {
  display: none;
}

.topbar-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.topbar-title h1 {
  margin: 0;
  color: var(--foreground);
  font-size: 16px;
  line-height: 1.25;
  font-weight: 650;
}

.topbar-title p {
  margin: 2px 0 0;
  color: var(--muted-foreground);
  font-size: 11px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.topbar-title :deep(.mobile-menu-button) {
  display: none !important;
}

.focused-role {
  display: flex;
  height: 40px;
  max-width: 230px;
  padding: 3px 7px;
  align-items: center;
  gap: 8px;
  color: var(--foreground);
  border-radius: var(--radius);
}

.focused-role img {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  object-fit: cover;
  border-radius: 50%;
}

.focused-role > span {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 1px;
}

.focused-role strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.focused-role small {
  color: var(--muted-foreground);
  font-size: 10px;
}

.content-area {
  min-width: 0;
  min-height: calc(100vh - 56px);
  background: var(--background);
}

.content-area.immersive-content {
  min-height: 100vh;
}

:deep(.mobile-drawer) {
  background: var(--surface-container-low);
}

@media (max-width: 900px) {
  .app-sider {
    display: none;
  }

  .workspace,
  .sidebar-collapsed .workspace {
    margin-left: 0;
  }

  .topbar-title :deep(.mobile-menu-button) {
    display: inline-flex !important;
  }

  .topbar {
    padding: 0 12px;
  }

  .topbar.immersive-topbar {
    display: flex;
  }

  .topbar-title p {
    display: none;
  }

  .focused-role > span {
    display: none;
  }

  .focused-role {
    width: 36px;
    height: 36px;
    padding: 2px;
  }

  .focused-role img {
    width: 30px;
    height: 30px;
  }

  .content-area.immersive-content {
    min-height: calc(100vh - 56px);
  }
}

@media (max-width: 480px) {
  .topbar-title h1 {
    max-width: 130px;
    overflow: hidden;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
