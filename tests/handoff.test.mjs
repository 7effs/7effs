import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { ONLINE_BUDGET_MS, sanitizeReply, startHandoff } from '../src/baew/handoff.ts'

const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }

test('the budget is five seconds', () => assert.equal(ONLINE_BUDGET_MS, 5000))

test('an online reply inside the budget is the one shown', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    const d = deferred()
    const h = startHandoff({ online: () => d.promise, local: 'LOCAL' })
    mock.timers.tick(1200)
    d.resolve('Online answer.')
    const r = await h.result
    assert.equal(r.source, 'online'); assert.equal(r.text, 'Online answer.'); assert.equal(r.reason, 'online-ok'); assert.equal(r.elapsedMs, 1200)
  } finally { mock.timers.reset() }
})

test('at exactly five seconds the local brain takes over, the request is aborted, and a late reply is ignored', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    const d = deferred(); let signal
    const h = startHandoff({ online: s => { signal = s; return d.promise }, local: 'LOCAL' })
    let settled = false; h.result.then(() => { settled = true })
    mock.timers.tick(4999); await flush()
    assert.equal(settled, false, 'still waiting at 4999 ms')
    assert.equal(signal.aborted, false)
    mock.timers.tick(1); const r = await h.result
    assert.equal(r.source, 'local'); assert.equal(r.reason, 'timeout'); assert.equal(r.text, 'LOCAL'); assert.equal(r.elapsedMs, 5000)
    assert.equal(signal.aborted, true)
    d.resolve('Too late.'); await flush()
    assert.equal((await h.result).text, 'LOCAL', 'the late reply never replaces the local answer')
  } finally { mock.timers.reset() }
})

test('a failure falls back at once and does not wait for the budget', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    const d = deferred()
    const h = startHandoff({ online: () => d.promise, local: 'LOCAL' })
    mock.timers.tick(300); d.reject(new Error('502'))
    const r = await h.result
    assert.deepEqual([r.source, r.reason, r.elapsedMs], ['local', 'error', 300])
  } finally { mock.timers.reset() }
})

test('a request that throws synchronously also falls back', async () => {
  const r = await startHandoff({ online: () => { throw new Error('boom') }, local: 'LOCAL' }).result
  assert.deepEqual([r.source, r.reason], ['local', 'error'])
})

test('offline: local at once, the online request is never made', async () => {
  let called = false
  const r = await startHandoff({ online: () => { called = true; return Promise.resolve('x') }, local: 'LOCAL', offline: () => true }).result
  assert.equal(called, false); assert.deepEqual([r.source, r.reason], ['local', 'offline'])
})

test('local only: no request is made', async () => {
  const r = await startHandoff({ online: null, local: 'LOCAL' }).result
  assert.deepEqual([r.source, r.reason, r.elapsedMs], ['local', 'local-only', 0])
})

test('an unusable reply (empty, a link, not text) is replaced by the local answer', async () => {
  for (const bad of ['', '   ', 'See https://example.com for more', 'www.example.com', 42, null, undefined, { reply: 'x' }]) {
    const r = await startHandoff({ online: () => Promise.resolve(bad), local: 'LOCAL' }).result
    assert.deepEqual([r.source, r.reason], ['local', 'invalid'], String(bad))
  }
})

test('cancelling settles with nothing to show, aborts the request and ignores a late reply', async () => {
  const d = deferred(); let signal
  const h = startHandoff({ online: s => { signal = s; return d.promise }, local: 'LOCAL' })
  h.cancel(); h.cancel()
  assert.equal(await h.result, null); assert.equal(signal.aborted, true)
  d.resolve('late'); await flush()
  assert.equal(await h.result, null)
})

test('cancel after settling changes nothing', async () => {
  const h = startHandoff({ online: null, local: 'LOCAL' })
  const r = await h.result; h.cancel()
  assert.equal(r.text, 'LOCAL')
})

test('two requests in a row: the older one can never reach the visitor once cancelled', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    const first = deferred(), second = deferred()
    const a = startHandoff({ online: () => first.promise, local: 'LOCAL A' })
    mock.timers.tick(1000)
    a.cancel()
    const b = startHandoff({ online: () => second.promise, local: 'LOCAL B' })
    second.resolve('Answer B.'); first.resolve('Answer A.')
    assert.equal(await a.result, null)
    assert.equal((await b.result).text, 'Answer B.')
  } finally { mock.timers.reset() }
})

test('sanitizeReply: speaker label, markdown and runaway length', () => {
  assert.equal(sanitizeReply('Baew: **Hello**   there.'), 'Hello there.')
  assert.equal(sanitizeReply('  '), null)
  assert.equal(sanitizeReply('Visit https://x.y'), null)
  const long = 'A sentence that is fairly long. '.repeat(30)
  const cut = sanitizeReply(long, 200)
  assert.ok(cut.length <= 200 && cut.endsWith('.'), cut)
  assert.equal(sanitizeReply(7), null)
})
