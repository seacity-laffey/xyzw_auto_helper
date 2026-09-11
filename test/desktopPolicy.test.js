import test from 'node:test';
import assert from 'node:assert/strict';
import policy from '../desktop/policy.cjs';
const { assetPath, loginTarget, isLocal } = policy;
test('desktop asset resolver preserves iframe assets and SPA deep links', () => {
  assert.equal(assetPath('xyzw://app/batch-tasks', '/bundle'), '/bundle/index.html');
  assert.equal(assetPath('xyzw://app/game?bin_id=1', '/bundle'), '/bundle/index.html');
  assert.equal(assetPath('xyzw://app/game/index.html?bin_id=1', '/bundle'), null);
  assert.equal(assetPath('xyzw://app//game/index.html', '/bundle'), null);
  assert.equal(assetPath('xyzw://app/%2fgame/index.html', '/bundle'), null);
  for (const pathname of ['/GAME/index.html', '/Game/index.html', '/game./index.html', '/game%20/index.html', '/game::$INDEX_ALLOCATION/index.html']) {
    assert.equal(assetPath('xyzw://app' + pathname, '/bundle'), null, pathname);
  }
  assert.equal(assetPath('xyzw://game-00000000-0000-4000-8000-000000000000/game/index.html?bin_id=1', '/bundle'), '/bundle/game/index.html');
});
test('game hosts cannot load helper pages, APIs, or helper bundles', () => {
  const origin = 'xyzw://game-00000000-0000-4000-8000-000000000000';
  for (const suffix of ['/index.html', '/tokens', '/migration.html', '/assets/index.js', '/api/game-login/authuser', '/game/%2e%2e%2findex.html']) {
    assert.equal(assetPath(origin + suffix, '/bundle'), null);
    assert.equal(loginTarget(origin + suffix, 'POST'), null);
  }
  assert.equal(policy.isGame('xyzw://game-invalid/game/index.html'), false);
  assert.equal(policy.isGame('xyzw://user@game-00000000-0000-4000-8000-000000000000/game/index.html'), false);
});
test('about links use an exact allowlist and CSP separates helper from game scripts', () => {
  assert.equal(policy.isAllowedExternal('https://github.com/w1249178256/xyzw_web_helper'), true);
  for (const url of ['file:///etc/passwd', 'https://github.com.attacker.test/', 'https://github.com/w1249178256/xyzw_web_helper?redirect=evil']) assert.equal(policy.isAllowedExternal(url), false);
  assert.match(policy.contentSecurityPolicy(false), /frame-ancestors 'none'/);
  assert.doesNotMatch(policy.contentSecurityPolicy(false), /script-src[^;]*unsafe/);
  assert.match(policy.contentSecurityPolicy(true), /frame-src 'none'/);
});
test('desktop resolver blocks traversal, foreign hosts and private paths', () => {
  for (const url of ['xyzw://app/%2e%2e%2fsecret', 'xyzw://app/a%5c..%5csecret', 'xyzw://evil/index.html', 'file:///secret', 'xyzw://app/_worker.js', 'xyzw://app/api/anything', 'xyzw://app/%00']) assert.equal(assetPath(url, '/bundle'), null, url);
  assert.equal(isLocal('xyzw://user:pass@app/'), false);
});
test('login adapter only permits known routes and methods', () => {
  assert.equal(loginTarget('xyzw://app/api/game-login/authuser?_seq=1', 'POST'), 'https://xxz-xyzw.hortorgames.com/login/authuser?_seq=1');
  for (const [url, method] of [['xyzw://app/api/hortor/evil', 'GET'], ['xyzw://app/api/game-login/authuser', 'GET'], ['https://evil/api/game-login/authuser', 'POST']]) assert.equal(loginTarget(url, method), null);
});
test('Weixin QR requests preserve the existing web proxy browser compatibility headers', () => {
  const headers = policy.loginHeaders('https://open.weixin.qq.com/connect/app/qrconnect', 'text/html', null);
  assert.match(headers['User-Agent'], /MicroMessenger\//);
  assert.equal(headers.Accept, 'text/html');
  assert.equal(headers.Referer, 'https://open.weixin.qq.com/');
  const game = policy.loginHeaders('https://xxz-xyzw.hortorgames.com/login/authuser', '*/*', 'application/octet-stream');
  assert.equal(game['Content-Type'], 'application/octet-stream');
  assert.equal(game['User-Agent'], undefined);
});
