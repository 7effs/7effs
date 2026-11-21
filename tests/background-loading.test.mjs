import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, openSync, readSync, fstatSync, closeSync } from 'node:fs'

// The optional backgrounds (the video and the two photographs) cost nothing while the page parses; the video and photographs
// are then fetched after the page has loaded, or at once when the switch is used (see also media-lifecycle.test.mjs).
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const script = (id) => {
  const start = html.indexOf(`<script id="${id}">`)
  assert.ok(start > 0, `${id} exists`)
  return html.slice(start, html.indexOf('</script>', start))
}
const images = script('jaye-optional-image-backgrounds-runtime-v1')
const toggle = script('jaye-global-background-video-toggle-runtime')

test('the background video asks for nothing while the page is parsing', () => {
  assert.match(html, /<video id="jaye-global-video-background"[^>]*preload="none"[^>]*data-src="jaye-video-background\.mp4"/, 'the markup carries only data-src and preload="none"')
  assert.doesNotMatch(html, /<video id="jaye-global-video-background"[^>]* src=/, 'no src attribute until a script sets it')
  assert.match(toggle, /await video\.play\(\)/, 'the press itself still fetches it (and waits for playback before showing it)')
})

test('the background photographs are fetched at full priority, and the picker thumbnails wait for the visitor', () => {
  assert.doesNotMatch(images, /fetchPriority\s*=\s*['"]low['"]/, 'a photograph somebody is waiting for is not low priority')
  assert.match(images, /photo\.fetchPriority='high'/)
  assert.match(images, /\['pointerenter','pointerdown','focusin'\]\.forEach\(type=>switcher\.addEventListener\(type,attachThumbnails,\{once:true,passive:true\}\)\)/, 'thumbnails attach when the visitor approaches the switch')
})

test('choosing a background still waits for download + decode, so the swap never flashes empty', () => {
  assert.match(images, /warmUp\(key\)\.then\(photo=>photo&&photo\.decode\?photo\.decode\(\)/)
  assert.match(images, /if\(choice!==latestChoice\)return;/, 'a newer choice cancels an older one')
  assert.match(images, /if\(photo\)applyImage\(key\);else closePanel\(\);/, 'a failed download leaves the current background in place')
})

test('the video file has its index first (faststart), so playback can begin from the first bytes', () => {
  const fd = openSync(new URL('../jaye-video-background.mp4', import.meta.url), 'r')
  const size = fstatSync(fd).size
  const atoms = []
  const head = Buffer.alloc(16)
  for (let pos = 0; pos < size;) {
    readSync(fd, head, 0, 16, pos)
    let len = head.readUInt32BE(0)
    if (len === 1) len = Number(head.readBigUInt64BE(8))
    if (len === 0) len = size - pos
    atoms.push(head.toString('latin1', 4, 8))
    pos += len
  }
  closePrivate(fd)
  assert.ok(atoms.includes('moov') && atoms.includes('mdat'), `has moov and mdat (${atoms.join(',')})`)
  assert.ok(atoms.indexOf('moov') < atoms.indexOf('mdat'), `moov comes before mdat (${atoms.join(',')})`)
  function closePrivate(f) { closeSync(f) }
})
