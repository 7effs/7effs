import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The Demi gate (#demi-system) was made 9% shorter without touching its width. Measured in a browser (Chromium, this container):
//   phone   412x823   913.08px -> 830.94px  (-8.996%)   width 382px -> 382px
//   desktop 1440x900  762.08px -> 693.55px  (-8.992%)   width 1296px -> 1296px
// Other widths: 320-700 phones about -8.7%; 1280 -9.0%; 1366 -9.8%; 1600 -7.8%; 1920 -6.9%; 761-1279 unchanged.
// These tests keep the pieces that produce that: only vertical spacing and the art size changed, nothing scaled, hidden or cropped.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = html.replace(/\/\*[\s\S]*?\*\//g, '')
const DESKTOP = '@media(min-width:1280px){.demi-gate{padding-top:46px;padding-bottom:46px}'
const desktopAt = css.indexOf(DESKTOP)
const desktop = desktopAt < 0 ? '' : css.slice(desktopAt, css.indexOf('\n', desktopAt))

test('phone (<=760px): the vertical spacing is tighter and the art is 9% smaller; the old values are gone', () => {
  const now = [
    '.demi-gate{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto auto auto auto;column-gap:0;min-height:0;padding:16px 17px 14px}',
    '.demi-system-header{grid-column:1;grid-row:1;gap:7px;padding-bottom:8px;',
    'width:min(91%,355px);margin:0 auto -7px;aspect-ratio:1/1;opacity:.9}',
    '.demi-gate-copy{grid-column:1;grid-row:3;margin:0 0 13px;padding:0}',
    '.demi-gate-copy h2{max-width:450px;margin:11px 0 12px;',
    'grid-template-columns:repeat(2,minmax(0,1fr));margin-top:2px}',
    '.demi-gate-console>div{padding:9px 9px 9px 0;',
    '.demi-enter{grid-column:1;grid-row:5;width:100%;margin:13px 0 0;',
    'justify-content:space-between;gap:10px;padding:0;margin:11px 0 0}',
    '#demi-system #demiGate .demi-owner-link-entrance{margin-top:7px}',
    '.demi-gate-console>div{padding:9px 7px}', // the narrow-phone (<=400px) rule, so it is not left taller than the rest
  ]
  for (const s of now) assert.equal(css.split(s).length - 1, 1, `exactly once: ${s}`)
  for (const old of ['padding:21px 17px 19px}', 'width:min(100%,390px);margin:0 auto -7px', 'margin:0 0 20px;padding:0}', 'margin:13px 0 15px;', 'margin-top:4px}', 'padding:12px 9px 12px 0;', 'margin:17px 0 0;min-height:57px', 'padding:0;margin:15px 0 0}', '.demi-gate-console>div{padding:11px 7px}']) {
    assert.ok(!css.includes(old), `old value removed: ${old}`)
  }
})

test('phone: the three orbit rings keep their place relative to the art (their top moved up with it)', () => {
  assert.ok(css.includes('.demi-gate-orbit{right:-4%;top:15.7%;width:75%;opacity:.62}'))
  assert.ok(css.includes('.demi-gate-orbit.orbit-b{right:-2%;top:14.7%;width:68%;opacity:.7}'))
  assert.ok(css.includes('.demi-gate-orbit.orbit-c{right:4%;top:13.7%;width:58%}'))
})

test('desktop (>=1280px): one block after the base rules; shorter padding and margins, art and rings 7% smaller', () => {
  assert.equal(css.split(DESKTOP).length - 1, 1, 'exactly one desktop block')
  const base = css.indexOf('.demi-gate{position:relative;isolation:isolate;display:grid')
  const rings = css.indexOf('.demi-gate-orbit{position:absolute;z-index:-1;right:5%')
  assert.ok(base > 0 && rings > 0 && desktopAt > base && desktopAt > rings, 'it comes after the rules it replaces, so equal specificity is enough')
  for (const s of [
    '.demi-gate-core{width:min(53%,604px)}', // was min(57%,650px)
    '.demi-gate-copy{margin-top:clamp(64px,6.7vw,96.5px);margin-bottom:16px}', // was clamp(78px,10vw,124px) 0 22px
    '.demi-gate-console,.demi-enter,.demi-gate-foot{margin-top:16px}', // were 22, 21 and 21
    // the rings shrink by the same 604/650 and keep their centre relative to the art, so the figure is the same drawing, smaller
    '.demi-gate-orbit{right:4.72%;width:min(46.5%,530px)}',
    '.demi-gate-orbit.orbit-b{right:7.5%;width:min(41.8%,474px)}',
    '.demi-gate-orbit.orbit-c{right:11.22%;width:min(34.4%,400px)}',
  ]) assert.ok(desktop.includes(s), s)
  assert.ok(desktop.endsWith('}}'), 'the block is closed on its own line')
})

test('height only: no !important, no transform or zoom, nothing hidden, and no change to the width, columns, side padding or floor', () => {
  assert.doesNotMatch(desktop, /!important/)
  assert.doesNotMatch(desktop, /transform|zoom|scale|display\s*:|visibility|overflow|opacity|clip/, 'nothing scaled, hidden or cropped')
  assert.doesNotMatch(desktop, /padding-left|padding-right|grid-template|min-height|max-height|font-size|line-height|letter-spacing/, 'columns, side padding, floor and typography untouched')
  // the section and the gate get vertical padding only; the only widths set are the art's and its rings'
  const rules = [...desktop.slice(DESKTOP.length - '.demi-gate{padding-top:46px;padding-bottom:46px}'.length, -1).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1], m[2]])
  assert.deepEqual(rules.map((r) => r[0]), ['.demi-gate', '.demi-gate-core', '.demi-gate-copy', '.demi-gate-console,.demi-enter,.demi-gate-foot', '.demi-gate-orbit', '.demi-gate-orbit.orbit-b', '.demi-gate-orbit.orbit-c'])
  assert.equal(rules[0][1], 'padding-top:46px;padding-bottom:46px', 'the gate: top and bottom only')
  assert.ok(!/(^|[;{])width:/.test(rules[0][1]) && !desktop.includes('#demi-system'), 'neither the section nor the gate gets a width')
  for (const [sel, body] of rules) if (/(^|;)width:/.test(body)) assert.match(sel, /^\.demi-gate-(core|orbit)/, `a width only on the art or a ring: ${sel}`)
  // the base gate rule still has its columns, its side padding (the clamp) and its 670px floor
  const gate = css.match(/\.demi-gate\{position:relative;isolation:isolate;display:grid;[^}]*\}/)?.[0] ?? ''
  assert.match(gate, /grid-template-columns:minmax\(0,\.92fr\) minmax\(380px,1\.08fr\)/)
  assert.match(gate, /min-height:670px/)
  assert.match(gate, /padding:clamp\(28px,4\.3vw,58px\)/)
  assert.doesNotMatch(gate, /transform|zoom/)
  // the phone heading and body type are as they were
  assert.ok(css.includes('.demi-gate-copy h2{max-width:450px;margin:11px 0 12px;font-size:clamp(3.1rem,12.4vw,5rem);line-height:.84}'))
})

test('the Demi section is still the same two states and the same elements', () => {
  for (const id of ['demi-system', 'demiGate', 'demiEnter', 'demiOrbitToggle', 'demiOwnerOpenEntrance']) assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) ?? []).length, 1, id)
  assert.equal((html.match(/class="demi-gate-orbit orbit-[abc]"/g) ?? []).length, 3, 'the three rings')
})
