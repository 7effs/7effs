import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const raw = html.match(/<style id="jaye-intro-void-v10">([\s\S]*?)<\/style>/)?.[1] ?? ''
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')
const peak = [...html.matchAll(/<style id="(?:jaye-intro-cinematic-peak-v[56])">([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
const seqAt = html.indexOf('<div class="jaye-v5-sequence"')
const seqEnd = html.indexOf('<div class="jaye-intro-depth"', seqAt)
const sequence = html.slice(seqAt, seqEnd)
const wrapper = sequence.match(/<div class="jaye-v10-void" aria-hidden="true">([\s\S]*?)<\/div>/)?.[1] ?? ''
const faceNames = ['soffit', 'west', 'east', 'west-return', 'east-return', 'sill']
const rules = src => [...src.matchAll(/([^{}@][^{}]*)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim(), body: m[2] }))
const rule = sel => {
  const found = rules(css).find(r => r.sel === sel)
  assert.ok(found, `missing rule: ${sel}`)
  return found.body
}
const pin = (needle, delay) => {
  const i = peak.indexOf(needle)
  assert.ok(i >= 0 && peak.slice(i, i + 180).includes(` ${delay} both`), needle)
}

test('the shuttered wall is replaced by a single field and an off-axis architectural cut', () => {
  assert.equal((html.match(/id="jaye-intro-void-v10"/g) ?? []).length, 1)
  assert.equal((html.match(/class="jaye-v10-void"/g) ?? []).length, 1)
  assert.equal((wrapper.match(/class="jaye-void-cut"/g) ?? []).length, 1)
  assert.equal((wrapper.match(/class="jaye-void-face jaye-void-face--[\w-]+"/g) ?? []).length, 6)
  for (const face of faceNames) assert.ok(wrapper.includes(`jaye-void-face--${face}`), face)
  assert.equal(wrapper.replace(/<[^>]+>/g, '').trim(), '', 'no wording was added')
  assert.ok(sequence.indexOf('jaye-v5-blade') < sequence.indexOf('jaye-v10-void'))
  assert.ok(sequence.indexOf('jaye-v10-void') < sequence.indexOf('jaye-v5-final-stage'))
  assert.doesNotMatch(html, /jaye-v9-monolith|jaye-v9-slab|jaye-v9-seam|jayeV9Rise|jayeV9Part|feTurbulence/)
})

test('the void opens from 6.52 s to 7.98 s and consumes the field by 8.88 s', () => {
  const cut = rule('#jaye-intro-v1.jaye-intro-play .jaye-void-cut')
  assert.match(cut, /animation:jayeVoidCutOpen 2\.36s [^;]+ 6\.52s both/)
  const key = css.match(/@keyframes jayeVoidCutOpen\{([\s\S]*?)\}\}/)?.[1] ?? ''
  assert.match(key, /0%\{transform:translate3d\(-50%,-50%,0\) scale\(\.008,1\)\}/)
  assert.match(key, /61\.864%\{transform:translate3d\(-50%,-50%,0\) scale\(1,1\)\}/)
  assert.match(key, /100%\{transform:translate3d\(-50%,-50%,0\) scale\(3\.2,2\.45\)\}/)
  assert.equal(Math.round((6.52 + 2.36) * 100) / 100, 8.88)
  assert.equal(Math.round((6.52 + 2.36 * .61864) * 100) / 100, 7.98)
})

test('the six interior planes are deliberate surfaces with one bounded lifetime', () => {
  const anims = [
    ['soffit', 'jayeVoidFaceNorth'],
    ['west', 'jayeVoidFaceWest'],
    ['east', 'jayeVoidFaceEast'],
    ['west-return', 'jayeVoidFaceWest'],
    ['east-return', 'jayeVoidFaceEast'],
    ['sill', 'jayeVoidFaceSouth']
  ]
  for (const [face, animation] of anims) {
    assert.match(rule(`#jaye-intro-v1 .jaye-void-face--${face}`), /clip-path:polygon\(/, face)
    assert.match(rule(`#jaye-intro-v1.jaye-intro-play .jaye-void-face--${face}`), new RegExp(`animation:${animation} 2\\.36s [^;]+ 6\\.52s both`), face)
  }
  for (const name of ['jayeVoidFaceNorth', 'jayeVoidFaceSouth', 'jayeVoidFaceWest', 'jayeVoidFaceEast']) {
    const frame = css.match(new RegExp(`@keyframes ${name}\\{([\\s\\S]*?)\\}\\}`))?.[1] ?? ''
    assert.match(frame, /opacity:0/)
    assert.match(frame, /opacity:1/)
    assert.match(frame, /transform:translate[XY]\(/)
  }
})

test('the composition uses flat architectural surfaces, not faux-concrete effects', () => {
  assert.match(css, /background:#eee9de/)
  assert.match(css, /background:var\(--void-ink\)/)
  assert.match(css, /clip-path:polygon\(/)
  assert.doesNotMatch(css, /gradient|filter|backdrop|mix-blend|box-shadow|border:|url\(|feTurbulence|@import|https?:|#d34a35/)
  assert.equal((css.match(/@media/g) ?? []).length, 1, 'one responsive phone layout')
  for (const r of rules(css)) {
    if (/^\d|^from|^to/.test(r.sel)) continue
    assert.match(r.sel, /^#jaye-intro-v1(?:\.jaye-intro-play)? \.jaye-/, r.sel)
  }
  for (const m of css.matchAll(/@keyframes [\w-]+\{([\s\S]*?)\}\}/g)) {
    for (const p of [...m[1].matchAll(/([a-z-]+):/g)].map(x => x[1])) assert.ok(['transform', 'opacity'].includes(p), `animated property ${p}`)
  }
})

test('the sequence layers and all final-stage anchors remain pinned', () => {
  assert.match(rule('#jaye-intro-v1 .jaye-v10-void'), /position:absolute;inset:0;z-index:6;overflow:hidden;pointer-events:none/)
  assert.match(peak, /\.jaye-v5-final-stage\{[^}]*z-index:6/)
  assert.match(peak, /\.jaye-v5-progress\{[^}]*z-index:9/)
  assert.match(peak, /\.jaye-v5-blade\{[^}]*z-index:5/)
  pin('.jaye-v5-final-rule{animation:jayeV5FinalRule .78s', '8.9s')
  pin('.jaye-v6-title-sweep{animation:jayeV6TitleSweep 1.34s', '9.08s')
  pin('.jaye-v5-final-tag{animation:jayeV5Tag .48s', '9.18s')
  pin('.jaye-v5-wordmark-echo{animation:jayeV5FinalEcho 1.55s', '7.92s')
  assert.match(html, /\.jaye-intro-exit\{animation:jayeV5Exit \.76s/)
  assert.match(html, /\.jaye-v5-progress>span\{animation:jayeV5Progress 10\.72s linear \.04s both\}/)
})
