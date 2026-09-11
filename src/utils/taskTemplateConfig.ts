export const SYSTEM_TEMPLATE_ID = "system-default";

export const TEMPLATE_TASK_FIELDS = [
  { key: "shareEnable", label: "分享游戏" },
  { key: "friendGoldEnable", label: "赠送好友金币" },
  { key: "freeRecruitEnable", label: "免费招募" },
  { key: "payRecruit", label: "付费招募" },
  { key: "freeGoldEnable", label: "免费点金" },
  { key: "claimHangUp", label: "领取挂机奖励及加钟" },
  { key: "openBox", label: "开启木质宝箱10个" },
  { key: "bottleTimerEnable", label: "重置盐罐计时" },
  { key: "claimBottle", label: "领取盐罐奖励" },
  { key: "arenaEnable", label: "竞技场战斗" },
  { key: "legionBossEnable", label: "军团BOSS" },
  { key: "dailyBossEnable", label: "每日BOSS" },
  { key: "systemSignEnable", label: "福利签到" },
  { key: "clubSignEnable", label: "俱乐部签到" },
  { key: "discountEnable", label: "每日特惠礼包" },
  { key: "collectionEnable", label: "珍宝阁免费礼包" },
  { key: "cardRewardEnable", label: "免费卡礼包" },
  { key: "permanentCardEnable", label: "永久卡礼包" },
  { key: "claimEmail", label: "领取邮件奖励" },
  { key: "freeGachaEnable", label: "免费扭蛋" },
  { key: "freeFishEnable", label: "免费钓鱼" },
  { key: "freeGenieEnable", label: "四国灯神免费扫荡" },
  { key: "freeSweepTicketsEnable", label: "领取免费扫荡券" },
  { key: "blackMarketPurchase", label: "黑市采购（账号游戏内配置）" },
  { key: "dreamEnable", label: "咸王梦境" },
  { key: "deepSeaEnable", label: "深海免费扫荡" },
  { key: "legacyClaimEnable", label: "领取功法残卷（解锁后）" },
  { key: "dailyPointEnable", label: "领取单项任务奖励" },
  { key: "dailyRewardEnable", label: "领取日常积分奖励" },
  { key: "weeklyRewardEnable", label: "领取周常积分奖励" },
  { key: "battlePassEnable", label: "领取通行证奖励" },
  { key: "dreamPurchaseEnable", label: "梦境商店购买" },
] as const;

export const createDefaultTemplateSettings = () => ({
  ...Object.fromEntries(TEMPLATE_TASK_FIELDS.map(({ key }) => [key, key !== "dreamPurchaseEnable"])),
  arenaEnable: true,
  arenaFormation: 1,
  towerFormation: 1,
  bossFormation: 1,
  bossTimes: 2,
  claimBottle: true,
  payRecruit: true,
  openBox: true,
  claimHangUp: true,
  claimEmail: true,
  blackMarketPurchase: true,
  freeGachaEnable: true,
  dreamPurchaseEnable: false,
  dreamPurchaseList: [] as string[],
});

export interface TaskTemplate {
  id: string;
  name: string;
  settings: ReturnType<typeof createDefaultTemplateSettings>;
  createdAt: string;
  updatedAt?: string;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const read = (key: string, fallback: any) => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
};
const normalize = (settings: any = {}) => {
  const defaults = createDefaultTemplateSettings();
  return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [
    key,
    key === "dreamPurchaseList" ? (Array.isArray(settings[key]) ? [...settings[key]] : []) : (settings[key] ?? value),
  ])) as typeof defaults;
};

export const loadTaskTemplates = (): TaskTemplate[] => {
  const saved = read("task-templates", []);
  if (!Array.isArray(saved))
    throw new Error("任务模板数据格式错误");
  const templates = saved.map((template) => ({ ...template, settings: normalize(template.settings) }));
  if (!templates.some((template) => template.id === SYSTEM_TEMPLATE_ID)) {
    templates.unshift({ id: SYSTEM_TEMPLATE_ID, name: "系统默认模板", createdAt: new Date().toISOString(), settings: createDefaultTemplateSettings() });
  }
  return templates;
};

export const saveTaskTemplates = (templates: TaskTemplate[]) => {
  if (!templates.some((template) => template.id === SYSTEM_TEMPLATE_ID))
    throw new Error("系统默认模板不能删除");
  localStorage.setItem("task-templates", JSON.stringify(templates));
};

// 迁移保留旧的有效设置；原始数据单独备份，绑定标记保证重复读取不会再次迁移。
export const migrateTaskAccounts = (accounts: Array<{ id: string; name?: string }>) => {
  const templates = loadTaskTemplates();
  const runtime = read("batchSettings", {});
  const changes: Array<[string, any]> = [];
  const backup = read("task-template-migration-backup:v1", { templates: read("task-templates", []), runtime, accounts: {} });
  for (const account of accounts) {
    const key = `daily-settings:${account.id}`;
    const saved = read(key, null);
    if (saved?.templateBindingVersion === 1)
      continue;
    backup.accounts[account.id] ??= clone(saved);
    let templateId = SYSTEM_TEMPLATE_ID;
    if (saved) {
      const effective = normalize(saved);
      const inherited = Array.isArray(runtime.dreamPurchaseList) ? runtime.dreamPurchaseList : [];
      effective.dreamPurchaseList = inherited;
      const sameSettings = (template: TaskTemplate) => JSON.stringify(normalize(template.settings)) === JSON.stringify(effective);
      const matched = templates.find((template) => template.id === saved.templateId && sameSettings(template))
        || templates.find(sameSettings);
      templateId = matched?.id || `migrated:${account.id}`;
      if (!matched && !templates.some((template) => template.id === templateId)) {
        templates.push({ id: templateId, name: `${account.name || account.id} · 迁移配置`, settings: effective, createdAt: new Date().toISOString() });
      }
    }
    changes.push([key, {
      ...saved,
      templateId,
      templateBindingVersion: 1,
      dreamPurchaseList: Array.isArray(saved?.dreamPurchaseList) ? [...saved.dreamPurchaseList] : null,
    }]);
  }
  if (changes.length) {
    localStorage.setItem("task-template-migration-backup:v1", JSON.stringify(backup));
    saveTaskTemplates(templates);
    changes.forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
  }
};

export const loadAccountTaskBinding = (tokenId: string) => {
  let saved = read(`daily-settings:${tokenId}`, {});
  if (saved?.templateBindingVersion !== 1) {
    migrateTaskAccounts([{ id: tokenId }]);
    saved = read(`daily-settings:${tokenId}`, {});
  }
  return { templateId: saved.templateId || SYSTEM_TEMPLATE_ID, dreamPurchaseList: Array.isArray(saved.dreamPurchaseList) ? [...saved.dreamPurchaseList] as string[] : null };
};

export const saveAccountTaskBinding = (tokenId: string, binding: { templateId: string; dreamPurchaseList: string[] | null }) => {
  if (!loadTaskTemplates().some((template) => template.id === binding.templateId))
    throw new Error("绑定的模板不存在，请重新选择");
  const saved = read(`daily-settings:${tokenId}`, {});
  localStorage.setItem(`daily-settings:${tokenId}`, JSON.stringify({ ...saved, ...clone(binding), templateBindingVersion: 1 }));
};

export const resolveAccountTaskSettings = (tokenId: string) => {
  const binding = loadAccountTaskBinding(tokenId);
  const template = loadTaskTemplates().find((item) => item.id === binding.templateId);
  if (!template)
    throw new Error("账号绑定的模板已不存在，请重新绑定后执行");
  return clone({
    ...template.settings,
    templateId: template.id,
    templateName: template.name,
    dreamPurchaseSource: binding.dreamPurchaseList === null ? "模板采购清单" : "账号专属清单",
    dreamPurchaseList: binding.dreamPurchaseList ?? template.settings.dreamPurchaseList,
  });
};

export const getTemplateTaskSummary = (settings: Record<string, any>) =>
  TEMPLATE_TASK_FIELDS.filter(({ key }) => settings[key] !== false && (key !== "legionBossEnable" || settings.bossTimes > 0)).map(({ label }) => label);
