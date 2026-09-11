import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeValue, decodeValue, validateBackup } from '../src/utils/backup.js';
test('backup preserves binary data, dates, undefined and user fields without type collisions', () => {
  const data = { data: Uint8Array.from([0, 1, 128, 255]).buffer, date: new Date('2026-09-08T00:00:00Z'), missing: undefined, nested: [{ type: 'buffer', value: 'ordinary' }] };
  assert.deepEqual(decodeValue(JSON.parse(JSON.stringify(encodeValue(data)))), data);
});
test('backup rejects malformed types and unknown schema before any writes', () => {
  assert.throws(() => decodeValue(['script', 'code']));
  assert.throws(() => validateBackup({ format: 'xyzw-backup', version: 2 }));
  assert.throws(() => validateBackup({ format: 'xyzw-backup', version: 1, localStorage: {}, databases: encodeValue({ evil: {} }) }));
});
