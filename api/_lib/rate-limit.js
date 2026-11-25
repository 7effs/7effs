import crypto from 'node:crypto';

const REQUEST_TIMEOUT_MS = 1800;
const SLIDING_WINDOW_SCRIPT = [
  'local now = tonumber(ARGV[1])',
  'local windowMs = tonumber(ARGV[2])',
  'local limit = tonumber(ARGV[3])',
  'redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", now - windowMs)',
  'local count = redis.call("ZCARD", KEYS[1])',
  'if count >= limit then',
  '  local oldest = redis.call("ZRANGE", KEYS[1], 0, 0, "WITHSCORES")',
  '  local retry = math.max(1, tonumber(oldest[2]) + windowMs - now)',
  '  return {0, count, retry}',
  'end',
  'redis.call("ZADD", KEYS[1], now, ARGV[4])',
  'redis.call("PEXPIRE", KEYS[1], windowMs)',
  'return {1, count + 1, 0}'
].join('\n');

function redisEndpoint(env) {
  const rawUrl = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (typeof rawUrl !== 'string' || !rawUrl.trim() || typeof token !== 'string' || !token.trim()) {
    throw new Error('Shared rate-limit storage is not configured');
  }
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw new Error('Shared rate-limit storage URL is invalid'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('Shared rate-limit storage URL must be a clean HTTPS endpoint');
  }
  return { url: parsed.origin, token };
}

export async function takeRateLimitSlot({ key, windowMs, maxAttempts, nowMs = Date.now(), env = process.env, fetchImpl = globalThis.fetch }) {
  if (typeof key !== 'string' || !key || key.length > 240 || !Number.isSafeInteger(windowMs) || windowMs < 1000 || !Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || !Number.isSafeInteger(nowMs) || nowMs < 1 || typeof fetchImpl !== 'function') {
    throw new Error('Invalid rate-limit request');
  }
  const { url, token } = redisEndpoint(env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(['EVAL', SLIDING_WINDOW_SCRIPT, '1', key, String(nowMs), String(windowMs), String(maxAttempts), crypto.randomUUID()]),
      signal: controller.signal,
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Shared rate-limit storage rejected the request');
    const payload = await response.json();
    if (payload?.error || !Array.isArray(payload?.result) || payload.result.length !== 3) throw new Error('Shared rate-limit storage returned an invalid response');
    const [allowed, count, retryMs] = payload.result.map(Number);
    if (![0, 1].includes(allowed) || !Number.isSafeInteger(count) || count < 0 || !Number.isFinite(retryMs) || retryMs < 0) throw new Error('Shared rate-limit storage returned invalid values');
    return { allowed: allowed === 1, count, retryAfterSeconds: allowed === 1 ? 0 : Math.max(1, Math.ceil(retryMs / 1000)) };
  } finally {
    clearTimeout(timeout);
  }
}
