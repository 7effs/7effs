import test from 'node:test';
import assert from 'node:assert/strict';
import ownerAuth from '../api/owner-auth.js';

function makeResponse() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

const keys = ['JAYE_OWNER_PIN', 'JAYE_SESSION_SECRET', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
const request = () => ({
  method: 'POST',
  headers: { origin: 'https://jaye.example', host: 'jaye.example', 'x-vercel-forwarded-for': '203.0.113.42' },
  body: { action: 'login', pin: 'incorrect' }
});

test('login fails closed when shared rate-limit storage is missing', async () => {
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.JAYE_OWNER_PIN = 'test-pin';
    process.env.JAYE_SESSION_SECRET = 'a'.repeat(48);
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const res = makeResponse();
    await ownerAuth(request(), res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, 'rate_limiter_unavailable');
  } finally {
    for (const key of keys) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key];
  }
});

test('distributed rate-limit response blocks login and supplies Retry-After', async () => {
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  let command;
  try {
    process.env.JAYE_OWNER_PIN = 'test-pin';
    process.env.JAYE_SESSION_SECRET = 'a'.repeat(48);
    process.env.UPSTASH_REDIS_REST_URL = 'https://jaye-test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    globalThis.fetch = async (_url, options) => {
      command = JSON.parse(options.body);
      return new Response(JSON.stringify({ result: [0, 8, 41000] }), { status: 200 });
    };
    const res = makeResponse();
    await ownerAuth(request(), res);
    assert.equal(res.statusCode, 429);
    assert.equal(res.headers['Retry-After'], '41');
    assert.equal(command[0], 'EVAL');
    assert.ok(!command[3].includes('203.0.113.42'));
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key];
  }
});
