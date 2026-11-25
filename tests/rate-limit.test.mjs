import test from 'node:test';
import assert from 'node:assert/strict';
import { takeRateLimitSlot } from '../api/_lib/rate-limit.js';

const env = {
  UPSTASH_REDIS_REST_URL: 'https://jaye-test.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-token-only'
};

test('rate limit slot uses one atomic Redis sliding-window operation', async () => {
  let request;
  const result = await takeRateLimitSlot({
    key: 'jaye:owner-auth:login:hashed-client-key',
    windowMs: 600000,
    maxAttempts: 8,
    nowMs: 1700000000000,
    env,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ result: [1, 1, 0] }), { status: 200 });
    }
  });
  assert.equal(result.allowed, true);
  assert.equal(result.count, 1);
  assert.equal(request.url, 'https://jaye-test.upstash.io');
  assert.equal(request.options.headers.Authorization, 'Bearer test-token-only');
  const command = JSON.parse(request.options.body);
  assert.equal(command[0], 'EVAL');
  assert.equal(command[2], '1');
  assert.equal(command[3], 'jaye:owner-auth:login:hashed-client-key');
  assert.match(command[1], /ZREMRANGEBYSCORE/);
  assert.match(command[1], /ZADD/);
  assert.match(command[1], /PEXPIRE/);
  assert.ok(!request.options.headers.Authorization.includes('hashed-client-key'));
});

test('blocked slot returns a rounded Retry-After value', async () => {
  const result = await takeRateLimitSlot({
    key: 'jaye:owner-auth:login:hashed-client-key',
    windowMs: 600000,
    maxAttempts: 8,
    nowMs: 1700000000000,
    env,
    fetchImpl: async () => new Response(JSON.stringify({ result: [0, 8, 41001] }), { status: 200 })
  });
  assert.deepEqual(result, { allowed: false, count: 8, retryAfterSeconds: 42 });
});

test('missing shared storage configuration fails closed', async () => {
  await assert.rejects(() => takeRateLimitSlot({
    key: 'jaye:owner-auth:login:hashed-client-key',
    windowMs: 600000,
    maxAttempts: 8,
    env: {},
    fetchImpl: async () => { throw new Error('must not make a request'); }
  }), /not configured/);
});

test('malformed Redis response is rejected instead of allowing the request', async () => {
  await assert.rejects(() => takeRateLimitSlot({
    key: 'jaye:owner-auth:login:hashed-client-key',
    windowMs: 600000,
    maxAttempts: 8,
    env,
    fetchImpl: async () => new Response(JSON.stringify({ result: 'allowed' }), { status: 200 })
  }), /invalid response/);
});
