import { createRouter, createWebHistory } from "vue-router";
import { useTokenStore } from "@/stores/tokenStore";

const routes = [
  {
    path: "/",
    component: () => import("@/layout/DefaultLayout.vue"),
    children: [
      {
        path: "",
        redirect: "/tokens",
      },
      {
        path: "/tokens",
        name: "TokenManagement",
        component: () => import("@/views/TokenImport/index.vue"),
        meta: {
          title: "Token 管理",
          description: "账号凭证与连接管理",
          requiresToken: false,
        },
        props: (route) => ({
          token: route.query.token,
          name: route.query.name,
          server: route.query.server,
          wsUrl: route.query.wsUrl,
          api: route.query.api,
          auto: route.query.auto === "true",
        }),
      },
      {
        path: "/admin/game-features",
        name: "RoleManagement",
        component: () => import("@/views/GameFeatures.vue"),
        meta: {
          title: "单个角色",
          description: "当前角色功能与状态",
          requiresToken: true,
        },
      },
      {
        path: "/admin/batch-daily-tasks",
        name: "BatchTasks",
        component: () => import("@/views/BatchDailyTasks.vue"),
        meta: {
          title: "批量任务",
          description: "多账号任务编排与执行",
          requiresToken: true,
          immersive: true,
        },
      },
      {
        path: "/admin/pushing-levels",
        name: "PushingLevels",
        component: () => import("@/views/PushingLevels.vue"),
        meta: {
          title: "主线推关",
          description: "多账号主线战斗与火把管理",
          requiresToken: true,
          immersive: true,
        },
      },
    ],
  },
  {
    path: "/game",
    name: "GamePlayer",
    component: () => import("@/views/GamePlayer.vue"),
    meta: {
      title: "游戏",
      requiresToken: true,
    },
  },
  // 兼容历史链接，但不再保留额外页面。
  { path: "/admin", redirect: "/admin/game-features" },
  { path: "/admin/dashboard", redirect: "/admin/game-features" },
  { path: "/admin/daily-tasks", redirect: "/admin/game-features" },
  { path: "/admin/profile", redirect: "/admin/game-features" },
  { path: "/admin/message-test", redirect: "/admin/game-features" },
  { path: "/admin/legion-war", redirect: "/admin/game-features" },
  { path: "/admin/PushingLevels", redirect: "/admin/pushing-levels" },
  { path: "/websocket-test", redirect: "/admin/game-features" },
  { path: "/login", redirect: "/tokens" },
  { path: "/register", redirect: "/tokens" },
  { path: "/game-roles", redirect: "/tokens" },
  { path: "/:pathMatch(.*)*", redirect: "/tokens" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { top: 0 };
  },
});

router.beforeEach((to) => {
  const tokenStore = useTokenStore();

  document.title = to.meta.title
    ? `${to.meta.title} - XYZW 游戏助手`
    : "XYZW 游戏助手";

  if (to.meta.requiresToken && !tokenStore.hasTokens) {
    return {
      path: "/tokens",
      query: { blocked: to.fullPath },
      replace: true,
    };
  }

  if (to.meta.requiresToken && !tokenStore.selectedToken) {
    const firstToken = tokenStore.gameTokens[0];
    if (firstToken) {
      tokenStore.selectToken(firstToken.id);
    }
  }

  return true;
});

export default router;
