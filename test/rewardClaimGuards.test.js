import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url);
const { canRecruitForFree, canClaimArenaPassReward, getClaimableDailyTaskIds } = await jiti.import("../src/utils/dailyRewardEligibility.ts");
const { DailyTaskRunner } = await jiti.import("../src/utils/dailyTaskRunner.ts");
const { TEMPLATE_TASK_FIELDS } = await jiti.import("../src/utils/taskTemplateConfig.ts");
const now = new Date("2026-09-09T01:00:00Z");
const pass = (rewardClaimed = {}, purchased = false) => ({ activity: { warOrderActivityInfo: { 1: { rewardClaimed, purchased } } } });
const role = quantity => ({ items: { 4203: { quantity } } });

test("game DailyTaskConf maps condition 13/12/14 to task 8/9/10, excluding claimed and unfinished tasks", () => {
  assert.deepEqual(getClaimableDailyTaskIds({1:-1,2:1,3:2,4:2,12:1,13:1,14:1}), [2,4,8,9,10]);
  assert.deepEqual(getClaimableDailyTaskIds({8:1,9:1,10:1,12:-1,13:0,14:-1}), []);
});

test("free recruitment checks actual use timestamp across Beijing midnight and rejects unknown state", () => {
  assert.equal(canRecruitForFree({},now),true);
  assert.equal(canRecruitForFree({"recruit:one:free":0},now),true);
  assert.equal(canRecruitForFree({"recruit:one:free":Date.parse("2026-09-08T15:59:59Z")/1000},now),true);
  assert.equal(canRecruitForFree({"recruit:one:free":Date.parse("2026-09-08T16:00:00Z")/1000},now),false);
  for(const value of [undefined,null]) assert.equal(canRecruitForFree(value,now),false);
  for(const value of [-1,"bad",now.getTime()/1000+1]) assert.equal(canRecruitForFree({"recruit:one:free":value},now),false);
});

test("arena pass distinguishes progress, free and paid claims, including paid-only levels", () => {
  assert.equal(canClaimArenaPassReward(role(39),pass()),false);
  assert.equal(canClaimArenaPassReward(role(40),pass()),true);
  assert.equal(canClaimArenaPassReward(role(40),pass({1:1})),false);
  assert.equal(canClaimArenaPassReward(role(40),pass({1:1},true)),true);
  assert.equal(canClaimArenaPassReward(role(40),pass({1:2},true)),false);
  const claimed = Object.fromEntries(Array.from({length:60},(_,i)=>[i+1,2]));
  assert.equal(canClaimArenaPassReward(role(2440),pass(claimed)),false);
  assert.equal(canClaimArenaPassReward(role(2440),pass(claimed,true)),true);
  assert.equal(canClaimArenaPassReward(role(5000),pass(Object.fromEntries(Array.from({length:99},(_,i)=>[i+1,2])),true)),false);
  for(const response of [{}, {activity:{}},pass(null)]) assert.equal(canClaimArenaPassReward(role(40),response),false);
  assert.equal(canClaimArenaPassReward({},pass()),false);
});

test("repeated runner execution refreshes eligibility and sends no duplicate recruitment or pass claim", async () => {
  let freeUsed=false, claimed=false;
  const calls=[];
  const settings={...Object.fromEntries(TEMPLATE_TASK_FIELDS.map(({key})=>[key,false])),freeRecruitEnable:true,battlePassEnable:true};
  const runner = new DailyTaskRunner({
    sendGetRoleInfo:async()=>({role:{...role(40),dailyTask:{complete:{4:1}},statistics:{"recruit:one:free":freeUsed?Date.now()/1000:0}}}),
    sendMessageWithPromise:async(_id,cmd)=>{
      calls.push(cmd);
      if(cmd==='activity_get')return pass(claimed?{1:1}:{});
      if(cmd==='hero_recruit')freeUsed=true;
      if(cmd==='activity_recyclewarorderrewardclaim')claimed=true;
      return {};
    }
  },{commandDelay:0,taskDelay:0});
  await runner.run('fixture',{},settings);
  await runner.run('fixture',{},settings);
  assert.equal(calls.filter(cmd=>cmd==='hero_recruit').length,1);
  assert.equal(calls.filter(cmd=>cmd==='activity_recyclewarorderrewardclaim').length,1);
  assert.equal(calls.filter(cmd=>cmd==='activity_get').length,2);
});

test("an unspent free recruit remains available even when the daily recruitment reward was claimed", async () => {
  const calls=[];
  const runner=new DailyTaskRunner({
    sendGetRoleInfo:async()=>({role:{dailyTask:{complete:{4:-1}},statistics:{"recruit:one:free":0}}}),
    sendMessageWithPromise:async(_id,cmd)=>{calls.push(cmd);return {};}
  },{commandDelay:0,taskDelay:0});
  await runner.run('fixture',{}, {...Object.fromEntries(TEMPLATE_TASK_FIELDS.map(({key})=>[key,false])),freeRecruitEnable:true});
  assert.equal(calls.filter(cmd=>cmd==='hero_recruit').length,1);
});
