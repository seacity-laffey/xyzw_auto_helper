<template>
  <div class="app-shell">
    <aside class="app-sider">
      <router-link class="brand" to="/tokens" aria-label="XYZW 游戏助手">
        <span class="brand-mark"><Flash /></span>
        <span class="brand-copy">
          <strong>XYZW 助手</strong>
          <small>GAME CONTROL</small>
        </span>
      </router-link>

      <nav class="primary-nav" aria-label="主导航">
        <router-link
          v-for="item in navigation"
          :key="item.path"
          :to="item.disabled ? route.fullPath : item.path"
          class="nav-link"
          :class="{ disabled: item.disabled }"
          :aria-disabled="item.disabled"
          @click="handleNavigation(item, $event)"
        >
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
          <LockClosed v-if="item.disabled" class="nav-lock" />
        </router-link>
      </nav>

      <div class="sider-footer">
        <div class="system-status">
          <span class="status-dot" :class="{ active: tokenStore.hasTokens }" />
          <span>{{ tokenStore.hasTokens ? `${tokenStore.gameTokens.length} 个账号可用` : "尚未导入 Token" }}</span>
        </div>
        <span class="version">LOCAL CONTROL · V2</span>
      </div>
    </aside>

    <div
      v-if="mobileMenuOpen"
      class="mobile-overlay"
      @click.self="mobileMenuOpen = false"
    >
      <aside class="mobile-drawer">
        <div class="mobile-drawer-head">
          <router-link class="brand" to="/tokens" @click="mobileMenuOpen = false">
            <span class="brand-mark"><Flash /></span>
            <span class="brand-copy"><strong>XYZW 助手</strong><small>GAME CONTROL</small></span>
          </router-link>
          <button class="icon-button" type="button" aria-label="关闭菜单" @click="mobileMenuOpen = false">
            <Close />
          </button>
        </div>
        <nav class="primary-nav mobile-nav" aria-label="移动端主导航">
          <router-link
            v-for="item in navigation"
            :key="item.path"
            :to="item.disabled ? route.fullPath : item.path"
            class="nav-link"
            :class="{ disabled: item.disabled }"
            @click="handleNavigation(item, $event)"
          >
            <component :is="item.icon" />
            <span>{{ item.label }}</span>
            <LockClosed v-if="item.disabled" class="nav-lock" />
          </router-link>
        </nav>
      </aside>
    </div>

    <div class="workspace">
      <header class="topbar" :class="{ 'immersive-topbar': route.meta.immersive }">
        <div class="topbar-title">
          <button
            class="icon-button mobile-menu-button"
            type="button"
            aria-label="打开菜单"
            @click="mobileMenuOpen = true"
          >
            <Menu />
          </button>
          <div>
            <h1>{{ route.meta.title }}</h1>
            <p>{{ route.meta.description }}</p>
          </div>
        </div>

        <div class="topbar-actions">
          <ThemeToggle />
          <n-dropdown
            v-if="tokenStore.hasTokens"
            :options="roleOptions"
            placement="bottom-end"
            @select="selectRole"
          >
            <button class="role-switcher" type="button">
              <img :src="selectedToken?.avatar || '/icons/xiaoyugan.png'" alt="当前角色头像" />
              <span>
                <strong>{{ selectedToken?.name || "选择角色" }}</strong>
                <small>{{ selectedToken?.server || "TOKEN ACCOUNT" }}</small>
              </span>
              <ChevronDown />
            </button>
          </n-dropdown>
        </div>
      </header>

      <main class="content-area" :class="{ 'immersive-content': route.meta.immersive }">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Apps,
  ArrowUpCircle,
  ChevronDown,
  Close,
  Flash,
  Key,
  LockClosed,
  Menu,
  Person,
} from "@vicons/ionicons5";
import { selectedToken, useTokenStore } from "@/stores/tokenStore";
import ThemeToggle from "@/components/Common/ThemeToggle.vue";

const route = useRoute();
const router = useRouter();
const tokenStore = useTokenStore();
const mobileMenuOpen = ref(false);

const navigation = computed(() => [
  { path: "/tokens", label: "Token 管理", icon: Key, disabled: false },
  {
    path: "/admin/game-features",
    label: "单个角色",
    icon: Person,
    disabled: !tokenStore.hasTokens,
  },
  {
    path: "/admin/batch-daily-tasks",
    label: "批量任务",
    icon: Apps,
    disabled: !tokenStore.hasTokens,
  },
  {
    path: "/admin/pushing-levels",
    label: "主线推关",
    icon: ArrowUpCircle,
    disabled: !tokenStore.hasTokens,
  },
]);

const roleOptions = computed(() =>
  tokenStore.gameTokens.map((token) => ({
    label: token.server ? `${token.name} · ${token.server}` : token.name,
    key: token.id,
  })),
);

const handleNavigation = (item, event) => {
  if (item.disabled) {
    event.preventDefault();
    return;
  }
  mobileMenuOpen.value = false;
};

const selectRole = (key) => {
  tokenStore.selectToken(key);
  if (route.path === "/tokens") {
    router.push("/admin/game-features");
  }
};
</script>

<style scoped>
.app-shell { min-height: 100vh; background: var(--surface); }
.app-sider {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 30;
  width: 248px;
  overflow: hidden;
  background: var(--surface-container-low);
  border-right: 1px solid var(--outline-variant);
}
.brand { display: flex; align-items: center; gap: 12px; height: 76px; padding: 0 22px; color: var(--on-surface); }
.brand:hover { color: var(--on-surface); }
.brand-mark { display: grid; width: 36px; height: 36px; place-items: center; flex: 0 0 36px; color: var(--on-primary); font-size: 18px; background: var(--primary); border-radius: 8px; }
.brand-copy { display: grid; gap: 2px; min-width: 0; }
.brand-copy strong { font-size: 17px; font-weight: 700; }
.brand-copy small,
.version { color: var(--on-surface-variant); font: 500 10px/1.2 "JetBrains Mono", monospace; }
.primary-nav { display: grid; gap: 5px; padding: 18px 14px; }
.nav-link { position: relative; display: grid; grid-template-columns: 20px 1fr 18px; align-items: center; gap: 12px; min-height: 44px; padding: 0 14px; color: var(--on-surface-variant); font-weight: 600; border-radius: 8px; transition: background 160ms ease, color 160ms ease; }
.nav-link:hover { color: var(--on-surface); background: var(--surface-container-high); }
.nav-link.router-link-active { color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
.nav-link.router-link-active::after { position: absolute; inset: 9px 0 9px auto; width: 2px; background: var(--primary); content: ""; }
.nav-link.disabled { cursor: not-allowed; opacity: 0.42; }
.nav-lock { font-size: 13px; }
.sider-footer { position: absolute; inset: auto 16px 20px; display: grid; gap: 10px; padding-top: 16px; border-top: 1px solid var(--outline-variant); }
.system-status { display: flex; align-items: center; gap: 8px; color: var(--on-surface-variant); font-size: 12px; }
.status-dot { width: 7px; height: 7px; background: var(--outline); border-radius: 50%; }
.status-dot.active { background: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent); }
.workspace { min-width: 0; min-height: 100vh; margin-left: 248px; background: var(--surface); }
.topbar { position: sticky; top: 0; z-index: 20; display: flex; height: 68px; padding: 0 24px; align-items: center; justify-content: space-between; background: color-mix(in srgb, var(--surface) 88%, transparent); border-bottom: 1px solid var(--outline-variant); backdrop-filter: blur(14px); }
.topbar.immersive-topbar { display: none; }
.topbar-title { display: flex; align-items: center; gap: 10px; min-width: 0; }
.topbar-title h1 { margin: 0; color: var(--on-surface); font-size: 18px; line-height: 1.25; font-weight: 700; }
.topbar-title p { margin: 3px 0 0; color: var(--on-surface-variant); font-size: 12px; }
.topbar-actions { display: flex; align-items: center; gap: 12px; }
.icon-button { display: grid; width: 36px; height: 36px; place-items: center; color: var(--on-surface); border-radius: 50%; }
.icon-button:hover { background: var(--surface-container-high); }
.mobile-menu-button { display: none; }
.role-switcher { display: flex; height: 46px; padding: 5px 8px; align-items: center; gap: 9px; color: var(--on-surface); text-align: left; background: transparent; border: 1px solid transparent; border-radius: 8px; }
.role-switcher:hover { background: var(--surface-container-high); border-color: var(--outline-variant); }
.role-switcher img { width: 34px; height: 34px; object-fit: cover; border-radius: 50%; }
.role-switcher > span { display: grid; min-width: 100px; gap: 2px; }
.role-switcher strong { max-width: 150px; overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.role-switcher small { color: var(--on-surface-variant); font-size: 10px; }
.content-area { min-width: 0; min-height: calc(100vh - 68px); background: var(--surface); }
.content-area.immersive-content { min-height: 100vh; }
.mobile-overlay { position: fixed; inset: 0; z-index: 60; background: rgba(0, 0, 0, 0.56); }
.mobile-drawer { width: min(280px, 86vw); height: 100%; padding: 12px 14px; background: var(--surface-container-low); box-shadow: var(--shadow-heavy); }
.mobile-drawer-head { display: flex; align-items: center; justify-content: space-between; }
.mobile-drawer-head .brand { padding: 0; }
.mobile-nav { padding: 18px 0; }

@media (max-width: 900px) {
  .app-sider { display: none; }
  .workspace { margin-left: 0; }
  .mobile-menu-button { display: grid; }
  .topbar { height: 62px; padding: 0 14px; }
  .topbar.immersive-topbar { display: flex; }
  .topbar-title p { display: none; }
  .role-switcher > span,
  .role-switcher > svg { display: none; }
  .role-switcher { height: 40px; padding: 3px; }
  .content-area.immersive-content { min-height: calc(100vh - 62px); }
}

@media (max-width: 480px) {
  .topbar-actions { gap: 4px; }
  .topbar-title h1 { font-size: 16px; }
}
</style>
