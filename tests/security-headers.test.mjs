import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const headers = new Map(config.headers.flatMap(rule => rule.headers.map(item => [item.key.toLowerCase(), item.value])));

test('Vercel applies baseline security headers to every route', () => {
  assert.equal(config.headers.length, 1);
  assert.equal(config.headers[0].source, '/(.*)');
  assert.equal(headers.get('strict-transport-security'), 'max-age=31536000');
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.get('permissions-policy'), 'camera=(), geolocation=(), microphone=()');
  assert.equal(headers.get('x-permitted-cross-domain-policies'), 'none');
});
