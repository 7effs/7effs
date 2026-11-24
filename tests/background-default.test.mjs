// The video is the first-visit background; a deliberate choice is remembered; Saturn exists only while it is the chosen background.
// jaye-background-choice-runtime decides the mode and is the one place a choice is stored. These tests run the real scripts from index.html
// against small fakes (see media-lifecycle.test.mjs for the video and photograph scripts, saturn-canvas.test.mjs for the drawing code).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const scriptOf = (id) => html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`))?.[1] ?? ''
const choiceScript = scriptOf('jaye-background-choice-runtime')
const saturnScript = scriptOf('jaye-tornado-page-background')

// ---- the mode and its storage ----
function runChoice({ saved, reduce = false, getThrows = false, setThrows = false } = {}) {
  const attrs = {}, listeners = new Map(), writes = []
  const store = { value: saved }
  const root = { setAttribute: (k, v) => { attrs[k] = String(v) }, getAttribute: (k) => attrs[k] ?? null }
  const document = {
    documentElement: root,
    addEventListener: (type, cb) => { const l = listeners.get(type) ?? []; l.push(cb); listeners.set(type, l) },
  }
  const sandbox = {
    document,
    matchMedia: () => ({ matches: reduce }),
    CustomEvent,
  }
  Object.defineProperty(sandbox, 'localStorage', {
    get() {
      if (getThrows) throw new Error('SecurityError: storage is blocked')
      return {
        getItem: () => (store.value === undefined ? null : store.value),
        setItem: (k, v) => { if (setThrows) throw new Error('QuotaExceededError'); writes.push([k, v]); store.value = v },
      }
    },
  })
  vm.runInNewContext(choiceScript, sandbox)
  const choose = (mode, manual) => { for (const cb of listeners.get('jaye-background-choice') ?? []) cb({ detail: { mode, manual } }) }
  return { mode: () => attrs['data-jaye-bg'], choose, writes, store }
}

test('first visit (nothing saved): the video', () => {
  const r = runChoice()
  assert.equal(r.mode(), 'video')
  assert.deepEqual(r.writes, [], 'opening the page with the default saves nothing')
})

test('a saved choice is used exactly as it was saved, and opening the page never rewrites it', () => {
  for (const saved of ['video', 'saturn', 'amber', 'noir']) {
    const r = runChoice({ saved })
    assert.equal(r.mode(), saved)
    assert.deepEqual(r.writes, [], saved)
    assert.equal(r.store.value, saved)
  }
})

test('an unknown, empty or damaged saved value is treated as nothing saved', () => {
  for (const saved of ['banana', '', 'SATURN', '{"mode":"amber"}', 'undefined']) assert.equal(runChoice({ saved }).mode(), 'video', JSON.stringify(saved))
})

test('blocked storage (reading throws) still opens on the video, and the page keeps working', () => {
  const r = runChoice({ getThrows: true })
  assert.equal(r.mode(), 'video')
  r.choose('amber', true)
  assert.equal(r.mode(), 'amber', 'the choice still applies for this visit')
})

test('reduced motion never auto-plays the video: the default and a saved "video" open on Saturn, unsaved; saved photographs and Saturn are unchanged', () => {
  for (const saved of [undefined, 'video']) {
    const r = runChoice({ saved, reduce: true })
    assert.equal(r.mode(), 'saturn', String(saved))
    assert.deepEqual(r.writes, [], 'the override is not a choice: it is not saved')
    assert.equal(r.store.value, saved, 'a saved "video" is still saved, for a visit without reduced motion')
  }
  assert.equal(runChoice({ saved: 'amber', reduce: true }).mode(), 'amber')
  assert.equal(runChoice({ saved: 'saturn', reduce: true }).mode(), 'saturn')
})

test('only a deliberate selection is written; a fallback or a default is not, and a saved choice survives them', () => {
  const r = runChoice({ saved: 'video' })
  r.choose('saturn', false) // the video could not play: Saturn for this visit
  assert.equal(r.mode(), 'saturn')
  assert.deepEqual(r.writes, [])
  assert.equal(r.store.value, 'video', 'the saved choice is untouched')
  r.choose('amber', true) // the visitor picks a photograph
  assert.equal(r.mode(), 'amber')
  assert.deepEqual(r.writes, [['jaye-background', 'amber']])
  r.choose('video', true)
  r.choose('saturn', true)
  assert.deepEqual(r.writes.map((w) => w[1]), ['amber', 'video', 'saturn'], 'every manual selection replaces the remembered one')
})

test('an unknown mode is ignored, and a full or blocked store does not stop the choice applying', () => {
  const r = runChoice({ setThrows: true })
  r.choose('neon', true)
  assert.equal(r.mode(), 'video')
  r.choose('noir', true)
  assert.equal(r.mode(), 'noir')
  assert.deepEqual(r.writes, [])
})

test('the choice script is tiny, runs before every background script, and uses one storage key', () => {
  const at = (id) => html.indexOf(`<script id="${id}">`)
  for (const id of ['jaye-tornado-page-background', 'jaye-optional-image-backgrounds-runtime-v1', 'jaye-global-background-video-toggle-runtime']) assert.ok(at('jaye-background-choice-runtime') > 0 && at('jaye-background-choice-runtime') < at(id), `before ${id}`)
  assert.ok(at('jaye-background-choice-runtime') < html.indexOf('<canvas id="jaye-tornado-background"'), 'before the layers themselves')
  assert.equal((choiceScript.match(/localStorage\.(get|set)Item/g) ?? []).length, 2, 'one read and one write, both guarded')
  assert.equal((choiceScript.match(/try\{/g) ?? []).length, 2)
  assert.equal((choiceScript.match(/KEY='jaye-background'/g) ?? []).length, 1, 'one key')
  assert.equal((html.match(/['"]jaye-background['"]/g) ?? []).length, 1, 'the key is not used by any other script on the page')
  for (const id of ['jaye-tornado-page-background', 'jaye-optional-image-backgrounds-runtime-v1', 'jaye-global-background-video-toggle-runtime']) assert.doesNotMatch(scriptOf(id), /localStorage/, `${id} never touches storage itself`)
  assert.equal((html.match(/id="jaye-background-choice-runtime"/g) ?? []).length, 1)
  assert.equal((html.match(/<video id="jaye-global-video-background"[^>]*\bmuted\b[^>]*\bloop\b[^>]*\bplaysinline\b/g) ?? []).length, 1, 'muted, loop and playsinline stay on the video')
})

// ---- Saturn is built only for the mode "saturn" ----
function runSaturn(mode) {
  const counts = { getContext: 0, createElement: 0, raf: 0, timeout: 0, mutation: 0, intersection: 0, windowListeners: 0, documentListeners: 0 }
  const docListeners = new Map()
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {})), set: (t, k, v) => { t[k] = v; return true } })
  const fakeCanvas = () => ({ width: 300, height: 150, clientHeight: 900, style: {}, dataset: {}, getContext() { counts.getContext++; return ctx } })
  const canvas = fakeCanvas()
  const attrs = { 'data-jaye-bg': mode }
  const root = { classList: { contains: () => false }, getAttribute: (k) => attrs[k] ?? null }
  const document = {
    documentElement: root, hidden: false, body: { getAttribute: () => null },
    getElementById: (id) => (id === 'jaye-tornado-background' ? canvas : null),
    createElement: () => { counts.createElement++; return fakeCanvas() },
    addEventListener: (type, cb) => { counts.documentListeners++; const l = docListeners.get(type) ?? []; l.push(cb); docListeners.set(type, l) },
    removeEventListener: (type, cb) => { counts.documentListeners--; docListeners.set(type, (docListeners.get(type) ?? []).filter((x) => x !== cb)) },
  }
  const sandbox = {
    document, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, Path2D: class { moveTo() {} lineTo() {} },
    matchMedia: () => ({ matches: false }), performance: { now: () => 1000 },
    requestAnimationFrame: () => { counts.raf++; return counts.raf }, cancelAnimationFrame() {},
    setTimeout: () => { counts.timeout++; return counts.timeout }, clearTimeout() {},
    addEventListener: () => { counts.windowListeners++ },
    MutationObserver: class { constructor() { counts.mutation++ } observe() {} },
    IntersectionObserver: class { constructor() { counts.intersection++ } observe() {} },
  }
  sandbox.window = sandbox
  vm.runInNewContext(saturnScript, sandbox)
  const choose = (m) => { for (const cb of [...(docListeners.get('jaye-background-choice') ?? [])]) cb({ detail: { mode: m, manual: false } }) }
  return { counts, canvas, choose, waiting: () => (docListeners.get('jaye-background-choice') ?? []).length }
}
const idle = { getContext: 0, createElement: 0, raf: 0, timeout: 0, mutation: 0, intersection: 0, windowListeners: 0 }
const pick = (counts) => Object.fromEntries(Object.keys(idle).map((k) => [k, counts[k]]))

test('Saturn: on any other mode nothing is built - no canvas context, no bitmaps, no frames, no timers, no observers, no listeners', () => {
  for (const mode of ['video', 'amber', 'noir']) {
    const s = runSaturn(mode)
    assert.deepEqual(pick(s.counts), idle, mode)
    assert.equal(s.waiting(), 1, `${mode}: the only thing it does is wait for the one choice event`)
    assert.equal(s.canvas.width, 300, `${mode}: the canvas is never even sized`)
    assert.equal(s.canvas.dataset.saturnState, undefined, mode)
  }
})

test('Saturn: choosing the video or a photograph changes nothing; choosing Saturn builds it once and starts the one loop', () => {
  const s = runSaturn('video')
  s.choose('video'); s.choose('amber'); s.choose('noir')
  assert.deepEqual(pick(s.counts), idle, 'other choices leave it asleep')
  s.choose('saturn')
  assert.ok(s.counts.getContext >= 3, 'the page canvas, the halo bitmap and the planet bitmap')
  assert.equal(s.counts.mutation, 1)
  assert.equal(s.counts.intersection, 1)
  assert.equal(s.counts.raf, 1, 'one frame loop is armed')
  assert.equal(s.canvas.dataset.saturnState, 'running')
  assert.ok(s.canvas.width > 300, 'sized for the page')
  assert.equal(s.waiting(), 0, 'it stopped waiting: starting is once only')
  const before = pick(s.counts)
  s.choose('saturn')
  assert.deepEqual(pick(s.counts), before, 'a second "saturn" cannot build a second copy')
})

test('Saturn: when the page opens on Saturn (saved choice, or reduced motion) it starts at once and waits for nothing', () => {
  const s = runSaturn('saturn')
  assert.ok(s.counts.getContext >= 3)
  assert.equal(s.waiting(), 0)
  assert.equal(s.canvas.dataset.saturnState, 'running')
})

test('Saturn script: the whole build sits inside start(), reached only by the "saturn" mode or the choice event', () => {
  const code = saturnScript.replace(/\/\*[\s\S]*?\*\//g, '')
  const startAt = code.indexOf('function start(){')
  assert.ok(startAt > 0)
  assert.ok(code.indexOf('getContext(') > startAt, 'no context before start()')
  assert.ok(code.indexOf('Math.random()') > startAt, 'no particle cloud before start()')
  assert.ok(code.indexOf('requestAnimationFrame(') > startAt && code.indexOf('new MutationObserver') > startAt && code.indexOf('new IntersectionObserver') > startAt)
  const tail = code.slice(code.lastIndexOf('evaluate();') + 'evaluate();'.length)
  assert.match(tail, /^\s*\}\s*if\(rootEl\.getAttribute\('data-jaye-bg'\)==='saturn'\)start\(\);\s*else document\.addEventListener\('jaye-background-choice',function wait\(e\)\{if\(e\.detail&&e\.detail\.mode==='saturn'\)\{document\.removeEventListener\('jaye-background-choice',wait\);start\(\)\}\}\);\s*\}\)\(\);/)
})
