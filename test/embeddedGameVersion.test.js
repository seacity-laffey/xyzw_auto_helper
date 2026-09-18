import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const defines = readFileSync(new URL('../public/game/game-defines.a175e.js', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../public/game/src/settings.da7ef.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../public/game/main.2a00e.js', import.meta.url), 'utf8');

function runtime(response) {
  const requests = [];
  const context = vm.createContext({
    console: { log() {}, error() {} },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return response;
    },
  });
  context.window = context;
  vm.runInContext(defines, context);
  vm.runInContext(settings, context);
  vm.runInContext(main, context);
  return { context, requests };
}

test('H5 startup requests the H5 release channel and keeps the container version separate from code version', async () => {
  const bundleVers = { launcher: 'f041d', game: '1ef8d', config: 'f27e2', codeVersion: 'v2.45.2', COMMIT_ID: '6870594e' };
  const { context, requests } = runtime({
    ok: true,
    text: async () => JSON.stringify({ body: { isLast: true, battleVersion: 240516, bundleVers: JSON.stringify(bundleVers) } }),
  });
  assert.equal(context.PLATFORM, 'h5web');
  assert.equal(context.GAME_VERSION, '1.90.2-h5web');
  await context.ensureBundleVers();
  const url = new URL(requests[0].url);
  assert.equal(url.searchParams.get('platform'), 'hortor');
  assert.equal(url.searchParams.get('version'), '0.1.0-androidh5');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.cache, 'no-store');
  assert.equal(requests[0].options.body, '');
  assert.deepEqual(JSON.parse(JSON.stringify(context._CCSettings.bundleVers)), { internal: '', ...bundleVers });
  assert.equal(context.GAME_VERSION, '1.90.2-h5web');
  assert.equal(context.BATTLE_VERSION, undefined, 'startup must not invent a battle version');
});

test('new manifest hashes replace old hashes rather than pinning the observed H5 release', async () => {
  let version = 'release-a';
  const { context } = runtime({
    ok: true,
    text: async () => JSON.stringify({ body: { bundleVers: { launcher: version, game: version } } }),
  });
  await context.ensureBundleVers();
  version = 'release-b';
  await context.ensureBundleVers();
  assert.equal(context._CCSettings.bundleVers.launcher, 'release-b');
  assert.equal(context._CCSettings.bundleVers.game, 'release-b');
});

test('manifest HTTP failure stops boot before initializing game resources', async () => {
  const { context } = runtime({ ok: false, status: 503 });
  let installed = false;
  context.installRemoteAssetLoader = () => { installed = true; };
  await assert.rejects(context.boot(), /manifest failed: 503/);
  assert.equal(installed, false);
});
