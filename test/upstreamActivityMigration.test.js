import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import { resolveOpenApexRounds, fetchApexPages } from '../src/utils/apexRequests.js';
import { buildCampMembers, getCampMatchDate, getCampRecordRows } from '../src/utils/campChallengeData.js';
import { buildTowerEnergyPurchase } from '../src/utils/towerEnergyPurchase.js';
const jiti = createJiti(import.meta.url, { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } });
const { runBatchActivity } = await jiti.import('../src/utils/batch/activityRunner.ts');
const { createTasksCampChallenge } = await jiti.import('../src/utils/batch/tasksCampChallenge.ts');
const { buildRoleBin, getBinPayload, getRoleBinFileName, normalizeBinForDownload } = await jiti.import('../src/utils/binFile.ts');
const { encode } = await jiti.import('../src/utils/bonProtocol.ts');

test('all overlapping apex rounds are returned, closed stages are excluded', () => {
  const rules = { getCurrentSeason: () => 2, getCurrentRounds: () => [4, 5, 6], getGuessTabs: round => [{ scheduleId: round * 10, state: round === 6 ? 3 : 1 }] };
  assert.deepEqual(resolveOpenApexRounds(0, rules).map(item => item.round), [4, 5]);
});
test('apex rate limit preserves retry position and does not exhaust the stage', async () => {
  let attempt = 0;
  const first = await fetchApexPages(async () => {
    if (++attempt === 2) throw new Error('200400 操作太快');
    return { list: ['a', 'b'], last: false };
  }, { cmd: 'list', listKey: 'list' });
  assert.equal(first.complete, false);
  assert.deepEqual(first.rows, ['a', 'b']);
  const second = await fetchApexPages(async (_, params) => {
    assert.equal(params.idx, 2);
    return { list: ['c'], last: true };
  }, { cmd: 'list', listKey: 'list', startIdx: first.rows.length });
  assert.equal(second.complete, true);
  assert.deepEqual(second.rows, ['c']);
});
test('apex empty pages terminate and cancellation sends no further requests', async () => {
  assert.equal((await fetchApexPages(async () => ({ list: [] }), { cmd: 'list', listKey: 'list' })).complete, true);
  const result = await fetchApexPages(() => assert.fail('request after cancellation'), { cmd: 'list', listKey: 'list', cancelled: () => true });
  assert.equal(result.complete, false);
});
function deps(connected = false) {
  const calls = [];
  const fixture = {
    selectedTokens: { value: ['a'] }, tokens: { value: [{ id: 'a', name: 'A' }] }, tokenStatus: { value: {} },
    isRunning: { value: false }, shouldStop: { value: false }, currentRunningTokenId: { value: null },
    ensureConnection: async () => true, releaseConnectionSlot: () => calls.push('release'), addLog() {}, message: { success() {}, warning() {} },
    tokenStore: { getWebSocketStatus: () => connected ? 'connected' : 'disconnected', closeWebSocketConnection: () => calls.push('close') },
  };
  return { fixture, calls };
}
test('activity lifecycle preserves existing connections and releases newly acquired slots once', async () => {
  for (const connected of [true, false]) {
    const { fixture, calls } = deps(connected);
    await runBatchActivity(fixture, 'test', async () => {});
    assert.deepEqual(calls, connected ? [] : ['close', 'release']);
    assert.equal(fixture.tokenStatus.value.a, 'completed');
    assert.equal(fixture.isRunning.value, false);
  }
});
test('connection failures and cancellation do not release unowned slots or execute writes', async () => {
  const { fixture, calls } = deps();
  fixture.ensureConnection = async () => { throw new Error('failed; manager already released'); };
  await runBatchActivity(fixture, 'test', () => assert.fail());
  assert.deepEqual(calls, []);
  assert.equal(fixture.tokenStatus.value.a, 'failed');
  fixture.ensureConnection = async () => { fixture.shouldStop.value = true; return true; };
  await runBatchActivity(fixture, 'test', () => assert.fail());
  assert.deepEqual(calls, ['close', 'release']);
  assert.equal(fixture.tokenStatus.value.a, 'stopped');
});
test('camp mirror defense is independent and never inherits active attacks', () => {
  const rows = buildCampMembers({ 1: { roleId: 7, challengeCnt: 5, failCnt: 2 }, 2: { roleId: 7, mirror: true, challengeCnt: 3, failCnt: 1 } }, [], new Date(), false);
  assert.equal(rows[0].defenseRate, '40%');
  assert.equal(rows[0].attacks, '未知');
  assert.equal(rows[1].defenseRate, '33%');
  assert.equal(rows[1].attacks, '—');
  assert.notEqual(rows[0].key, rows[1].key);
});
test('camp records use selected match date in Shanghai, not browser timezone', () => {
  assert.equal(getCampMatchDate('260921', 2).toISOString(), '2026-09-22T04:00:00.000Z');
  const records = [{ created: Date.parse('2026-09-21T16:01:00Z') / 1000 }, { created: Date.parse('2026-09-22T16:01:00Z') / 1000 }];
  assert.deepEqual(getCampRecordRows(records, '260921', 2), [records[0]]);
});
test('stopping camp pet task prevents remaining rounds and reward requests', async () => {
  const { fixture } = deps();
  const commands = [];
  fixture.loadSettings = () => ({ campFormation: 2, arenaFormation: 1 });
  fixture.tokenStore.sendMessageWithPromise = async (_, cmd, params) => {
    commands.push(cmd);
    if (cmd === 'presetteam_getinfo') return { presetTeamInfo: { 2: { teamInfo: { 0: { heroId: 42 } } } } };
    if (cmd === 'role_getroleinfo') return { role: { lordWeaponId: 7 } };
    if (cmd === 'club_attackmonster') {
      assert.deepEqual(params.teamSetParams.battleTeam, { 0: 42 });
      fixture.shouldStop.value = true;
    }
    return {};
  };
  await createTasksCampChallenge(fixture).batchCampChallengePet();
  assert.equal(commands.filter(cmd => cmd === 'club_attackmonster').length, 1);
  assert.ok(!commands.includes('club_taskclaim'));
});
test('tower purchase uses distinct protocol fields and rejects fractional or out-of-range amounts', () => {
  assert.deepEqual(buildTowerEnergyPurchase(false, '3'), { cmd: 'tower_buyenergy', params: { buyNum: 3 } });
  assert.deepEqual(buildTowerEnergyPurchase(true, 4), { cmd: 'evotower_buyenergy', params: { energy: 4 } });
  for (const value of [0, -1, 1.5, NaN, 101]) assert.throws(() => buildTowerEnergyPurchase(false, value));
});
test('role BIN roundtrip preserves login envelope and uses lx header', () => {
  const bin = buildRoleBin({ platform: 'hortor', info: { sign: 'fixture' } }, '1000030');
  assert.deepEqual([...new Uint8Array(bin).slice(0, 2)], [112, 108]);
  const payload = getBinPayload(normalizeBinForDownload(bin));
  assert.equal(payload.serverId, 1000030);
  assert.equal(payload.info.sign, 'fixture');
  assert.match(getRoleBinFileName({ serverId: 1000030, roleId: 123, name: 'a/b' }), /^bin-3服-1-123-a_b\.bin$/);
});
test('BON encoder returns only encrypted view bytes, respecting byteOffset', () => {
  const backing = new Uint8Array([99, 1, 2, 3, 88]);
  const result = encode({}, { encrypt: () => backing.subarray(1, 4) });
  assert.deepEqual([...new Uint8Array(result)], [1, 2, 3]);
});

test('credential refresh BIN generation works without game runtime globals', async () => {
  const { generateBinFromCombUser } = await jiti.import('../src/utils/wechatForceLogout.ts');
  const bin = generateBinFromCombUser({ encryptCombUser: 'fixture', timestamp: 42, sign: 'fixture' }, 1000030);
  const payload = getBinPayload(bin);
  assert.equal(payload.serverId, 1000030);
  assert.equal(payload.info.timestamp, 42);
  assert.throws(() => generateBinFromCombUser({}), /不完整/);
});

test('mobile role loader passes the ArrayBuffer itself to the server-list transport', async () => {
  const { loadRoleBinData } = await jiti.import('../src/utils/binFile.ts');
  const bin = buildRoleBin({ platform: 'hortor' }, 30);
  const result = await loadRoleBinData(bin, async buffer => {
    assert.equal(buffer, bin);
    assert.ok(buffer.byteLength > 0);
    return JSON.stringify({ 30: { serverId: 30, roleId: 7 } });
  });
  assert.equal(result.payload.serverId, 30);
  assert.equal(result.roles[0].roleId, 7);
});

test('Xuanwu claims again after the single lottery draw advances tasks', async () => {
  const { createTasksXuanwuBlessing } = await jiti.import('../src/utils/batch/tasksXuanwuBlessing.ts');
  const { fixture } = deps();
  fixture.delayConfig = { command: 0 };
  const calls = [];
  let drawn = false;
  fixture.tokenStore.sendMessageWithPromise = async (_, cmd, params) => {
    calls.push({ cmd, params });
    if (cmd === 'activity_warorderget') return { activity: { warOrderActivityInfo: { [params.actId]: { complete: drawn ? { 1: 1, 2: 1 } : { 1: 1 }, taskClaimed: drawn ? { 1: true } : {} } } } };
    if (cmd === 'activity_lottery') { drawn = true; return { reward: [] }; }
    if (cmd === 'activity_warordertaskclaim') return { reward: [{ type: 2, value: 1 }] };
    return { reward: [] };
  };
  await createTasksXuanwuBlessing(fixture).batchXuanwuBlessing();
  const drawIndex = calls.findIndex(call => call.cmd === 'activity_lottery');
  assert.equal(calls.filter(call => call.cmd === 'activity_lottery').length, 1);
  assert.equal(calls[drawIndex].params.times, 1);
  assert.ok(calls.findIndex(call => call.cmd === 'activity_warordertaskclaim' && call.params.missionId === 2) > drawIndex);
  assert.equal(fixture.tokenStatus.value.a, 'completed');
});

test('new activity commands preserve supplied parameters through the existing registry', async (t) => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
  t.after(() => {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else delete globalThis.window;
    if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else delete globalThis.localStorage;
  });
  const { CommandRegistry, registerDefaultCommands } = await jiti.import('../src/utils/xyzwWebSocket.ts');
  const registry = registerDefaultCommands(new CommandRegistry({ bon: { encode: value => value } }));
  for (const cmd of ['club_attack', 'club_attackmonster', 'club_getattackrecord', 'club_getdefenserecord', 'club_getgrouprank', 'club_taskclaim', 'apex_vote', 'apex_getvotelist', 'tower_buyenergy', 'evotower_buyenergy', 'activity_warorderget', 'activity_warordertaskclaim', 'activity_warorderrewardclaim', 'activity_lottery', 'activity_commonbuygoods']) {
    const packet = registry.build(cmd, 1, 2, { fixture: 3 });
    assert.equal(packet.cmd, cmd);
    assert.equal(packet.body.fixture, 3);
  }
});

test('historical camp queries include idle defenders whose current counters are zero', async () => {
  const { getClubBattleRecordTargets } = await import('../src/utils/clubDailyBattle.js');
  const members = { 1: { roleId: 7 }, 2: { roleId: 7, mirror: true } };
  assert.deepEqual(getClubBattleRecordTargets(members), []);
  assert.deepEqual(getClubBattleRecordTargets(members, { includeIdle: true }), [{ targetId: '7', targetIsMirror: false }, { targetId: '7', targetIsMirror: true }]);
});
