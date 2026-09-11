import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchedulerTick, minuteKey } from '../src/utils/schedulerTick.js';
function setup(execute) {
  let clock = new Date(2026, 8, 8, 12, 0, 0).getTime();
  const data = new Map(); const errors = []; const runs = [];
  const tick = createSchedulerTick({ now: () => clock, tasks: () => [{ id: 'a', enabled: true }, { id: 'b', enabled: true }], matches: () => true, busy: () => false, execute: execute || (async t => { runs.push(t.id); }), storage: { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v) }, onError: e => errors.push(e) });
  return { tick, runs, errors, advance: ms => { clock += ms; } };
}
test('serial execution deduplicates ticks within a minute', async () => { const s = setup(); await s.tick(); await s.tick(); assert.deepEqual(s.runs, ['a','b']); });
test('pending execution locks concurrent ticks', async () => {
  let resolve; let calls = 0;
  const s = setup(async () => { calls++; if (calls === 1) await new Promise(r => { resolve = r; }); });
  const pending = s.tick(); await s.tick(); assert.equal(calls, 1); resolve(); await pending; assert.equal(calls, 2);
});
test('resume skips current minute instead of replaying missed tasks', async () => {
  const s = setup(); s.advance(120000); await s.tick(); assert.deepEqual(s.runs, []);
  s.advance(10000); await s.tick(); assert.deepEqual(s.runs, []);
  for (let i = 0; i < 5; i++) { s.advance(10000); await s.tick(); }
  assert.deepEqual(s.runs, ['a','b']);
});
test('execution errors are handled and next task can run', async () => { const s = setup(async () => { throw new Error('test'); }); await s.tick(); assert.equal(s.errors.length, 2); });
test('dedupe key includes year and month', () => { assert.notEqual(minuteKey(new Date(2026, 8, 8)), minuteKey(new Date(2026, 9, 8))); });
