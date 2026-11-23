import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The Demi gate had a recurring light streak: a 12 s "demiGlassSheen" band on #demiGate::after that crossed the whole surface.
// Four older ::after rules (demiSkySweep, demiV20LightPass, demiV21Arc, demiHardGlassSweep) are all overridden by that selector,
// so the fix is one rule that wins over them and draws nothing.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = html.replace(/\/\*[\s\S]*?\*\//g, '')
const GATE_AFTER = '#demi-system #demiGate::after'

test('the gate ::after sheen is gone: one winning rule that draws nothing, and no demiGlassSheen anywhere', () => {
  const rules = [...css.matchAll(/(^|[}\s])#demi-system\s+#demiGate::after\s*\{([^}]*)\}/g)]
  assert.equal(rules.length, 1, `exactly one ${GATE_AFTER} rule, found ${rules.length}`)
  assert.equal(rules[0][2].replace(/\s+/g, ''), 'display:none')
  assert.doesNotMatch(css, /demiGlassSheen/, 'neither the keyframes nor an animation reference remains')
  assert.doesNotMatch(css, /#demi-system\s+#demiGate::after\s*\{[^}]*animation/, 'no animation on the gate ::after, including in reduced motion')
})

test('the winning rule sits after the older ::after rules it has to keep dead, so display:none can never be outranked by them', () => {
  const at = css.indexOf(GATE_AFTER + '{')
  assert.ok(at > 0)
  // the older rules are still present (not touched) and all come earlier in the file
  for (const re of [/\.demi-gate::after\{[^}]*demiSkySweep/, /#demi-system \.demi-gate::after\{[^}]*demiV20LightPass/, /#demi-system \.demi-gate::after\{[^}]*demiV21Arc/, /#demiGate::after\{[^}]*demiHardGlassSweep/]) {
    const m = css.match(re)
    assert.ok(m, `older rule still present: ${re}`)
    assert.ok(css.indexOf(m[0]) < at, `older rule comes before the winner: ${re}`)
  }
})

test('only the sheen was removed: the core pulse, the orbits and the Enter button sheen are as they were', () => {
  assert.match(css, /#demi-system #demiGate \.demi-gate-core\{[^}]*animation:demiGlassCore 4\.6s ease-in-out infinite!important/)
  assert.match(css, /@keyframes demiGlassCore\{/)
  assert.match(css, /#demi-system \.demi-enter::after\{[^}]*animation:demiV20ButtonSheen 5\.8s/)
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\s*#demi-system #demiGate \.demi-gate-core\{animation:none!important\}/)
})
