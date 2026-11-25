import crypto from 'node:crypto';
import { isIP } from 'node:net';
import { takeRateLimitSlot } from './_lib/rate-limit.js';

const COOKIE = 'jaye_owner_session';
const SESSION_SECONDS = 12 * 60 * 60;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function cookieValue(req) {
  const header = req.headers?.cookie || '';
  const item = header.split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='));
  if (!item) return '';
  try { return decodeURIComponent(item.slice(COOKIE.length + 1)); }
  catch { return ''; }
}

function isSessionValid(req, secret) {
  const token = cookieValue(req);
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!safeEqual(signature, sign(payload, secret))) return false;
  const expiry = Number(payload);
  return Number.isFinite(expiry) && expiry > Math.floor(Date.now() / 1000);
}

function setCookie(res, value, maxAge) {
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`);
}

function sameOrigin(req) {
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  if (!origin || !host) return false;
  try { return new URL(origin).host.toLowerCase() === String(host).toLowerCase(); }
  catch { return false; }
}

function clientKey(req, secret) {
  // Vercel overwrites x-forwarded-for with the incoming client IP. Prefer its
  // protected alias when present; never accept an arbitrary unvalidated value.
  const forwarded = req.headers?.['x-vercel-forwarded-for'] ?? req.headers?.['x-forwarded-for'];
  const candidate = String(forwarded || '').split(',')[0].trim();
  const identity = isIP(candidate) ? candidate : 'unknown';
  const fingerprint = crypto.createHmac('sha256', secret).update(identity).digest('hex');
  return `jaye:owner-auth:login:${fingerprint}`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Vary', 'Origin');

  const pin = process.env.JAYE_OWNER_PIN;
  const secret = process.env.JAYE_SESSION_SECRET;
  if (!pin || !secret || secret.length < 32) {
    return res.status(503).json({ ok: false, error: 'not_configured' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ ok: isSessionValid(req, secret) });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!sameOrigin(req)) {
    return res.status(403).json({ ok: false, error: 'bad_origin' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { body = {}; }
  }
  body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  if (body.action === 'logout') {
    setCookie(res, '', 0);
    return res.status(200).json({ ok: true });
  }

  if (body.action !== 'login' || typeof body.pin !== 'string' || body.pin.length > 256) {
    return res.status(400).json({ ok: false, error: 'bad_request' });
  }

  let rateLimit;
  try {
    rateLimit = await takeRateLimitSlot({
      key: clientKey(req, secret),
      windowMs: WINDOW_MS,
      maxAttempts: MAX_ATTEMPTS
    });
  } catch {
    // Do not silently fall back to process-local memory in serverless instances.
    console.error('Owner authentication rate limiter unavailable');
    return res.status(503).json({ ok: false, error: 'rate_limiter_unavailable' });
  }

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }

  if (!safeEqual(body.pin, pin)) {
    return res.status(401).json({ ok: false, error: 'invalid_pin' });
  }

  const payload = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const token = payload + '.' + sign(payload, secret);
  setCookie(res, token, SESSION_SECONDS);
  return res.status(200).json({ ok: true, expiresIn: SESSION_SECONDS });
}
