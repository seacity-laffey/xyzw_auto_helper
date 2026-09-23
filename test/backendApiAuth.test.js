import assert from 'node:assert/strict';
import test from 'node:test';
import { requireApiKey } from '../render-backend/lib/apiAuth.js';

test('backend auth fails closed and accepts exact API key or bearer token', () => {
  const previous = process.env.API_KEY;
  try {
    for (const [key, headers, expected] of [[undefined, {}, 401], ['fixture', {}, 401], ['fixture', { 'x-api-key': 'wrong' }, 401], ['fixture', { 'x-api-key': 'fixture' }, 200], ['fixture', { authorization: 'Bearer fixture' }, 200]]) {
      if (key) process.env.API_KEY = key; else delete process.env.API_KEY;
      let status;
      requireApiKey({ header: name => headers[name] }, { status(code) { status = code; return this; }, json() {} }, () => { status = 200; });
      assert.equal(status, expected);
    }
  } finally { if (previous === undefined) delete process.env.API_KEY; else process.env.API_KEY = previous; }
});
