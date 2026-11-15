import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Guards for the opening sequence: the HI scene is composed around one vanishing point in the left third, and every
// later scene (strip, phrases, cut, wipes, centred JAYE reveal) keeps its structure and timing.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = [...html.matchAll(/<style id="(?:jaye-intro-cinematic-peak-v[56])">([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n')
const rule = (sel) => {
  const i = css.indexOf(sel + '{')
  assert.ok(i >= 0, `${sel} must exist`)
  return css.slice(i, css.indexOf('}', i))
}

test('the HI composition has one vanishing point, inside the left third', () => {
  const vars = [...html.matchAll(/--hi-cx:(\d+(?:\.\d+)?)vw/g)].map(m => Number(m[1]))
  assert.ok(vars.length >= 2, 'desktop and mobile values')
  for (const v of vars) assert.ok(v > 14 && v <= 33.3, `--hi-cx ${v}vw sits in the left third`)
})

test('the surrounding geometry follows that point instead of the screen centre', () => {
  for (const sel of ['#jaye-intro-v1 .jaye-v5-greeting', '#jaye-intro-v1 .jaye-v5-axis--y', '#jaye-intro-v1 .jaye-v5-origin',
    '#jaye-intro-v1 .jaye-v5-hi-rule', '#jaye-intro-v1 .jaye-v5-hi-index', '#jaye-intro-v1 .jaye-v6-plane']) {
    assert.match(rule(sel), /var\(--hi-cx\)/, sel)
  }
  assert.match(rule('#jaye-intro-v1 .jaye-v5-depth'), /perspective-origin:var\(--hi-cx\) 50%/)
  assert.match(rule('#jaye-intro-v1 .jaye-v6-prism'), /perspective-origin:var\(--hi-cx\) 50%/)
  assert.match(rule('#jaye-intro-v1 .jaye-v5-sequence'), /perspective-origin:var\(--hi-cx\) 50%/)
  for (const f of ['a', 'b', 'c', 'd']) assert.match(rule(`#jaye-intro-v1 .jaye-v5-frame--${f}`), /var\(--hi-cx\)/, `frame ${f}`)
  assert.match(css, /@keyframes jayeV6SeamSlash\{0%\{opacity:0;transform:translate\(calc\(-50% \+ var\(--hi-dx\)\)/, 'the seam parts H and I on the new axis')
})

test('later scenes keep their timing and the final reveal stays centred', () => {
  const timings = [
    ['.jaye-v5-strip{animation:jayeV5StripSequence 1.1s', '2.34s'],
    ['.jaye-v5-phrase--one b:first-child{animation:jayeV6PhraseLeft .68s', '3.28s'],
    ['.jaye-v5-phrase--two b:last-child{animation:jayeV6PhraseLeft .72s', '4.94s'],
    ['.jaye-v5-wipe--ivory{animation:jayeV5Wipe .62s', '6.86s'],
    ['.jaye-v5-wipe--black{animation:jayeV5Wipe .57s', '7.49s'],
    ['.jaye-v5-wordmark>span:nth-child(1){animation:jayeV6LetterJ .76s', '7.98s'],
    ['.jaye-v6-title-sweep{animation:jayeV6TitleSweep 1.34s', '9.08s'],
  ]
  for (const [a, delay] of timings) {
    const i = css.indexOf(a)
    assert.ok(i >= 0, a)
    assert.ok(css.slice(i, i + 140).includes(` ${delay} both`), `${a} keeps ${delay}`)
  }
  assert.match(rule('#jaye-intro-v1 .jaye-v5-wordmark'), /left:0;right:0;[^}]*justify-content:center/)
  assert.match(rule('#jaye-intro-v1 .jaye-v5-wordmark-echo'), /left:50%;top:45%/)
  assert.match(rule('#jaye-intro-v1 .jaye-v6-final-frame'), /left:11vw;right:11vw/)
  assert.match(rule('#jaye-intro-v1 .jaye-v5-strip'), /left:0;top:43%;width:100%/)
})

test('HI keeps its typography and the opening adds no dependency or element', () => {
  assert.match(html, /--hi-fs:clamp\(136px,34vw,385px\)/)
  assert.match(html, /--hi-fs:clamp\(126px,37vw,225px\)/)
  assert.match(rule('#jaye-intro-v1 .jaye-v5-hi-core'), /font-weight:750;line-height:\.76;letter-spacing:-\.105em/)
  assert.equal((html.match(/class="jaye-v5-hi-(?:echo|core|rule|index)"/g) ?? []).length, 4, 'same four HI elements')
  assert.match(html, /<span class="jaye-v5-hi-index">A PRESENCE \/ 001<\/span>/)
})
