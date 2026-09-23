import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameSessions } from '../desktop/game-sessions.cjs';

function owner(id) {
  const frame = { url: 'xyzw://app/game' };
  return { senderFrame: frame, sender: { id, mainFrame: frame } };
}
test('each game gets a separate origin and its lifetime belongs to the requesting helper window', () => {
  const sessions = createGameSessions();
  const first = owner(1), second = owner(2);
  const a = sessions.create(first, 'a');
  const b = sessions.create(first, 'b');
  const duplicate = sessions.create(second, 'c');
  assert.throws(() => sessions.create(second, 'a'), /其他窗口/);
  assert.deepEqual(sessions.create(first, 'a'), a);
  assert.equal(new Set([a.origin, b.origin, duplicate.origin]).size, 3);
  assert.equal(sessions.has(a.url, 1), true);
  assert.equal(sessions.has(a.url, 2), false);
  assert.equal(sessions.release(second, a.origin), false);
  assert.deepEqual(sessions.releaseOwner(1).sort(), [a.origin, b.origin].sort());
  assert.equal(sessions.has(a.url), false);
  assert.equal(sessions.has(duplicate.url, 2), true);
  assert.equal(sessions.release(second, duplicate.origin), true);
  assert.deepEqual(sessions.list(first), []);
  const reopened = sessions.create(second, 'a');
  assert.equal(reopened.origin, a.origin);
  assert.deepEqual(sessions.list(first), [{ tokenId: 'a', ownerId: 2, origin: reopened.origin, current: false }]);
  assert.equal(sessions.list(second)[0].current, true);
});
test('child frames and external pages cannot create or revoke game sessions', () => {
  const sessions = createGameSessions();
  const event = owner(1);
  const session = sessions.create(event, 'account');
  for (const url of ['xyzw://app/game', session.url, 'https://example.com']) {
    const child = { ...event, senderFrame: { url } };
    assert.throws(() => sessions.create(child, 'other'), /Forbidden/);
    assert.throws(() => sessions.list(child), /Forbidden/);
    assert.throws(() => sessions.release(child, session.origin), /Forbidden/);
  }
  event.senderFrame.url = 'https://example.com';
  assert.throws(() => sessions.create(event, 'account'), /Forbidden/);
  assert.throws(() => sessions.create(owner(2), {}), /Invalid account/);
});

test('account origins survive releases and registry restarts while ownership remains temporary', () => {
  const first = owner(1), second = owner(2);
  const sessions = createGameSessions();
  const account = sessions.create(first, 'Account/中文?A');
  assert.equal(sessions.has(account.url, 1), true);
  assert.notEqual(sessions.create(first, 'account/中文?a').origin, account.origin);
  assert.equal(sessions.release(first, account.origin), true);
  assert.equal(sessions.has(account.url), false);
  assert.deepEqual(sessions.create(second, 'Account/中文?A'), account);
  assert.equal(sessions.has(account.url, 1), false);
  assert.equal(sessions.has(account.url, 2), true);
  assert.equal(sessions.release(first, account.origin), false);
  const restarted = createGameSessions();
  assert.equal(restarted.has(account.url), false);
  assert.deepEqual(restarted.create(first, 'Account/中文?A'), account);
});
