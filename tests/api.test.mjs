import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/strobi-guide.js'

function call({ method = 'POST', headers = { 'content-type': 'application/json' }, body = { message: 'hello' } } = {}) {
  const res = { headers: {}, statusCode: 0, body: null, setHeader(k, v) { this.headers[k] = v }, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
  return handler({ method, headers, body }, res).then(() => res)
}

test('validation is unchanged', async () => {
  process.env.STROBI_GROQ_API_KEY = 'test-key'
  assert.equal((await call({ method: 'GET' })).statusCode, 405)
  assert.equal((await call({ headers: { 'content-type': 'text/plain' } })).statusCode, 415)
  assert.equal((await call({ body: { message: '   ' } })).statusCode, 400)
  assert.equal((await call({ body: { message: 'x'.repeat(2001) } })).statusCode, 400)
  delete process.env.STROBI_GROQ_API_KEY
  assert.equal((await call()).statusCode, 500)
})

test('the assistant is told to be Baew, professional, grounded and credential-safe', async () => {
  process.env.STROBI_GROQ_API_KEY = 'test-key'
  const real = globalThis.fetch
  let sent
  globalThis.fetch = async (_url, init) => { sent = JSON.parse(init.body); return { ok: true, json: async () => ({ choices: [{ message: { content: ' Reworded. ' } }] }) } }
  try {
    const res = await call({ body: { message: 'VERIFIED ANSWER: x' } })
    assert.equal(res.statusCode, 200); assert.deepEqual(res.body, { reply: 'Reworded.' })
    const system = sent.messages[0].content
    assert.ok(system.includes('You are Baew') && !/strobi/i.test(system))
    assert.ok(system.includes('professional') && system.includes('add nothing') && system.includes('untrusted') && system.includes('credentials'))
    assert.ok(!/playful|cheeky|witty|vibe/i.test(system))
    assert.equal(sent.messages[1].content, 'VERIFIED ANSWER: x')
  } finally { globalThis.fetch = real; delete process.env.STROBI_GROQ_API_KEY }
})

test('the server gives up at 4.5 s, inside the page’s 5 s budget', async () => {
  process.env.STROBI_GROQ_API_KEY = 'test-key'
  const real = globalThis.fetch
  globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))))
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const pending = call()
    await new Promise(r => setImmediate(r))
    mock.timers.tick(4499); await new Promise(r => setImmediate(r))
    let done = false; pending.then(() => { done = true }); await new Promise(r => setImmediate(r))
    assert.equal(done, false)
    mock.timers.tick(1)
    const res = await pending
    assert.equal(res.statusCode, 504)
  } finally { mock.timers.reset(); globalThis.fetch = real; delete process.env.STROBI_GROQ_API_KEY }
})
