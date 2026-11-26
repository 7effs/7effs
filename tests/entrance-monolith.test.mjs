import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Guards for seconds 6-9 of the opening: the monolith (a seam, six slabs, a plinth) replaced the two sweeping wipes. Everything new lives in one
// style block and one wrapper, is scoped to the welcome overlay, adds no text, and has finished before the rule draws at 8.9 s. The scenes around it
// (before 6 s and after 9 s) keep their markup and timing; the frame-by-frame comparison with the previous version is in the change notes.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const raw = html.match(/<style id="jaye-intro-monolith-v9">([\s\S]*?)<\/style>/)?.[1] ?? ''
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')
const noData = css.replace(/url\("data:[^"]*"\)/g, 'url(DATA)')
const peak = [...html.matchAll(/<style id="(?:jaye-intro-cinematic-peak-v[56])">([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
const rules = (src) => [...src.matchAll(/([^{}@][^{}]*)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim(), body: m[2] }))
const rule = (sel, src = css) => {
  const m = rules(src).find(x => x.sel === sel)
  assert.ok(m, `${sel} must exist`)
  return m.body
}
const seqAt = html.indexOf('<div class="jaye-v5-sequence"'), seqEnd = html.indexOf('<div class="jaye-intro-depth"')
const sequence = html.slice(seqAt, seqEnd)
const monolith = sequence.match(/<div class="jaye-v9-monolith"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? ''

// the animations, with the per-slab delays resolved
function animations() {
  const out = []
  const slab = (n) => {
    const b = rule(`#jaye-intro-v1 .jaye-v9-s${n}`)
    return { rise: parseFloat(b.match(/--rise:([\d.]+)s/)[1]), exit: parseFloat(b.match(/--exit:([\d.]+)s/)[1]) }
  }
  const secs = (v) => parseFloat(v)
  const at = (v) => Math.round(v * 1000) / 1000
  const seam = rule('#jaye-intro-v1.jaye-intro-play .jaye-v9-seam').match(/animation:jayeV9Seam ([\d.]+)s \S+ ([\d.]+)s both/)
  const plinth = rule('#jaye-intro-v1.jaye-intro-play .jaye-v9-plinth').match(/animation:jayeV9Plinth ([\d.]+)s \S+ ([\d.]+)s both/)
  const part = rule('#jaye-intro-v1.jaye-intro-play .jaye-v9-slab').match(/animation:jayeV9Part ([\d.]+)s \S+ var\(--exit\) both/)
  const rise = rule('#jaye-intro-v1.jaye-intro-play .jaye-v9-slab::before').match(/animation:jayeV9Rise ([\d.]+)s \S+ var\(--rise\) both/)
  assert.ok(seam && plinth && part && rise, 'the four animation declarations')
  out.push({ name: 'seam', start: secs(seam[2]), end: at(secs(seam[2]) + secs(seam[1])) })
  out.push({ name: 'plinth', start: secs(plinth[2]), end: at(secs(plinth[2]) + secs(plinth[1])) })
  for (let n = 1; n <= 6; n++) {
    const s = slab(n)
    out.push({ name: `s${n} rise`, start: s.rise, end: at(s.rise + secs(rise[1])) })
    out.push({ name: `s${n} part`, start: s.exit, end: at(s.exit + secs(part[1])) })
  }
  return out
}

test('the monolith replaces the wipes: a seam, six slabs and a plinth, inside the existing sequence, with no text', () => {
  assert.doesNotMatch(html, /jaye-v5-wipe|jayeV5Wipe/, 'the two wipes and their keyframe are removed, not hidden')
  assert.equal((html.match(/class="jaye-v9-monolith"/g) ?? []).length, 1)
  assert.ok(sequence.includes('<div class="jaye-v9-monolith"'), 'inside .jaye-v5-sequence')
  assert.equal((monolith.match(/class="jaye-v9-seam"/g) ?? []).length, 1)
  assert.equal((monolith.match(/class="jaye-v9-slab jaye-v9-s[1-6]"/g) ?? []).length, 6)
  assert.equal((monolith.match(/class="jaye-v9-plinth"/g) ?? []).length, 1)
  assert.equal(monolith.replace(/<[^>]+>/g, '').trim(), '', 'no wording was added')
  assert.match(sequence, /<div class="jaye-v9-monolith" aria-hidden="true">/)
  // it takes the place the wipes had: after the cut, before the final stage
  assert.ok(sequence.indexOf('jaye-v5-blade') < sequence.indexOf('jaye-v9-monolith') && sequence.indexOf('jaye-v9-monolith') < sequence.indexOf('jaye-v5-final-stage'))
})

test('everything new happens between 6.5 s and 8.9 s: it starts on the old wipe beat (6.86 s) and is gone before the rule draws', () => {
  const all = animations()
  assert.equal(Math.min(...all.map(a => a.start)), 6.52)
  assert.equal(Math.max(...all.map(a => a.end)), 8.88)
  for (const a of all) assert.ok(a.start >= 6 && a.end <= 9, `${a.name} stays inside 6-9 s`)
  assert.equal(all.find(a => a.name === 's1 rise').start, 6.86, 'the first slab lands on the beat the ivory wipe had')
  // the centre of the stage is clear for the J of the title (7.98 s)
  for (const n of [3, 4]) assert.ok(all.find(a => a.name === `s${n} part`).end <= 8.05, `s${n} has parted by the time the J starts`)
  // the rise is left to right, the parting is centre first
  const rises = [1, 2, 3, 4, 5, 6].map(n => all.find(a => a.name === `s${n} rise`).start)
  assert.deepEqual([...rises].sort((a, b) => a - b), rises)
  const parts = [1, 2, 3, 4, 5, 6].map(n => all.find(a => a.name === `s${n} part`).start)
  assert.ok(parts[2] <= parts[1] && parts[1] <= parts[0] && parts[3] <= parts[4] && parts[4] <= parts[5])
  // the wall is whole before it parts
  assert.ok(Math.max(...[1, 2, 3, 4, 5, 6].map(n => all.find(a => a.name === `s${n} rise`).end)) <= Math.min(...parts))
  // the plinth is gone before the original 1px rule starts drawing
  assert.ok(all.find(a => a.name === 'plinth').end <= 8.9)
})

test('every new rule is scoped to the welcome overlay and to the new elements; nothing leaks to the page', () => {
  assert.ok(raw.length > 2000)
  for (const r of rules(noData)) {
    if (/^\d|^from|^to/.test(r.sel)) continue // keyframe steps
    assert.match(r.sel, /^#jaye-intro-v1(?:\.jaye-intro-play)? \.jaye-v9-/, r.sel)
  }
  const names = [...noData.matchAll(/@keyframes ([\w-]+)/g)].map(m => m[1])
  assert.deepEqual(names.sort(), ['jayeV9Part', 'jayeV9Plinth', 'jayeV9Rise', 'jayeV9Seam'])
  assert.doesNotMatch(noData, /!important/, 'no override fights')
  assert.equal((noData.match(/@media/g) ?? []).length, 1, 'one media query, for the phone layout')
  assert.doesNotMatch(noData, /(^|[,}\s])(html|body|main|section|\*)\s*[{,]/, 'no element or global selector')
  // the custom properties it defines are all on its own elements
  for (const m of noData.matchAll(/([^{}]+)\{[^{}]*--(?:v9-[\w-]+|x|w|tone|rise|exit|dir):/g)) assert.match(m[1].trim(), /\.jaye-v9-/)
  // the old rules in other blocks that mention these elements: none
  assert.doesNotMatch(peak, /jaye-v9/)
})

test('light and quiet: only transform, opacity and visibility animate; no filters, blends, clips or libraries', () => {
  for (const m of noData.matchAll(/@keyframes [\w-]+\{([\s\S]*?\}\})|@keyframes [\w-]+\{([^{}]*\{[^{}]*\})+\}/g)) {
    const props = [...m[0].matchAll(/([a-z-]+):/g)].map(x => x[1])
    for (const p of props) assert.ok(['transform', 'opacity', 'visibility'].includes(p), `keyframes animate only transform, opacity and visibility, found ${p}`)
  }
  assert.doesNotMatch(noData, /filter|backdrop|mix-blend|clip-path|mask|@import|https?:|<script/i)
  assert.equal((raw.match(/url\("data:image\/svg\+xml/g) ?? []).length, 1, 'one inline grain texture, drawn once and tiled')
  assert.match(raw, /feTurbulence type='fractalNoise'/)
})

test('the slabs make one wall: contiguous bays across the whole width, a 4px parting at the centre, taller than the stage', () => {
  const bays = [1, 2, 3, 4, 5, 6].map(n => {
    const b = rule(`#jaye-intro-v1 .jaye-v9-s${n}`)
    return { x: b.match(/--x:([^;]+);/)[1], w: b.match(/--w:([^;]+);/)[1] }
  })
  assert.deepEqual(bays.map(b => b.x), ['0%', '16.5%', '35%', 'calc(50% + 2px)', '65%', '83.5%'])
  assert.deepEqual(bays.map(b => b.w), ['16.5%', '18.5%', 'calc(15% - 2px)', 'calc(15% - 2px)', '18.5%', '16.5%'])
  const pct = (v) => parseFloat(v.match(/[\d.]+(?=%)/)[0])
  assert.equal(pct(bays[0].w) + pct(bays[1].w) + pct(bays[2].w), 50)
  assert.equal(pct(bays[3].w) + pct(bays[4].w) + pct(bays[5].w), 50)
  const slab = rule('#jaye-intro-v1 .jaye-v9-slab')
  assert.match(slab, /top:-2%;bottom:-2%/, 'the 0.9% overshoot of the landing can never show an edge')
  const surface = rule('#jaye-intro-v1 .jaye-v9-slab::before')
  const seam = rule('#jaye-intro-v1 .jaye-v9-seam')
  assert.match(surface, /repeating-linear-gradient\(0deg/, 'shuttered formwork lines expose the concrete construction')
  assert.match(surface, /border-top:3px solid #171715;border-bottom:3px solid #171715/, 'the slab edges are hard and structural')
  assert.match(seam, /width:4px;[^}]*background:#d34a35/, 'the central cut uses one flat oxide-red datum')
  assert.match(css, /@keyframes jayeV9Rise\{0%\{transform:translateY\(101%\)\}76%\{transform:translateY\(-\.9%\)\}100%\{transform:translateY\(0\)\}\}/)
  const dirs = [1, 2, 3, 4, 5, 6].map(n => rule(`#jaye-intro-v1 .jaye-v9-s${n}`).match(/--dir:(-?1)/)[1])
  assert.deepEqual(dirs, ['-1', '-1', '-1', '1', '1', '1'], 'the left three leave left, the right three leave right')
  assert.match(css, /@keyframes jayeV9Part\{0%\{transform:translateX\(0\)\}100%\{transform:translateX\(calc\(var\(--dir\)\*101vw\)\);visibility:hidden\}\}/, 'a slab ends off stage and hidden')
})

test('layers: above the final stage and the canvas light, below the progress line; the monolith clips its own slabs', () => {
  const m = rule('#jaye-intro-v1 .jaye-v9-monolith')
  assert.match(m, /position:absolute;inset:0;z-index:7;overflow:hidden;pointer-events:none/)
  assert.match(peak, /\.jaye-v5-final-stage\{[^}]*z-index:6/)
  assert.match(peak, /\.jaye-v5-progress\{[^}]*z-index:9/)
  assert.match(peak, /\.jaye-v5-blade\{[^}]*z-index:5/)
})

test('the plinth lays itself on the line the rule draws on, and thins into it', () => {
  const plinth = rule('#jaye-intro-v1 .jaye-v9-plinth'), finalRule = rule('#jaye-intro-v1 .jaye-v5-final-rule', peak)
  assert.match(plinth, /left:7vw;right:7vw;bottom:25%/)
  assert.match(finalRule, /left:7vw;right:7vw;bottom:25%;height:6px/)
  assert.match(plinth, /transform-origin:50% 100%/, 'its lower edge stays on the line')
  assert.match(css, /@media\(max-width:600px\)\{\s*#jaye-intro-v1 \.jaye-v9-plinth\{bottom:29%\}\s*\}/)
  assert.match(peak, /@media\(max-width:600px\)\{[^@]*\.jaye-v5-final-rule\{bottom:29%\}/, 'the phone layout moves the rule to 29%, and the plinth follows')
  assert.match(css, /@keyframes jayeV9Plinth\{[^@]*100%\{opacity:0;transform:scaleX\(1\) scaleY\(\.6\)\}\}/, 'the concrete plinth reduces to the 6px rule thickness before leaving')
})

test('the scenes either side keep their timing: the title sweep, the rule, the tag, the echo, the final frame and the phrase exit', () => {
  const pinned = [
    ['.jaye-v5-phrase--two{animation:jayeV5PhraseExit .44s', '6.05s'],
    ['.jaye-v6-final-frame{animation:jayeV6FinalFrame 3.25s', '7.43s'],
    ['.jaye-v5-wordmark-echo{animation:jayeV5FinalEcho 1.55s', '7.92s'],
    ['.jaye-v5-final-rule{animation:jayeV5FinalRule .78s', '8.9s'],
    ['.jaye-v5-wordmark small{animation:jayeV5Meta .5s', '8.94s'],
    ['.jaye-v6-title-sweep{animation:jayeV6TitleSweep 1.34s', '9.08s'],
    ['.jaye-v5-final-tag{animation:jayeV5Tag .48s', '9.18s'],
    ['.jaye-v5-blade{animation:jayeV6SeamSlash 7.28s', '.05s'],
  ]
  for (const [a, delay] of pinned) {
    const i = peak.indexOf(a)
    assert.ok(i >= 0, a)
    assert.ok(peak.slice(i, i + 150).includes(` ${delay} both`), `${a} keeps ${delay}`)
  }
  assert.match(html, /<span class="jaye-v5-wordmark-echo">JAYE<\/span>/)
  assert.match(html, /<div class="jaye-v5-wordmark"><span>J<i><\/i><\/span><span>A<i><\/i><\/span><span>Y<i><\/i><\/span><span>E<i><\/i><\/span><small>AN OPEN INDEX<\/small><\/div>/, 'J A Y E and the line under them are unchanged; each letter carries one empty course element')
  assert.match(html, /<span class="jaye-v5-final-tag">MEMORY \/ ART \/ EVERYTHING THAT REMAINS<\/span>/)
  assert.match(html, /<p class="jaye-v5-phrase jaye-v5-phrase--two jaye-sig"><span><b>PΞӨPᒪΞ {2}<\/b><\/span><span><b> ﾠPᒪΛCΞS<\/b><\/span><\/p>/)
  assert.match(html, /\.jaye-intro-exit\{animation:jayeV5Exit \.76s/, 'the exit and the 10 s total are untouched')
  assert.match(html, /\.jaye-v5-progress>span\{animation:jayeV5Progress 10\.72s linear \.04s both\}/)
})

test('reduced motion: the whole sequence, and so the monolith with it, stays hidden', () => {
  assert.match(peak, /@media\(prefers-reduced-motion:reduce\)\{\s*#jaye-intro-v1 \.jaye-v5-sequence\{display:none!important\}/)
  assert.ok(sequence.includes('jaye-v9-monolith'), 'the monolith is inside that sequence')
  assert.doesNotMatch(noData, /display:(?!block)/, 'nothing in the new block turns display on or off')
})
