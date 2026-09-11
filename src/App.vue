<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides">
    <n-message-provider>
      <n-loading-bar-provider>
        <n-notification-provider>
          <n-dialog-provider>
            <div class="app-root">
              <router-view v-slot="{ Component }" v-if="isDesktop">
                <keep-alive include="DefaultLayout"><component :is="Component" ></component></keep-alive>
              </router-view>
              <router-view v-else></router-view>
              <AppMessageHost></AppMessageHost>
            </div>
          </n-dialog-provider>
        </n-notification-provider>
      </n-loading-bar-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from "vue";
import { darkTheme } from "naive-ui";
import { useTheme } from "@/composables/useTheme";
import AppMessageHost from "@/components/Common/AppMessageHost.vue";

const isDesktop = window.desktop?.isDesktop === true;

const { isDark, initTheme, setupSystemThemeListener, updateReactiveState }
  = useTheme();

// Naive UI 主题
const naiveTheme = computed(() => {
  return isDark.value ? darkTheme : null;
});

const naiveThemeOverrides = computed(() => {
  const dark = isDark.value;
  const primary = dark ? "#ededed" : "#202020";
  const primaryHover = dark ? "#d4d4d4" : "#353535";
  const primaryPressed = dark ? "#a3a3a3" : "#111111";
  const primaryText = dark ? "#171717" : "#fafafa";

  return {
    common: {
      primaryColor: primary,
      primaryColorHover: primaryHover,
      primaryColorPressed: primaryPressed,
      primaryColorSuppl: primaryHover,
      successColor: dark ? "#70a782" : "#2f7d4a",
      warningColor: dark ? "#c49a4a" : "#9a6700",
      errorColor: dark ? "#d45b52" : "#b42318",
      infoColor: dark ? "#7fa0bc" : "#315f86",
      borderRadius: "4px",
    },
    Button: {
      borderRadiusSmall: "3px",
      borderRadiusMedium: "4px",
      textColorPrimary: primaryText,
      textColorHoverPrimary: primaryText,
      textColorPressedPrimary: primaryText,
      textColorFocusPrimary: primaryText,
    },
    Card: {
      borderRadius: "4px",
    },
  };
});

// 监听主题变化事件
const handleThemeChange = () => {
  // 确保响应式状态同步
  updateReactiveState();
  // 强制重新渲染
  setTimeout(() => {
    updateReactiveState();
  }, 50);
};

onMounted(() => {
  initTheme();
  setupSystemThemeListener();

  // 监听自定义主题变化事件
  window.addEventListener("theme-change", handleThemeChange);

  // 初始化时更新状态
  updateReactiveState();
});

onUnmounted(() => {
  window.removeEventListener("theme-change", handleThemeChange);
});
</script>
