import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    component: () => import("@/layout/DefaultLayout.vue"),
    children: [
      {
        path: "",
        redirect: "/batch-tasks",
      },
      {
        path: "/tokens",
        name: "TokenManagement",
        component: () => import("@/views/TokenImport/index.vue"),
        meta: {
          title: "账号管理",
          description: "账号凭证与连接管理",
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
        path: "/role",
        name: "RoleManagement",
        component: () => import("@/views/GameFeatures.vue"),
        meta: {
          title: "角色详情",
          description: "当前角色功能与状态",
        },
      },
      {
        path: "/batch-tasks",
        name: "BatchTasks",
        component: () => import("@/views/BatchDailyTasks.vue"),
        meta: {
          title: "批量任务",
          description: "多账号任务编排与执行",
          immersive: true,
        },
      },
      {
        path: "/pushing-levels",
        name: "PushingLevels",
        component: () => import("@/views/PushingLevels.vue"),
        meta: {
          title: "主线推关",
          description: "多账号主线战斗与火把管理",
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
    },
  },
  // 兼容历史链接，但不再保留额外页面。
  { path: "/admin", redirect: "/batch-tasks" },
  { path: "/admin/dashboard", redirect: "/batch-tasks" },
  { path: "/admin/batch-daily-tasks", redirect: "/batch-tasks" },
  { path: "/admin/daily-tasks", redirect: "/role" },
  { path: "/admin/game-features", redirect: "/role" },
  { path: "/admin/profile", redirect: "/role" },
  { path: "/admin/message-test", redirect: "/role" },
  { path: "/admin/legion-war", redirect: "/role" },
  { path: "/admin/PushingLevels", redirect: "/pushing-levels" },
  { path: "/admin/pushing-levels", redirect: "/pushing-levels" },
  { path: "/websocket-test", redirect: "/role" },
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

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} - XYZW 游戏助手`
    : "XYZW 游戏助手";
});

export default router;
