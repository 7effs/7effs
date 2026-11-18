import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const controller = html.match(/<script>\s*(\/\* Glimpse audio controller — request-safe native playback;[\s\S]*?)<\/script>/)?.[1] ?? ''
assert.ok(controller.length > 1000, 'the isolated Glimpse controller must exist')

class FakeClassList {
  values = new Set()
  toggle(name, enabled) {
    if (enabled) this.values.add(name)
    else this.values.delete(name)
  }
  contains(name) { return this.values.has(name) }
}

class FakeElement {
  constructor(text = '') {
    this.textContent = text
    this.classList = new FakeClassList()
    this.listeners = new Map()
    this.attributes = {}
    this.dataset = {}
  }
  addEventListener(type, callback) {
    const list = this.listeners.get(type) ?? []
    list.push(callback)
    this.listeners.set(type, list)
  }
  setAttribute(name, value) { this.attributes[name] = value }
  dispatch(type) {
    for (const callback of this.listeners.get(type) ?? []) callback({ type, target: this })
  }
  replaceWith() {}
}

class FakeAudio extends FakeElement {
  constructor(baseURI) {
    super()
    this.baseURI = baseURI
    this.paused = true
    this.ended = false
    this.error = null
    this.currentSrc = ''
    this._src = ''
    this.pendingPlays = []
    this.pendingPauseEvents = 0
  }
  get src() { return this._src }
  set src(value) { this._src = new URL(value, this.baseURI).href }
  load() {
    this.error = null
    this.ended = false
    this.currentSrc = ''
    this.paused = true
  }
  play() {
    this.paused = false
    let resolve
    let reject
    const promise = new Promise((res, rej) => { resolve = res; reject = rej })
    this.pendingPlays.push({ promise, resolve, reject })
    return promise
  }
  pause() {
    if (this.paused) return
    this.paused = true
    this.pendingPauseEvents += 1
  }
  flushPauseEvent() {
    if (!this.pendingPauseEvents) return
    this.pendingPauseEvents -= 1
    this.dispatch('pause')
  }
  selectResource() { this.currentSrc = this.src }
}

function makeButton(path, name) {
  const button = new FakeElement()
  button.dataset.track = path
  const children = {
    '.glimpse-track-name': new FakeElement(name),
    '.glimpse-track-state': new FakeElement('Tap to play'),
    '.glimpse-play': new FakeElement('▶'),
  }
  button.querySelector = selector => children[selector] ?? null
  button.children = children
  return button
}

function createHarness() {
  const baseURI = 'https://jaye.example/'
  const audio = new FakeAudio(baseURI)
  const siteAudio = new FakeAudio(baseURI)
  const note = new FakeElement()
  const trackA = makeButton('/glimpse/song1.mp3', 'A.')
  const trackB = makeButton('/glimpse/song2.mp3', 'B.')
  const buttons = [trackA, trackB]
  const document = {
    baseURI,
    getElementById(id) {
      return id === 'glimpseAudio' ? audio :
        id === 'siteAudio' ? siteAudio :
        id === 'glimpseNote' ? note : null
    },
    querySelectorAll(selector) {
      if (selector === '.glimpse-track') return buttons
      return []
    },
  }
  const window = { location: { origin: 'https://jaye.example' } }
  vm.runInNewContext(controller, { document, window, URL, Promise })
  return { audio, siteAudio, note, trackA, trackB }
}

const tick = async () => { await Promise.resolve(); await Promise.resolve() }
const click = button => button.dispatch('click')

test('rapid A → B switching ignores stale play promises and stale media events', async () => {
  const h = createHarness()
  click(h.trackA)
  assert.match(h.note.textContent, /^Loading: A\./)
  const oldARequest = h.audio.pendingPlays[0]

  click(h.trackB)
  assert.match(h.note.textContent, /^Loading: B\./)
  assert.equal(h.audio.pendingPlays.length, 2)

  // A delayed event from the old source arrives before B has been selected.
  h.audio.dispatch('playing')
  assert.match(h.note.textContent, /^Loading: B\./, 'an empty currentSrc must not promote B to playing')
  h.audio.flushPauseEvent()
  assert.match(h.note.textContent, /^Loading: B\./, 'the queued pause from A must not pause B')

  h.audio.selectResource()
  h.audio.dispatch('playing')
  assert.equal(h.note.textContent, 'Now playing: B.')

  oldARequest.resolve()
  await tick()
  assert.equal(h.note.textContent, 'Now playing: B.', 'late A play() resolution must not overwrite B')

  h.audio.pendingPlays[1].resolve()
  await tick()
  assert.equal(h.note.textContent, 'Now playing: B.')
  assert.equal(h.trackB.attributes['aria-pressed'], 'true')
})

test('pause and resume retain the selected track and update the actual player state', async () => {
  const h = createHarness()
  click(h.trackA)
  h.audio.selectResource()
  h.audio.pendingPlays[0].resolve()
  await tick()
  assert.equal(h.note.textContent, 'Now playing: A.')

  click(h.trackA)
  assert.equal(h.audio.paused, true)
  assert.equal(h.note.textContent, 'Paused: A.')
  h.audio.dispatch('pause')
  assert.equal(h.note.textContent, 'Paused: A.')

  click(h.trackA)
  assert.equal(h.audio.pendingPlays.length, 2, 'a later tap retries/resumes')
  h.audio.pendingPlays[1].resolve()
  await tick()
  assert.equal(h.note.textContent, 'Now playing: A.')
})

test('media network errors are classified and the same source can be retried', async () => {
  const h = createHarness()
  click(h.trackB)
  h.audio.error = { code: 2 }
  h.audio.dispatch('error')
  assert.match(h.note.textContent, /Could not load this track/)

  click(h.trackB)
  assert.equal(h.audio.error, null, 'retry reloads a failed source')
  assert.equal(h.audio.pendingPlays.length, 2)
  h.audio.selectResource()
  h.audio.pendingPlays[1].resolve()
  await tick()
  assert.equal(h.note.textContent, 'Now playing: B.')
})

test('browser playback restrictions produce a useful retry message', async () => {
  const h = createHarness()
  click(h.trackA)
  const denied = new Error('user activation required')
  denied.name = 'NotAllowedError'
  h.audio.pendingPlays[0].reject(denied)
  await tick()
  assert.match(h.note.textContent, /browser blocked playback/i)
})

test('stale old-source errors and invalid external paths cannot hijack the current track', () => {
  const h = createHarness()
  click(h.trackA)
  click(h.trackB)

  h.audio.currentSrc = 'https://jaye.example/glimpse/song1.mp3'
  h.audio.error = { code: 2 }
  h.audio.dispatch('error')
  assert.match(h.note.textContent, /^Loading: B\./, 'an A error must not be attributed to B')

  h.trackA.dataset.track = 'https://other.example/song.mp3'
  const requests = h.audio.pendingPlays.length
  click(h.trackA)
  assert.equal(h.audio.pendingPlays.length, requests, 'cross-origin audio sources are rejected')
  assert.match(h.note.textContent, /invalid audio path/i)
})

test('build configuration requires both Glimpse audio files in the output', () => {
  const config = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
  assert.match(config, /for \(const file of \["glimpse\/song1\.mp3", "glimpse\/song2\.mp3"\]\)/)
  assert.match(config, /Required Glimpse audio asset missing or empty/)
  assert.match(config, /statSync\(source\)\.size === 0/)
  assert.match(config, /statSync\(output\)\.size === 0/)
})
