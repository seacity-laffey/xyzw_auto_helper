import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const scopeSource = readFileSync(new URL('../public/game/storage-scope.js', import.meta.url), 'utf8');
const bootSource = readFileSync(new URL('../public/game/web-bootstrap.js', import.meta.url), 'utf8');
function realm(backing, id) {
  class Storage {
    get length() { return backing.size; }
    key(index) { return [...backing.keys()][index] ?? null; }
    getItem(key) { return backing.get(String(key)) ?? null; }
    setItem(key, value) { backing.set(String(key), String(value)); }
    removeItem(key) { backing.delete(String(key)); }
    clear() { backing.clear(); }
  }
  const context = vm.createContext({ Storage, localStorage: new Storage(), location: { protocol: 'http:', search: `?bin_id=${id}` }, URLSearchParams, TextEncoder });
  vm.runInContext('window = globalThis', context);
  vm.runInContext(scopeSource, context);
  vm.runInContext(bootSource, context);
  return context;
}
test('web bootstrap seeds one account; storage clear cannot erase helper or another game', async () => {
  const backing = new Map([['gameTokens', 'private-fixture'], ['bin_data_a', '706c0102'], ['bin_data_b', '706c0304']]);
  const a = realm(backing, 'a'), b = realm(backing, 'b');
  await Promise.all([a.xyzwGameReady, b.xyzwGameReady]);
  assert.equal(a.localStorage.getItem('current_bin_id'), 'a');
  assert.equal(b.localStorage.getItem('current_bin_id'), 'b');
  assert.equal(a.localStorage.getItem('gameTokens'), null);
  assert.equal(a.localStorage.getItem('bin_data_b'), null);
  a.localStorage.setItem('sound', 'off');
  assert.equal(b.localStorage.getItem('sound'), null);
  const reloaded = realm(backing, 'a');
  await reloaded.xyzwGameReady;
  assert.equal(reloaded.localStorage.getItem('sound'), 'off');
  a.localStorage.clear();
  assert.equal(backing.get('gameTokens'), 'private-fixture');
  assert.equal(b.localStorage.getItem('bin_data_b'), '706c0304');
});
test('web bootstrap rejects missing credentials before game startup', async () => {
  const a = realm(new Map(), 'a');
  await assert.rejects(a.xyzwGameReady, /BIN/);
});
