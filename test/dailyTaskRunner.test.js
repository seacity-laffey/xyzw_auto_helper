import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { DailyTaskRunner } = await jiti.import("../src/utils/dailyTaskRunner.ts");
const { createDefaultTemplateSettings, TEMPLATE_TASK_FIELDS } = await jiti.import("../src/utils/taskTemplateConfig.ts");

test("an empty template suppresses every operation including previously fixed tasks", async () => {
  const settings = createDefaultTemplateSettings();
  TEMPLATE_TASK_FIELDS.forEach(({ key }) => { settings[key] = false; });
  const calls = [];
  const runner = new DailyTaskRunner({
    gameTokens: [],
    sendGetRoleInfo: async () => ({ role: { statistics: {}, statisticsTime: {}, dailyTask: { complete: { 1: 1 }, dailyPoint: 100, weekPoint: 1000 }, cardTime: { 1: {}, 4003: {} } } }),
    sendMessageWithPromise: async (_id, cmd) => {
      calls.push(cmd);
      return { storeInfo: { freeRewardTime: 0 }, discountList: [{ discountId: 1, discountState: 1 }] };
    },
  }, { commandDelay: 0, taskDelay: 0 });
  await runner.run("empty", {}, settings);
  assert.ok(calls.every(cmd => ["presetteam_getinfo", "discount_getdiscountinfo", "collection_goodslist"].includes(cmd)), calls.join(","));
});

test("dream purchase uses only the resolved list and respects the template switch", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 9, 12) });
  const settings = createDefaultTemplateSettings();
  TEMPLATE_TASK_FIELDS.forEach(({ key }) => { settings[key] = false; });
  settings.dreamPurchaseList = ["2-6"];
  const calls = [];
  const runner = new DailyTaskRunner({
    gameTokens: [],
    sendGetRoleInfo: async () => ({ role: { levelId: 8001, statistics: {}, statisticsTime: {}, dungeon: { merchant: { 1: [5], 2: [6, 7, 6] } } } }),
    sendMessageWithPromise: async (_id, cmd, params) => { if (cmd === "dungeon_buymerchant") calls.push(params); return {}; },
  }, { commandDelay: 0, taskDelay: 0 });
  await runner.run("test", {}, settings);
  assert.deepEqual(calls, []);
  settings.dreamPurchaseEnable = true;
  await runner.run("test", {}, settings);
  assert.deepEqual(calls, [{ id: 2, index: 6, pos: 2 }, { id: 2, index: 6, pos: 0 }]);
});

const todaySeconds = Math.floor(Date.now() / 1000);

const createRole = () => ({
  dailyTask: {
    complete: Object.fromEntries(Array.from({ length: 14 }, (_, index) => [index + 1, -1])),
  },
  statistics: {
    "artifact:normal:lottery:time": todaySeconds,
    "legion:boss": 0,
  },
  statisticsTime: {
    "buy:gold": todaySeconds,
    "genie:daily:free:1": todaySeconds,
    "genie:daily:free:2": todaySeconds,
    "genie:daily:free:3": todaySeconds,
    "genie:daily:free:4": todaySeconds,
    "genie:daily:free:5": todaySeconds,
  },
});

const createSettings = (freeGachaEnable) => ({
  arenaEnable: false,
  arenaFormation: 1,
  blackMarketPurchase: false,
  bossFormation: 1,
  bossTimes: 0,
  claimBottle: false,
  claimEmail: false,
  claimHangUp: false,
  freeGachaEnable,
  openBox: false,
  payRecruit: false,
});

const runWithGachaSetting = async (freeGachaEnable) => {
  const commands = [];
  const tokenStore = {
    gameTokens: [{ id: "token-1", name: "测试账号" }],
    sendGetRoleInfo: async () => ({ role: createRole() }),
    sendMessageWithPromise: async (_tokenId, command) => {
      commands.push(command);
      if (command === "presetteam_getinfo")
        return { presetTeamInfo: { useTeamId: 1 } };
      return {};
    },
  };
  const runner = new DailyTaskRunner(tokenStore, { commandDelay: 0, taskDelay: 0 });
  await runner.run("token-1", {}, createSettings(freeGachaEnable));
  return commands;
};

const runActivityTasks = async (role) => {
  const calls = [];
  const runner = new DailyTaskRunner({
    gameTokens: [{ id: "token-1", name: "测试账号" }],
    sendGetRoleInfo: async () => ({ role }),
    sendMessageWithPromise: async (_id, command, params) => {
      calls.push({ command, params });
      return {};
    },
  }, { commandDelay: 0, taskDelay: 0 });
  await runner.run("token-1", {}, createSettings(true));
  return calls.filter(({ command }) => [
    "gacha_drawreward", "genie_buysweep", "genie_sweep", "dungeon_selecthero",
  ].includes(command));
};

test("captured Monday role skips claimed tickets, started dream and unavailable deep sea", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 7, 22) });
  const role = createRole();
  role.statistics["genie:sweep:buy"] = 3;
  role.statisticsTime["genie:sweep:buy"] = 1788748581;
  delete role.statisticsTime["genie:daily:free:5"];
  for (let id = 1; id <= 4; id++)
    role.statisticsTime[`genie:daily:free:${id}`] = 1788748581;
  role.genie = { 1: 8, 2: 4, 3: 6, 4: 14 };
  role.dungeon = { beginTime: 1788624000, id: 161, battleTeam: { 0: { heroId: 107 } } };
  assert.deepEqual(await runActivityTasks(role), []);
});

test("free gacha reads its claim timestamp from statistics", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 8, 12) });
  const role = createRole();
  role.statistics["gacha:free"] = Date.now() / 1000;
  assert.equal((await runActivityTasks(role)).some(({ command }) => command === "gacha_drawreward"), false);
});

test("daily runner only requests remaining free tickets", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 7, 22) });
  const role = createRole();
  role.statistics["genie:sweep:buy"] = 2;
  role.statisticsTime["genie:sweep:buy"] = 1788748581;
  const calls = await runActivityTasks(role);
  assert.equal(calls.filter(({ command }) => command === "genie_buysweep").length, 1);
});

test("daily runner skips free gacha when the account setting is disabled", async () => {
  const commands = await runWithGachaSetting(false);
  assert.equal(commands.includes("gacha_drawreward"), false);
});

test("daily runner performs one free gacha when enabled on an open day", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 8, 12) });
  const commands = await runWithGachaSetting(true);
  assert.equal(commands.filter((command) => command === "gacha_drawreward").length, 1);
});

test("daily runner skips free gacha on Monday even when enabled", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 8, 7, 12) });
  const commands = await runWithGachaSetting(true);
  assert.equal(commands.includes("gacha_drawreward"), false);
});

const runBlackMarketTask = async (purchaseConfig) => {
  const calls = [];
  const role = createRole();
  role.dailyTask.complete[12] = 0;
  const tokenStore = {
    gameTokens: [{ id: "token-1", name: "测试账号" }],
    sendGetRoleInfo: async () => ({ role }),
    sendMessageWithPromise: async (_tokenId, command, params) => {
      calls.push({ command, params });
      if (command === "presetteam_getinfo")
        return { presetTeamInfo: { useTeamId: 1 } };
      if (command === "store_getpurchase")
        return purchaseConfig;
      return {};
    },
  };
  const settings = {
    ...createSettings(false),
    blackMarketPurchase: true,
  };
  const runner = new DailyTaskRunner(tokenStore, { commandDelay: 0, taskDelay: 0 });
  await runner.run("token-1", {}, settings);
  return calls;
};

test("daily runner reads game black market config and sends an empty purchase body", async () => {
  const calls = await runBlackMarketTask({
    purchaseCnt: 2,
    purchaseItemList: [{ itemId: 1012, discount: 1 }],
  });
  const storeCalls = calls.filter(({ command }) => command.startsWith("store_"));
  assert.deepEqual(storeCalls, [
    { command: "store_getpurchase", params: {} },
    { command: "store_purchase", params: {} },
  ]);
});

test("daily runner skips black market purchase when the game config is empty", async () => {
  const calls = await runBlackMarketTask({
    purchaseCnt: 0,
    purchaseItemList: [],
  });
  assert.equal(calls.some(({ command }) => command === "store_purchase"), false);
});

const runTaskRewardClaims = async (complete) => {
  const calls = [];
  const role = createRole();
  role.dailyTask.complete = complete;
  const tokenStore = {
    gameTokens: [{ id: "token-1", name: "测试账号" }],
    sendGetRoleInfo: async () => ({ role }),
    sendMessageWithPromise: async (_tokenId, command, params) => {
      calls.push({ command, params });
      if (command === "presetteam_getinfo")
        return { presetTeamInfo: { useTeamId: 1 } };
      return {};
    },
  };
  const runner = new DailyTaskRunner(tokenStore, { commandDelay: 0, taskDelay: 0 });
  await runner.run("token-1", {}, createSettings(false));
  return calls.filter(({ command }) => command === "task_claimdailypoint");
};

test("daily runner does not request task rewards that are missing or already claimed", async () => {
  const calls = await runTaskRewardClaims({ 1: -1, 2: 0, 3: -1 });
  assert.deepEqual(calls, []);
});

test("daily runner requests only task rewards with positive unclaimed state", async () => {
  const calls = await runTaskRewardClaims({ 1: -1, 2: 0, 5: 5 });
  assert.deepEqual(calls, [{ command: "task_claimdailypoint", params: { taskId: 5 } }]);
});

test("daily runner skips summary and fixed rewards already claimed today", async () => {
  const calls = [];
  const role = createRole();
  role.dailyTask.dailyPoint = 110;
  role.dailyTask.weekPoint = 110;
  role.dailyTask.dailyReward = { 1: true, 2: true, 3: true, 4: true, 5: true };
  role.dailyTask.weekReward = { 1: true };
  role.signInReward = { 15: todaySeconds };
  role.cardTime = { 1: { lastClaimTime: todaySeconds } };
  role.statisticsTime["legion:sign:in"] = todaySeconds;
  const tokenStore = {
    gameTokens: [{ id: "token-1", name: "测试账号" }],
    sendGetRoleInfo: async () => ({ role }),
    sendMessageWithPromise: async (_tokenId, command, params) => {
      calls.push({ command, params });
      if (command === "presetteam_getinfo")
        return { presetTeamInfo: { useTeamId: 1 } };
      if (command === "discount_getdiscountinfo") {
        return { discountList: [{ discountId: 1, discountState: 3 }] };
      }
      if (command === "collection_goodslist")
        return { storeInfo: { freeRewardTime: todaySeconds } };
      if (command === "mail_getlist") {
        return {
          list: [{ state: 3, haveAttachments: true, attachments: [{ id: 1 }] }],
        };
      }
      return {};
    },
  };
  const runner = new DailyTaskRunner(tokenStore, { commandDelay: 0, taskDelay: 0 });
  await runner.run("token-1", {}, { ...createSettings(false), claimEmail: true });

  const claimCommands = new Set([
    "card_claimreward",
    "collection_claimfreereward",
    "discount_claimreward",
    "legion_signin",
    "mail_claimallattachment",
    "system_signinreward",
    "task_claimdailyreward",
    "task_claimweekreward",
  ]);
  assert.deepEqual(calls.filter(({ command }) => claimCommands.has(command)), []);
});

test("daily runner sends only explicitly claimable summary and fixed rewards", async () => {
  const calls = [];
  const yesterdaySeconds = todaySeconds - 86400;
  const role = createRole();
  role.dailyTask.dailyPoint = 110;
  role.dailyTask.weekPoint = 210;
  role.dailyTask.dailyReward = { 1: true, 2: true, 3: true, 4: true };
  role.dailyTask.weekReward = { 1: true };
  role.signInReward = { 14: yesterdaySeconds };
  role.cardTime = {
    1: { lastClaimTime: yesterdaySeconds },
    4003: { lastClaimTime: yesterdaySeconds },
  };
  role.statisticsTime["legion:sign:in"] = yesterdaySeconds;
  const tokenStore = {
    gameTokens: [{ id: "token-1", name: "测试账号" }],
    sendGetRoleInfo: async () => ({ role }),
    sendMessageWithPromise: async (_tokenId, command, params) => {
      calls.push({ command, params });
      if (command === "presetteam_getinfo")
        return { presetTeamInfo: { useTeamId: 1 } };
      if (command === "discount_getdiscountinfo") {
        return { discountList: [{ discountId: 1, discountState: 2 }] };
      }
      if (command === "collection_goodslist")
        return { storeInfo: { freeRewardTime: yesterdaySeconds } };
      if (command === "mail_getlist") {
        return {
          list: [{ state: 1, haveAttachments: true, attachments: [{ id: 1 }] }],
        };
      }
      return {};
    },
  };
  const runner = new DailyTaskRunner(tokenStore, { commandDelay: 0, taskDelay: 0 });
  await runner.run("token-1", {}, { ...createSettings(false), claimEmail: true });

  const expectedCommands = [
    ["system_signinreward", {}],
    ["legion_signin", {}],
    ["discount_claimreward", { discountId: 1 }],
    ["collection_claimfreereward", {}],
    ["card_claimreward", { cardId: 1 }],
    ["card_claimreward", { cardId: 4003 }],
    ["mail_claimallattachment", {}],
    ["task_claimdailyreward", {}],
    ["task_claimweekreward", {}],
  ];
  assert.deepEqual(
    calls
      .filter(({ command }) => expectedCommands.some(([expected]) => expected === command))
      .map(({ command, params }) => [command, params]),
    expectedCommands,
  );
});
