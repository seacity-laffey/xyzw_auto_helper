import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";
import { createSchedulerTick } from "../src/utils/schedulerTick.js";
const jiti = createJiti(import.meta.url);
const { calculateNextScheduledRun, matchesScheduledTask, isInTaskBlackout, validateBlackoutWindows } = await jiti.import("../src/utils/batch/cronUtils.ts");
const { BUILTIN_SCHEDULE_TEMPLATES, DEFAULT_SCHEDULE_BLACKOUTS } = await jiti.import("../src/utils/batch/constants.ts");
const at = text => new Date(text);
const block = { weekday:6,start:"20:00",end:"21:00" };
const daily = { runType:"daily",runTime:"20:05",blackoutWindows:[block] };
const expectRun = (task,after,planned,actual=planned) => {
  const next=calculateNextScheduledRun(task,at(after));
  assert.equal(next?.plannedAt.getTime(),at(planned).getTime());
  assert.equal(next?.executeAt.getTime(),at(actual).getTime());
};

test("daily task inside blackout moves to five minutes before its start and never fires in the original slot",()=>{
  expectRun(daily,"2026-09-12T19:40:00","2026-09-12T20:05:00","2026-09-12T19:55:00");
  assert.equal(matchesScheduledTask(daily,at("2026-09-12T19:55:30")),true);
  assert.equal(matchesScheduledTask(daily,at("2026-09-12T20:05:00")),false);
  expectRun(daily,"2026-09-12T19:56:00","2026-09-13T20:05:00");
  assert.equal(isInTaskBlackout(daily,at("2026-09-12T20:00:00")),true);
  assert.equal(isInTaskBlackout(daily,at("2026-09-12T21:00:00")),false);
});

test("built-in templates are immutable defaults with no accounts or enabled jobs",()=>{
  assert.equal(BUILTIN_SCHEDULE_TEMPLATES.length,3);
  assert.ok(Object.isFrozen(BUILTIN_SCHEDULE_TEMPLATES));
  for(const template of BUILTIN_SCHEDULE_TEMPLATES){
    assert.ok(Object.isFrozen(template));assert.ok(Object.isFrozen(template.selectedTasks));
    assert.equal(template.enabled,undefined);assert.equal(template.selectedTokens,undefined);
  }
  assert.deepEqual(BUILTIN_SCHEDULE_TEMPLATES.map(p=>[p.intervalMinutes,[...p.selectedTasks]]),[[420,["resetBottles"]],[485,["claimHangUpRewards","batchAddHangUpTime"]],[360,["batchLegacyClaim"]]]);
});

test("six-hour legacy template repeats from its anchor and obeys weekend blackouts",()=>{
  const preset=BUILTIN_SCHEDULE_TEMPLATES.find(task=>task.id==="legacy-every-six-hours");
  const task={...preset,runType:"interval",intervalAnchor:at("2026-09-12T14:05:00").getTime(),blackoutWindows:[...DEFAULT_SCHEDULE_BLACKOUTS]};
  expectRun(task,"2026-09-12T14:05:00","2026-09-12T20:05:00","2026-09-12T19:45:00");
  assert.equal(matchesScheduledTask(task,at("2026-09-12T20:05:00")),false);
  expectRun(task,"2026-09-12T19:46:00","2026-09-13T02:05:00");
  expectRun(task,"2026-09-13T02:06:00","2026-09-13T08:05:00");
});

test("seven-hour and eight-hour-five-minute intervals retain their anchors after early execution",()=>{
  const bottle={runType:"interval",intervalMinutes:420,intervalAnchor:at("2026-09-12T13:05:00").getTime(),blackoutWindows:[...DEFAULT_SCHEDULE_BLACKOUTS]};
  expectRun(bottle,"2026-09-12T19:40:00","2026-09-12T20:05:00","2026-09-12T19:45:00");
  expectRun(bottle,"2026-09-12T19:46:00","2026-09-13T03:05:00");
  const hangup={...bottle,intervalMinutes:485,intervalAnchor:at("2026-09-12T12:00:00").getTime()};
  expectRun(hangup,"2026-09-12T19:40:00","2026-09-12T20:05:00","2026-09-12T19:45:00");
  expectRun(hangup,"2026-09-12T19:46:00","2026-09-13T04:10:00");
  assert.equal(matchesScheduledTask(hangup,at("2026-09-13T04:10:50")),true);
  expectRun({...daily,blackoutWindows:[...DEFAULT_SCHEDULE_BLACKOUTS]},"2026-09-13T19:40:00","2026-09-13T20:05:00","2026-09-13T19:45:00");
});

test("overnight, overlapping and chained blackout windows move to an allowed time",()=>{
  expectRun({...daily,runTime:"00:20",blackoutWindows:[{weekday:6,start:"23:00",end:"01:00"}]},"2026-09-12T22:00:00","2026-09-13T00:20:00","2026-09-12T22:55:00");
  expectRun({...daily,runTime:"21:30",blackoutWindows:[block,{weekday:6,start:"20:30",end:"22:00"}]},"2026-09-12T19:00:00","2026-09-12T21:30:00","2026-09-12T19:55:00");
  expectRun({...daily,runTime:"21:10",blackoutWindows:[block,{weekday:6,start:"21:03",end:"21:30"}]},"2026-09-12T19:00:00","2026-09-12T21:10:00","2026-09-12T19:55:00");
});

test("cron planning includes early runs that move ahead of a nearer ordinary run",()=>{
  const task={runType:"cron",cronExpression:"5,58 19,20 * * *",blackoutWindows:[block]};
  expectRun(task,"2026-09-12T19:50:00","2026-09-12T20:05:00","2026-09-12T19:55:00");
  expectRun(task,"2026-09-12T19:55:01","2026-09-12T19:58:00");
  assert.equal(matchesScheduledTask(task,at("2026-09-12T19:55:00")),true);
  assert.equal(matchesScheduledTask(task,at("2026-09-12T19:58:00")),true);
  assert.equal(matchesScheduledTask(task,at("2026-09-12T20:58:00")),false);
});

test("invalid intervals and blackout settings never dispatch",()=>{
  for(const intervalMinutes of [0,-1,NaN,1.5])assert.equal(calculateNextScheduledRun({runType:"interval",intervalMinutes,intervalAnchor:1}),null);
  assert.ok(validateBlackoutWindows([{weekday:7,start:"20:00",end:"21:00"}]));
  assert.ok(validateBlackoutWindows([{weekday:6,start:"25:00",end:"21:00"}]));
  assert.ok(validateBlackoutWindows([{weekday:6,start:"20:00",end:"20:00"}]));
  assert.equal(matchesScheduledTask({...daily,blackoutWindows:{}},at("2026-09-12T20:05:00")),false);
});

test("early scheduled slot runs once across ticks and reloads",async()=>{
  let time=at("2026-09-12T19:55:01").getTime();const saved=new Map();const calls=[];
  const options={tasks:()=>[{...daily,id:"test",enabled:true}],matches:matchesScheduledTask,execute:async task=>calls.push(task.id),storage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)},busy:()=>false,onError:error=>{throw error;},now:()=>time};
  const tick=createSchedulerTick(options);await tick();time+=10000;await tick();await createSchedulerTick(options)();
  assert.deepEqual(calls,["test"]);
});
