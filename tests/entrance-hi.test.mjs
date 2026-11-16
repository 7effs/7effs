import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Guards for the opening sequence: the "Hi" scene is plain and anchored in the left third (a wall, the word, a plinth), and every
// later scene (strip, phrases, cut, wipes, centred JAYE reveal) keeps its structure and timing.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = [...html.matchAll(/<style id="(?:jaye-intro-cinematic-peak-v[56])">([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
const hi = (html.match(/<style id="jaye-intro-hi-v8">([\s\S]*?)<\/style>/)?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '')
const rule = (sel, src = css) => {
  // the rule whose whole selector is exactly this one (grouped selector lists are skipped)
  const m = [...src.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(x => x[1].trim() === sel)
  assert.ok(m, `${sel} must exist`)
  return m[2]
}
const greeting = html.match(/<div class="jaye-v5-greeting">([\s\S]*?)<\/div>\s*<\/div>|<div class="jaye-v5-greeting">([\s\S]*?)<div class="jaye-v5-strip">/)?.[0] ?? ''

test('the greeting reads "Hi", not "HI", and the old HI scenery is gone', () => {
  assert.match(html, /<div class="jaye-v5-hi-core"><span>H<\/span><span>i<\/span><\/div>/)
  assert.doesNotMatch(greeting, /<span>I<\/span>|>HI<|hi-echo/, 'no capital I, no HI echo copy')
  assert.doesNotMatch(html, /jaye-v7|jayeV7|jaye-v6-plane|jaye-v6-prism|jaye-v5-frame|jaye-v5-axis|jaye-v5-origin|hi-echo/, 'earlier HI scenery and the HUD marks are removed, not hidden')
  assert.doesNotMatch(hi, /brk|ticks|dim|latch|rail/, 'no brackets, tick rulers, dimension lines, pins or rails')
})

test('the scene is two plain structures anchored to the one point inside the left third', () => {
  const vars = [...html.matchAll(/--hi-cx:(\d+(?:\.\d+)?)vw/g)].map(m => Number(m[1]))
  assert.ok(vars.length >= 2, 'desktop and mobile values')
  for (const v of vars) assert.ok(v > 14 && v <= 33.3, `--hi-cx ${v}vw sits in the left third`)
  assert.equal((html.match(/class="jaye-v8-(?:wall|plinth)"/g) ?? []).length, 2)
  assert.match(rule('#jaye-intro-v1 .jaye-v8-wall', hi), /left:0;[^}]*width:max\(10px,calc\(var\(--hi-cx\) - var\(--hi-fs\)\*\.52\)\)/)
  assert.match(rule('#jaye-intro-v1 .jaye-v8-plinth', hi), /left:0;width:calc\(var\(--hi-cx\) \+ var\(--hi-fs\)\*\.47\)/)
  for (const sel of ['#jaye-intro-v1 .jaye-v5-greeting', '#jaye-intro-v1 .jaye-v5-hi-rule', '#jaye-intro-v1 .jaye-v5-hi-index']) assert.match(rule(sel), /var\(--hi-cx\)/, sel)
  assert.match(rule('#jaye-intro-v1 .jaye-v5-sequence'), /perspective-origin:var\(--hi-cx\) 50%/)
  // nothing travels toward the middle: every horizontal move starts left of the word and ends on it
  const moves = [...hi.matchAll(/translate3d\((-?[\d.]+)(vw|%)/g)].map(m => Number(m[1]))
  assert.ok(moves.every(v => Math.abs(v) <= 12), 'only small offsets and the 12vw run in from the left edge')
  assert.match(hi, /@keyframes jayeV8H\{0%\{[^}]*translate3d\(-12vw,0,0\)/, 'H runs in from the left')
})

test('the four phases keep their order and the greeting still leaves at 2.15 s', () => {
  assert.match(hi, /\.jaye-v8-wall\{animation:jayeV8Wall 2\.7s [^;]*? \.04s both\}/, 'P1 wall rises 0.04-0.84 s')
  assert.match(hi, /\.jaye-v5-hi-core span:first-child\{animation:jayeV8H 1s [^;]*? \.46s both\}/, 'P2 H')
  assert.match(hi, /\.jaye-v5-hi-core span:last-child\{animation:jayeV8i 1s [^;]*? \.70s both\}/, 'P2 i')
  assert.match(hi, /\.jaye-v8-plinth\{animation:jayeV8Plinth 1\.6s [^;]*? 1s both\}/, 'P3 plinth')
  assert.match(css, /\.jaye-v5-greeting\{animation:jayeV5GreetingExit \.62s [^;]*? 2\.15s both\}/, 'P4 exit unchanged')
})

test('only cheap properties animate and the clip box never cuts the glyphs', () => {
  const frames = [...hi.matchAll(/@keyframes (jayeV8\w+)\{([\s\S]*?)\n/g)]
  assert.ok(frames.length >= 5)
  for (const [, name, body] of frames) {
    for (const p of body.matchAll(/([a-z-]+):/g)) assert.ok(['opacity', 'transform', 'clip-path'].includes(p[1]), `${name} animates ${p[1]}`)
  }
  assert.doesNotMatch(hi, /filter|backdrop|perspective|preserve-3d|translateZ|box-shadow/)
  assert.match(hi, /clip-path:inset\(-12% -12% -12% -12%\)/, 'open state is padded past the line box')
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

test('"Hi" keeps its typography and the opening adds no dependency', () => {
  assert.match(html, /--hi-fs:clamp\(136px,34vw,385px\)/)
  assert.match(html, /--hi-fs:clamp\(126px,37vw,225px\)/)
  assert.match(rule('#jaye-intro-v1 .jaye-v5-hi-core'), /font-weight:750;line-height:\.76;letter-spacing:-\.105em/)
  assert.equal((html.match(/class="jaye-v5-hi-(?:core|rule|index)"/g) ?? []).length, 3, 'core, rule and index remain')
  assert.match(html, /<span class="jaye-v5-hi-index">A PRESENCE \/ 001<\/span>/)
  assert.doesNotMatch(hi, /@import|https?:\/\/|url\(/)
})
