import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const bridge = readFileSync(new URL('../public/game/session-bridge.js', import.meta.url), 'utf8');
const loader = readFileSync(new URL('../public/game/loader.js', import.meta.url), 'utf8');

function fixture() {
  const listeners = new Map();
  const messages = [];
  const loaded = [];
  const timers = new Map();
  class Storage {
    getItem() { return null; }
    setItem() {}
    removeItem() {}
  }
  const window = {
    location: { search: '?bin_id=a', protocol: 'xyzw:', origin: 'xyzw://game-a' },
    parent: { postMessage: message => messages.push(message) },
    localStorage: new Storage(),
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    boot() { window.booted = true; },
  };
  const element = { style: {}, addEventListener() {}, replaceChildren(node) { window.error = node.textContent; } };
  const context = vm.createContext({
    window, URLSearchParams, TextEncoder, console,
    setTimeout(fn) { const id = timers.size + 1; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    document: {
      head: { appendChild() {} },
      createElement() { return { style: {} }; },
      getElementById() { return element; },
      body: { appendChild(script) {
        loaded.push(script.src);
        if (script.src === 'session-bridge.js') vm.runInContext(bridge, context);
        script.onload();
      } },
    },
  });
  function control(action, overrides = {}) {
    for (const listener of listeners.get('message') || []) listener({
      origin: 'xyzw://app', source: window.parent,
      data: { source: 'xyzw-helper', type: 'protocol-observer-control', action },
      ...overrides,
    });
  }
  return { window, context, loaded, messages, timers, control };
}

for (const action of ['start', 'stop']) {
  test(`embedded loader waits for trusted observer ${action} before loading game scripts`, async () => {
    const f = fixture();
    const loading = vm.runInContext(loader, f.context);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(f.loaded, ['session-bridge.js']);
    assert.equal(f.window.booted, undefined);
    f.control('start', { origin: 'https://untrusted.example' });
    f.control('start', { source: {} });
    f.control('invalid');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(f.loaded, ['session-bridge.js']);
    f.control(action);
    await loading;
    assert.equal(f.window.booted, true);
    assert.equal(f.messages.find(m => m.type === 'protocol-observer-status').active, action === 'start');
    assert.equal(f.timers.size, 0);
  });
}

test('observer handshake timeout displays an error without starting the game', async () => {
  const f = fixture();
  const loading = vm.runInContext(loader, f.context);
  await new Promise(resolve => setImmediate(resolve));
  [...f.timers.values()][0]();
  await loading;
  assert.match(f.window.error, /初始化超时/);
  assert.equal(f.window.booted, undefined);
  assert.deepEqual(f.loaded, ['session-bridge.js']);
});
