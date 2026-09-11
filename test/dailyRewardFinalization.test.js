import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url);
const { DailyTaskRunner } = await jiti.import("../src/utils/dailyTaskRunner.ts");
const { createDefaultTemplateSettings, TEMPLATE_TASK_FIELDS } = await jiti.import("../src/utils/taskTemplateConfig.ts");
const disabledSettings = () => ({
  ...createDefaultTemplateSettings(),
  ...Object.fromEntries(TEMPLATE_TASK_FIELDS.map(({ key }) => [key, false])),
});
const initialRole = () => ({ items: { 4203: { quantity: 40 } }, level: 6000, levelId: 8001, dailyTask: { complete: { 2: 0 }, dailyPoint: 5, weekPoint: 85 } });
const createRunner = (options = {}) => {
  const role = structuredClone(options.role || initialRole());
  let reads = 0;
  const calls = [], logs = [];
  const runner = new DailyTaskRunner({
    gameTokens: [{ id: "a", name: "账号A" }],
    sendGetRoleInfo: async () => {
      reads++;
      calls.push(["role_getroleinfo"]);
      if (options.badRead === reads) return {};
      if (reads > 1 && options.freshRole) return { role: structuredClone(options.freshRole) };
      return { role: structuredClone(role) };
    },
    sendMessageWithPromise: async (_id, cmd, params) => {
      calls.push([cmd, params]);
      if (cmd === options.failedCommand || (cmd === "task_claimdailypoint" && params.taskId === options.failedTaskId)) throw new Error("fixture failure");
      if (cmd === "activity_get") return { activity: { warOrderActivityInfo: { 1: { purchased: false, rewardClaimed: {} } } } };
      if (cmd === "system_mysharecallback") role.dailyTask.complete[2] = 1;
      if (cmd === "task_claimdailypoint") {
        role.dailyTask.complete[({ 8: 13, 9: 12, 10: 14 })[params.taskId] || params.taskId] = -1;
        role.dailyTask.dailyPoint = 20;
        role.dailyTask.weekPoint = 100;
      }
      return {};
    },
  }, { commandDelay: 0, taskDelay: 0 });
  return { calls, logs, run: settings => runner.run("a", { onLog: log => logs.push(log) }, { ...disabledSettings(), ...settings }) };
};

test("newly finished tasks are claimed before refreshing earned daily and weekly rewards at the end", async () => {
  const s = createRunner();
  await s.run({ shareEnable: true, battlePassEnable: true, dailyPointEnable: true, dailyRewardEnable: true, weeklyRewardEnable: true });
  assert.deepEqual(s.calls.filter(([cmd]) => cmd === "role_getroleinfo" || cmd.startsWith("task_") || cmd === "system_mysharecallback" || cmd === "activity_recyclewarorderrewardclaim"), [
    ["role_getroleinfo"],
    ["system_mysharecallback", { isSkipShareCard: true, type: 2 }],
    ["role_getroleinfo"],
    ["activity_recyclewarorderrewardclaim", { actId: 1 }],
    ["role_getroleinfo"],
    ["task_claimdailypoint", { taskId: 2 }],
    ["role_getroleinfo"],
    ["task_claimdailyreward", {}],
    ["task_claimweekreward", {}],
  ]);
});

test("partial progress is not claimable; black market, arena and bottle task IDs are included", async () => {
  const role = initialRole();
  role.dailyTask.complete = { 1: -1, 2: 0, 3: 2, 4: 1, 5: 4, 6: 2, 7: 2, 12: 1, 13: 1, 14: 1, 99: 100 };
  const s = createRunner({ role });
  await s.run({ dailyPointEnable: true });
  assert.deepEqual(s.calls.filter(([cmd]) => cmd === "task_claimdailypoint").map(([, p]) => p.taskId), [8, 9, 10]);
});

for (const badRead of [2, 3]) {
  test(`missing fresh state at read ${badRead} never falls back to old reward state`, async () => {
    const role = initialRole();
    role.dailyTask = { complete: { 2: 1 }, dailyPoint: 100, weekPoint: 500 };
    const s = createRunner({ role, badRead });
    await s.run({ dailyPointEnable: true, dailyRewardEnable: true, weeklyRewardEnable: true });
    assert.equal(s.calls.some(([cmd]) => cmd === "task_claimdailyreward" || cmd === "task_claimweekreward"), false);
    assert.equal(s.calls.some(([cmd]) => cmd === "task_claimdailypoint"), badRead === 3);
    assert.ok(s.logs.some(log => log.type === "error"));
  });
}

test("one failed item claim does not prevent other claims or a fresh summary check", async () => {
  const role = initialRole();
  role.dailyTask.complete = { 2: 1, 12: 1 };
  const s = createRunner({ role, failedTaskId: 2 });
  await s.run({ dailyPointEnable: true, dailyRewardEnable: true, weeklyRewardEnable: true });
  assert.deepEqual(s.calls.filter(([cmd]) => cmd === "task_claimdailypoint").map(([, p]) => p.taskId), [2, 9]);
  assert.equal(s.calls.filter(([cmd]) => cmd === "role_getroleinfo").length, 3);
  assert.equal(s.calls.some(([cmd]) => cmd === "task_claimdailyreward"), true);
  assert.ok(s.logs.some(log => log.message.includes("fixture failure")));
});

test("failed daily activity claim does not prevent claiming weekly activity", async () => {
  const role = initialRole();
  role.dailyTask.dailyPoint = 100;
  role.dailyTask.weekPoint = 500;
  const s = createRunner({ role, failedCommand: "task_claimdailyreward" });
  await s.run({ dailyRewardEnable: true, weeklyRewardEnable: true });
  assert.equal(s.calls.some(([cmd]) => cmd === "task_claimweekreward"), true);
  assert.ok(s.logs.some(log => log.message.includes("fixture failure")));
});

test("disabled reward settings neither refresh nor claim", async () => {
  const s = createRunner(); await s.run({});
  assert.equal(s.calls.filter(([cmd]) => cmd === "role_getroleinfo").length, 1);
  assert.equal(s.calls.some(([cmd]) => cmd.startsWith("task_claim")), false);
});

test("legacy is enabled in default templates and skips locked or unknown accounts", async () => {
  assert.equal(createDefaultTemplateSettings().legacyClaimEnable, true);
  for (const [level, levelId, expected] of [[6000, 8001, true], [5999, 8001, false], [6000, 8000, false], [undefined, undefined, false]]) {
    const s = createRunner({ role: { ...initialRole(), level, levelId } });
    await s.run({ legacyClaimEnable: true });
    assert.equal(s.calls.filter(([cmd]) => cmd === "legacy_claimhangup").length, expected ? 1 : 0);
    assert.equal(s.calls.some(([cmd]) => cmd.includes("peach")), false);
  }
  const s = createRunner(); await s.run({ legacyClaimEnable: false });
  assert.equal(s.calls.some(([cmd]) => cmd === "legacy_claimhangup"), false);
});

test("all runner logs include the account once, including failed commands", async () => {
  const s = createRunner({ failedCommand: "system_mysharecallback" });
  await s.run({ shareEnable: true });
  assert.ok(s.logs.length > 0);
  assert.ok(s.logs.every(log => log.message.startsWith("[账号A] ")));
  assert.ok(s.logs.every(log => log.message.split("[账号A]").length === 2));
});

test("daily legacy claims use the fresh server unlock state and never fall back when it is missing", async () => {
  for (const [start, fresh, expected] of [[5999,6000,true],[6000,5999,false]]) {
    const s=createRunner({role:{...initialRole(),level:start},freshRole:{...initialRole(),level:fresh}});
    await s.run({legacyClaimEnable:true});
    assert.equal(s.calls.filter(([cmd])=>cmd==="role_getroleinfo").length,2);
    assert.equal(s.calls.some(([cmd])=>cmd==="legacy_claimhangup"),expected);
  }
  const s=createRunner({badRead:2});
  await s.run({legacyClaimEnable:true});
  assert.equal(s.calls.some(([cmd])=>cmd==="legacy_claimhangup"),false);
});
