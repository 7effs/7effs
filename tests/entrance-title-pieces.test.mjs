import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const raw = html.match(/<style id="jaye-intro-title-pieces-v9">([\s\S]*?)<\/style>/)?.[1] ?? ''
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')
const peak = [...html.matchAll(/<style id="(?:jaye-intro-cinematic-peak-v[56])">([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
const voidCss = html.match(/<style id="jaye-intro-void-v10">([\s\S]*?)<\/style>/)?.[1] ?? ''
const rules = src => [...src.matchAll(/([^{}@][^{}]*)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim(), body: m[2] }))
const keyframes = name => css.match(new RegExp(`@keyframes ${name}\\{([\\s\\S]*?)\\}\\}`))?.[1] ?? ''

test('the four glyphs, their order and original wording are unchanged', () => {
  assert.match(html, /<div class="jaye-v5-wordmark"><span>J<i><\/i><\/span><span>A<i><\/i><\/span><span>Y<i><\/i><\/span><span>E<i><\/i><\/span><small>AN OPEN INDEX<\/small><\/div>/)
  assert.match(html, /<span class="jaye-v5-wordmark-echo">JAYE<\/span>/)
  const wordmark = html.match(/<div class="jaye-v5-wordmark">([\s\S]*?)<\/div>/)[1]
  assert.equal(wordmark.replace(/<[^>]+>/g, ''), 'JAYEAN OPEN INDEX')
})

test('the letters assemble at 7.98, 8.12, 8.26 and 8.40 and finish at 8.92', () => {
  const starts = []
  for (const [n, at] of [[1, '7.98'], [2, '8.12'], [3, '8.26'], [4, '8.40']]) {
    assert.ok(peak.includes(`#jaye-intro-v1.jaye-intro-play .jaye-v5-wordmark>span:nth-child(${n}){--v9-at:${at}s;animation:jayeV9Lock .52s linear var(--v9-at) both;}`))
    starts.push(Number(at))
  }
  assert.equal(Math.round((Math.max(...starts) + .52) * 100) / 100, 8.92)
  for (const piece of ['::before', '>i', '::after']) assert.ok(css.includes(`animation:jayeV9Piece`), piece)
})

test('three courses arrive from three axes and lock into one crisp glyph', () => {
  assert.match(css, /span::before\{clip-path:inset\(0 0 calc\(100% - var\(--cut1\)\) 0\);opacity:0\}/)
  assert.match(css, /span>i\{position:absolute;inset:0;display:block;font-style:normal;clip-path:inset\(var\(--cut1\) 0 calc\(100% - var\(--cut2\)\) 0\);opacity:0\}/)
  assert.match(css, /span::after\{clip-path:inset\(var\(--cut2\) 0 0 0\);opacity:0\}/)
  assert.match(keyframes('jayeV9PieceTop'), /translate3d\(0,-\.82em,0\)/)
  assert.match(keyframes('jayeV9PieceMid'), /translate3d\(calc\(var\(--d\)\*\.78em\),0,0\)/)
  assert.match(keyframes('jayeV9PieceBase'), /translate3d\(0,\.88em,0\)/)
  const lands = ['jayeV9PieceTop', 'jayeV9PieceMid', 'jayeV9PieceBase'].map(name => Number(keyframes(name).match(/(\d+)%\{opacity:1;transform:translate3d\(0,0,0\)\}99\.9%/)[1]))
  assert.deepEqual(lands, [56, 64, 72])
  assert.doesNotMatch(css, /filter:|blur\(|backdrop|mix-blend|!important/)
})

test('the final lock is sharp and remains the same white title', () => {
  const lock = keyframes('jayeV9Lock')
  assert.match(lock, /0%,99\.9%\{opacity:1;clip-path:inset\(0\);transform:perspective\(800px\) translate3d\(0,0,0\);color:transparent\}/)
  assert.match(lock, /100%\{opacity:1;clip-path:inset\(0\);transform:perspective\(800px\) translate3d\(0,0,0\);color:#f4f3ef\}/)
  assert.match(peak, /\.jaye-v5-wordmark\{[^}]*color:#f4f3ef/)
  assert.match(voidCss, /font-size:clamp\(78px,21vw,244px\)/)
})

test('rule, sweep and tag retain their exact starts and use the void palette', () => {
  for (const [needle, delay] of [
    ['.jaye-v5-final-rule{animation:jayeV5FinalRule .78s', '8.9s'],
    ['.jaye-v6-title-sweep{animation:jayeV6TitleSweep 1.34s', '9.08s'],
    ['.jaye-v5-final-tag{animation:jayeV5Tag .48s', '9.18s']
  ]) {
    const i = peak.indexOf(needle)
    assert.ok(i >= 0 && peak.slice(i, i + 150).includes(` ${delay} both`), needle)
  }
  assert.match(voidCss, /\.jaye-v5-final-rule\{left:13vw;right:13vw;height:2px;background:#eee9de;transform-origin:50% 50%\}/)
  assert.match(voidCss, /\.jaye-v5-final-rule::before\{display:none\}/)
  assert.match(voidCss, /\.jaye-v5-final-tag\{[^}]*background:#eee9de;color:#07090d/)
  assert.match(voidCss, /\.jaye-v6-title-sweep\{[^}]*background:#eee9de/)
  assert.doesNotMatch(voidCss, /#d34a35|gradient|filter|mix-blend|url\(/)
  assert.match(peak, /@keyframes jayeV6TitleSweep\{[\s\S]*?translate3d\(70vw,0,0\)/)
})

test('all title-piece selectors are scoped and only opacity and transforms animate', () => {
  for (const r of rules(css)) {
    if (/^\d|^from|^to/.test(r.sel)) continue
    for (const sel of r.sel.split(',')) assert.match(sel.trim(), /^#jaye-intro-v1(?:\.jaye-intro-play)? \.jaye-v5-wordmark>span/, sel)
  }
  const names = [...css.matchAll(/@keyframes ([\w-]+)/g)].map(m => m[1]).sort()
  assert.deepEqual(names, ['jayeV9Lock', 'jayeV9PieceBase', 'jayeV9PieceMid', 'jayeV9PieceTop'])
  assert.doesNotMatch(html, /jayeV6Letter/)
  const at = id => html.indexOf(`<style id="${id}">`)
  assert.ok(at('jaye-intro-void-v10') < at('jaye-intro-title-pieces-v9'))
  assert.ok(at('jaye-intro-title-pieces-v9') < at('jaye-intro-peak-light-v7'))
})
