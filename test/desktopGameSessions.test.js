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
  const duplicate = sessions.create(second, 'a');
  assert.equal(new Set([a.origin, b.origin, duplicate.origin]).size, 3);
  assert.equal(sessions.has(a.url, 1), true);
  assert.equal(sessions.has(a.url, 2), false);
  assert.equal(sessions.release(second, a.origin), false);
  assert.deepEqual(sessions.releaseOwner(1).sort(), [a.origin, b.origin].sort());
  assert.equal(sessions.has(a.url), false);
  assert.equal(sessions.has(duplicate.url, 2), true);
  assert.equal(sessions.release(second, duplicate.origin), true);
});
test('child frames and external pages cannot create or revoke game sessions', () => {
  const sessions = createGameSessions();
  const event = owner(1);
  const session = sessions.create(event, 'account');
  for (const url of ['xyzw://app/game', session.url, 'https://example.com']) {
    const child = { ...event, senderFrame: { url } };
    assert.throws(() => sessions.create(child, 'other'), /Forbidden/);
    assert.throws(() => sessions.release(child, session.origin), /Forbidden/);
  }
  event.senderFrame.url = 'https://example.com';
  assert.throws(() => sessions.create(event, 'account'), /Forbidden/);
  assert.throws(() => sessions.create(owner(2), {}), /Invalid account/);
});
