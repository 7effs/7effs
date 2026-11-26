import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Guards for the title entry (7.98-8.92 s): J A Y E arrive in pieces. Each letter is cut into three courses that slide in misregistered and lock;
// the letter itself is unchanged and ends in the state it always had. No wording is added (the courses are generated content of the same letter).
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const raw = html.match(/<style id="jaye-intro-title-pieces-v9">([\s\S]*?)<\/style>/)?.[1] ?? ''
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')
const peak = [...html.matchAll(/<style id="(?:jaye-intro-cinematic-peak-v[56])">([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
const rules = (src) => [...src.matchAll(/([^{}@][^{}]*)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim(), body: m[2] }))
const keyframes = (name, src = css) => src.match(new RegExp(`@keyframes ${name}\\{([\\s\\S]*?\\}\\})`))?.[1] ?? ''

test('markup: the letters and their order are unchanged; each carries one empty course element and nothing else is added', () => {
  assert.match(html, /<div class="jaye-v5-wordmark"><span>J<i><\/i><\/span><span>A<i><\/i><\/span><span>Y<i><\/i><\/span><span>E<i><\/i><\/span><small>AN OPEN INDEX<\/small><\/div>/)
  assert.match(html, /<span class="jaye-v5-wordmark-echo">JAYE<\/span>/)
  const wordmark = html.match(/<div class="jaye-v5-wordmark">([\s\S]*?)<\/div>/)[1]
  assert.equal(wordmark.replace(/<[^>]+>/g, ''), 'JAYEAN OPEN INDEX', 'the text content is exactly what it was')
})

test('timing: the letters start when they always did (7.98, 8.12, 8.26, 8.40 s) and each is whole by 0.52 s later, so the title is done by 8.92 s', () => {
  const starts = []
  for (const [n, at] of [[1, '7.98'], [2, '8.12'], [3, '8.26'], [4, '8.40']]) {
    assert.ok(peak.includes(`#jaye-intro-v1.jaye-intro-play .jaye-v5-wordmark>span:nth-child(${n}){--v9-at:${at}s;animation:jayeV9Lock .52s linear var(--v9-at) both;}`), `letter ${n}`)
    starts.push(Number(at))
  }
  assert.equal(Math.round((Math.max(...starts) + .52) * 100) / 100, 8.92)
  assert.ok(8.92 <= 9, 'finished inside the 6-9 s window')
  for (const piece of ['::before', '>i', '::after']) {
    const re = new RegExp(`\\.jaye-v5-wordmark>span${piece.replace('>', '>')}\\{will-change:transform;animation:jayeV9Piece(?:Top|Mid|Base) \\.52s cubic-bezier\\(\\.7,0,\\.12,1\\) var\\(--v9-at\\) both\\}`)
    assert.match(css, re, `${piece} takes the same start and duration as its letter`)
  }
})

test('rest state: the letter ends exactly as the old animation left it, in the same instant the pieces go', () => {
  const lock = keyframes('jayeV9Lock')
  const rest = 'opacity:1;clip-path:inset(0);transform:perspective(800px) translate3d(0,0,0);filter:blur(0)'
  assert.ok(lock.includes(`0%,99.9%{${rest};color:transparent}`), 'hidden but not removed while the pieces work')
  assert.ok(lock.includes(`100%{${rest};color:#f4f3ef}`), 'the title colour is the one the wordmark has')
  assert.match(peak, /\.jaye-v5-wordmark\{[^}]*color:#f4f3ef/)
  for (const name of ['jayeV9PieceTop', 'jayeV9PieceMid', 'jayeV9PieceBase']) {
    const k = keyframes(name)
    assert.match(k, /99\.9%\{opacity:1;transform:translate3d\(0,0,0\)\}100%\{opacity:0;transform:translate3d\(0,0,0\)\}\}$/, `${name}: aligned, then gone at 100%`)
    assert.match(k, /^0%\{opacity:0;/, `${name}: invisible until its letter starts`)
  }
})

test('the three courses: thirds of the cap height, contiguous, sliding from alternating sides, landing top first and bottom last', () => {
  assert.match(css, /\.jaye-v5-wordmark>span\{position:relative;--cut1:37\.5%;--cut2:63%\}/)
  assert.match(css, /span::before\{clip-path:inset\(0 0 calc\(100% - var\(--cut1\)\) 0\);opacity:0\}/, 'top course: 0 to cut1')
  assert.match(css, /span>i\{position:absolute;inset:0;display:block;font-style:normal;clip-path:inset\(var\(--cut1\) 0 calc\(100% - var\(--cut2\)\) 0\);opacity:0\}/, 'middle course: cut1 to cut2')
  assert.match(css, /span::after\{clip-path:inset\(var\(--cut2\) 0 0 0\);opacity:0\}/, 'bottom course: cut2 to the bottom')
  const dirs = [1, 2, 3, 4].map(n => css.match(new RegExp(`span:nth-child\\(${n}\\)\\{--l:"[JAYE]";--d:(-?1)\\}`))[1])
  assert.deepEqual(dirs, ['1', '-1', '1', '-1'], 'neighbouring letters mirror each other')
  assert.deepEqual([1, 2, 3, 4].map(n => css.match(new RegExp(`span:nth-child\\(${n}\\)\\{--l:"([JAYE])"`))[1]), ['J', 'A', 'Y', 'E'], 'each course draws its own letter')
  const lands = ['jayeV9PieceTop', 'jayeV9PieceMid', 'jayeV9PieceBase'].map(n => Number(keyframes(n).match(/(\d+)%\{opacity:1;transform:translate3d\(0,0,0\)\}99\.9%/)[1]))
  assert.deepEqual(lands, [56, 64, 72], 'top lands first, then the middle, then the bottom')
  assert.ok(Math.max(...lands) < 99.9 - 20, 'there is a held, locked beat before the letter fuses')
  // the cut lines sit at thirds of the ink: the glyphs span 12.0% to 88.7% of their box (measured), so thirds are at 37.6% and 63.1%
  assert.ok(Math.abs((12 + (88.7 - 12) / 3) - 37.5) < 1 && Math.abs((12 + 2 * (88.7 - 12) / 3) - 63) < 1)
})

test('the pieces draw the letter, not new wording; they stay out of the page; only transform and opacity animate', () => {
  assert.match(css, /span::before,#jaye-intro-v1 \.jaye-v5-wordmark>span::after,#jaye-intro-v1 \.jaye-v5-wordmark>span>i::before\{content:var\(--l\);position:absolute;left:0;top:0;display:block;white-space:nowrap;color:#f4f3ef\}/)
  for (const r of rules(css)) {
    if (/^\d|^from|^to|^0%/.test(r.sel)) continue
    for (const sel of r.sel.split(',')) assert.match(sel.trim(), /^#jaye-intro-v1(?:\.jaye-intro-play)? \.jaye-v5-wordmark>span/, sel)
  }
  const names = [...css.matchAll(/@keyframes ([\w-]+)/g)].map(m => m[1]).sort()
  assert.deepEqual(names, ['jayeV9Lock', 'jayeV9PieceBase', 'jayeV9PieceMid', 'jayeV9PieceTop'])
  for (const name of ['jayeV9PieceTop', 'jayeV9PieceMid', 'jayeV9PieceBase']) for (const p of [...keyframes(name).matchAll(/([a-z-]+):/g)].map(m => m[1])) assert.ok(['opacity', 'transform'].includes(p), `${name} animates ${p}`)
  assert.doesNotMatch(css, /filter:blur\([1-9]|backdrop|mix-blend|@import|https?:|url\(|!important/)
  assert.doesNotMatch(html, /jayeV6Letter/, 'the old tilting, blurring letter keyframes are gone, not left behind')
  assert.doesNotMatch(css, /@media/, 'em-based, so one layout for desktop and phone')
})

test('the final lockup uses structural brutalism rather than a reflective sweep', () => {
  assert.match(peak, /\\.jaye-v5-wordmark\\{[^}]*font-family:Impact,Haettenschweiler,"Arial Narrow Bold",sans-serif[^}]*font-weight:900/)
  assert.match(peak, /\\.jaye-v5-final-rule\\{[^}]*height:6px;background:#eee9de/)
  assert.match(peak, /\\.jaye-v5-final-rule::before\\{[^}]*background:#d34a35/)
  assert.match(peak, /\\.jaye-v5-final-tag\\{[^}]*background:#d34a35[^}]*font-family:ui-monospace/)
  const sweep = rules(peak).find(x => x.sel === '#jaye-intro-v1 .jaye-v6-title-sweep')
  assert.ok(sweep, 'the title strike remains a single, scoped element')
  assert.match(sweep.body, /background:#d34a35/)
  assert.doesNotMatch(sweep.body, /gradient|mix-blend/, 'a flat registration mark replaces the reflective light sweep')
  assert.match(peak, /@keyframes jayeV6TitleSweep\\{[^}]*translate3d\\(70vw,0,0\\)/)
})

test('the title block sits after the monolith block and before the archive layer, and neighbours are untouched', () => {
  const at = (id) => html.indexOf(`<style id="${id}">`)
  assert.ok(at('jaye-intro-monolith-v9') > 0 && at('jaye-intro-monolith-v9') < at('jaye-intro-title-pieces-v9') && at('jaye-intro-title-pieces-v9') < at('jaye-tornado-background-styles'))
  assert.equal((html.match(/id="jaye-intro-title-pieces-v9"/g) ?? []).length, 1)
  for (const [a, delay] of [['.jaye-v5-wordmark small{animation:jayeV5Meta .5s', '8.94s'], ['.jaye-v6-title-sweep{animation:jayeV6TitleSweep 1.34s', '9.08s'], ['.jaye-v5-final-tag{animation:jayeV5Tag .48s', '9.18s'], ['.jaye-v5-wordmark-echo{animation:jayeV5FinalEcho 1.55s', '7.92s'], ['.jaye-v5-final-rule{animation:jayeV5FinalRule .78s', '8.9s']]) {
    const i = peak.indexOf(a)
    assert.ok(i >= 0 && peak.slice(i, i + 150).includes(` ${delay} both`), a)
  }
})
