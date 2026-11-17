import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const guide = readFileSync(new URL('../src/StrobiGuide.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/widget.css', import.meta.url), 'utf8')

test('the collapsed Baew restore pill remains anchored to the viewport', () => {
  // There is an earlier reset rule with the same selector. Select the actual
  // positioning rule rather than the first matching block in the stylesheet.
  const block = [...css.matchAll(/\.restore-strobi\s*\{([\s\S]*?)\n\}/g)]
    .map(match => match[1])
    .find(rule => /position:\s*fixed/.test(rule))
  assert.ok(block, 'restore pill fixed-position CSS rule exists')
  assert.match(block, /left:\s*max\(8px,\s*env\(safe-area-inset-left\)\)/)
  assert.match(block, /bottom:\s*max\(8px,\s*env\(safe-area-inset-bottom\)\)/)
  assert.doesNotMatch(block, /transition:[^;]*(?:left|bottom)/)
  assert.doesNotMatch(css, /--strobi-pill-(?:dx|lift)/)
  assert.doesNotMatch(guide, /\bpillShift\b|\bpillRef\b/)
})

test('page-content clearance applies to the visible mascot, not the restore pill', () => {
  const start = guide.indexOf('// Mascot home clearance only.')
  const end = guide.indexOf('// A bubble opening', start)
  assert.ok(start >= 0 && end > start, 'mascot home-clearance effect exists')
  const effect = guide.slice(start, end)
  assert.match(effect, /if \(hidden\) return/)
  assert.match(effect, /findHomeShift\(/)
  assert.match(effect, /getContentBoxes\(/)
  assert.doesNotMatch(effect, /pillShift|pillRef|restore-strobi/)
  assert.match(effect, /let active = true/)
  assert.match(effect, /if \(!active\) return/)
  assert.match(effect, /active = false/)
})

test('the mascot idle-glide still avoids interactive controls', () => {
  assert.match(guide, /getControlBoxes\(viewWidth, viewHeight\)/)
  assert.match(guide, /overlapArea\(footprint, control\)/)
})
