<template>
  <div class="app-shell">
    <aside class="app-sider">
      <router-link aria-label="XYZW 助手" class="brand" :to="homePath">
        <span class="brand-mark"><Zap :size="17"></Zap></span>
        <span class="brand-copy">
          <strong>XYZW 助手</strong>
          <small>本地控制台</small>
        </span>
      </router-link>

      <div class="nav-section-label">工作区</div>
      <nav aria-label="工作区导航" class="primary-nav">
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
          <LockKeyhole v-if="item.disabled" class="nav-lock" :size="13"></LockKeyhole>
        </router-link>
      </nav>

      <WorkspaceAccountList></WorkspaceAccountList>

      <div class="sider-footer">
        <Separator></Separator>
        <router-link class="account-management-link" to="/tokens">
          <Settings2 :size="16"></Settings2>
          <span>账号管理</span>
        </router-link>
        <div class="system-status">
          <span class="status-dot" :class="{ active: tokenStore.hasTokens }"></span>
          <span>{{ accountStatus }}</span>
        </div>
      </div>
    </aside>

    <Sheet v-model:open="mobileMenuOpen">
      <SheetContent class="mobile-drawer flex w-[min(320px,88vw)] flex-col bg-surface-container-low">
        <SheetTitle class="sr-only">主导航</SheetTitle>
        <div class="mobile-drawer-head">
          <router-link class="brand" :to="homePath" @click="mobileMenuOpen = false">
            <span class="brand-mark"><Zap :size="17"></Zap></span>
            <span class="brand-copy"><strong>XYZW 助手</strong><small>本地控制台</small></span>
          </router-link>
          <Button aria-label="关闭菜单" size="icon" variant="ghost" @click="mobileMenuOpen = false">
            <X></X>
          </Button>
        </div>
        <div class="nav-section-label">工作区</div>
        <nav aria-label="移动端工作区导航" class="primary-nav mobile-nav">
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
            <LockKeyhole v-if="item.disabled" class="nav-lock" :size="13"></LockKeyhole>
          </router-link>
        </nav>
        <WorkspaceAccountList @navigate="mobileMenuOpen = false"></WorkspaceAccountList>
        <router-link class="account-management-link mobile-account-management" to="/tokens" @click="mobileMenuOpen = false">
          <Settings2 :size="16"></Settings2>
          <span>账号管理</span>
        </router-link>
      </SheetContent>
    </Sheet>

    <div class="workspace">
      <header class="topbar" :class="{ 'immersive-topbar': route.meta.immersive }">
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
          <div v-if="route.name === 'RoleManagement' && selectedToken" class="focused-role">
            <img alt="" :src="selectedToken.avatar || '/icons/xiaoyugan.png'">
            <span>
              <strong>{{ selectedToken.name || "未命名角色" }}</strong>
              <small>{{ selectedToken.server || "未标注区服" }}</small>
            </span>
          </div>
        </div>
      </header>

      <main class="content-area" :class="{ 'immersive-content': route.meta.immersive }">
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import {
  LayoutGrid,
  LockKeyhole,
  Menu,
  Settings2,
  TrendingUp,
  X,
  Zap,
} from "@lucide/vue";
import { selectedToken, useTokenStore } from "@/stores/tokenStore";
import ThemeToggle from "@/components/Common/ThemeToggle.vue";
import WorkspaceAccountList from "@/components/Common/WorkspaceAccountList.vue";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const route = useRoute();
const tokenStore = useTokenStore();
const mobileMenuOpen = ref(false);

const navigation = computed(() => [
  {
    path: "/admin/batch-daily-tasks",
    label: "批量任务",
    icon: LayoutGrid,
    disabled: !tokenStore.hasTokens,
  },
  {
    path: "/admin/pushing-levels",
    label: "主线推关",
    icon: TrendingUp,
    disabled: !tokenStore.hasTokens,
  },
]);

const homePath = computed(() =>
  tokenStore.hasTokens ? "/admin/batch-daily-tasks" : "/tokens",
);

const accountStatus = computed(() =>
  tokenStore.hasTokens
    ? `${tokenStore.gameTokens.length} 个账号可用`
    : "尚未导入 Token",
);

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

.brand {
  display: flex;
  height: 64px;
  padding: 0 20px;
  align-items: center;
  gap: 11px;
  color: var(--foreground);
  border-bottom: 1px solid var(--border);
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

.brand-copy small {
  color: var(--muted-foreground);
  font-size: 11px;
}

.primary-nav {
  display: grid;
  gap: 2px;
  padding: 0 12px 14px;
}

.nav-section-label {
  padding: 14px 16px 8px;
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
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
  transition: color 150ms ease, background 150ms ease;
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
  gap: 10px;
  padding: 10px 14px 16px;
}

.account-management-link {
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

.account-management-link:hover,
.account-management-link.router-link-active {
  background: var(--muted);
  color: var(--foreground);
}

.system-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  background: var(--outline);
  border-radius: 50%;
}

.status-dot.active {
  background: var(--success);
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

.mobile-drawer-head {
  display: flex;
  padding-right: 12px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}

.mobile-drawer-head .brand {
  flex: 1;
  border: 0;
}

.mobile-nav {
  padding-bottom: 12px;
}

.mobile-account-management {
  flex: 0 0 auto;
  margin: 10px 12px;
}

@media (max-width: 900px) {
  .app-sider {
    display: none;
  }

  .workspace {
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
