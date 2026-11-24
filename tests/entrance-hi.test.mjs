import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const style = id => {
  const start = html.indexOf('<style id="' + id + '">')
  if (start < 0) return ''
  const end = html.indexOf('</style>', start)
  return html.slice(start, end)
}
const hi = style('jaye-intro-hi-v8')
const cinematic = style('jaye-intro-cinematic-peak-v5')
const brutal = style('jaye-intro-brutalist-v9')
const sequenceStart = html.indexOf('<div class="jaye-v5-sequence"')
const sequenceEnd = html.indexOf('\n  </div>\n  <div class="jaye-intro-counter"', sequenceStart)
const sequence = sequenceStart >= 0 && sequenceEnd >= 0 ? html.slice(sequenceStart, sequenceEnd) : ''

test('Hi remains the only opening greeting and keeps its left-anchored construction', () => {
  assert.match(sequence, /<div class="jaye-v5-hi-core"><span>H<\/span><span>i<\/span><\/div>/)
  assert.match(cinematic, /--hi-cx:26vw/)
  assert.match(hi, /@keyframes jayeV8H/)
  assert.match(hi, /@keyframes jayeV8i/)
  assert.match(hi, /@keyframes jayeV8Wall/)
  assert.match(hi, /@keyframes jayeV8Plinth/)
  assert.doesNotMatch(sequence, /A PRESENCE/)
})

test('the original phrase copy is preserved alongside the paper-field JAYE wordmark', () => {
  assert.match(sequence, /class="jaye-b9-stage"/)
  assert.match(sequence, /class="jaye-b9-title"/)
  assert.equal((sequence.match(/class="jaye-b9-slice jaye-b9-slice--/g) ?? []).length, 4)
  assert.equal((sequence.match(/class="jaye-v5-phrase jaye-v5-phrase--/g) ?? []).length, 2)
  assert.equal((sequence.match(/class="jaye-intro-phrase jaye-intro-phrase--/g) ?? []).length, 2)
  assert.ok(sequence.includes('SUBJECTS OF') && sequence.includes('INTEREST.'))
  assert.ok(sequence.includes('PEOPLE /') && sequence.includes('PLACES / OBJECTS'))
  assert.doesNotMatch(sequence, /jaye-v5-strip|jaye-v5-wipe|jaye-v5-blade|jaye-v5-wordmark|AN OPEN INDEX|THE LIVING ARCHIVE/)
})

test('JAYE is reconstructed from four alternating horizontal cuts', () => {
  for (const n of ['one','two','three','four']) assert.match(brutal, new RegExp('jaye-b9-slice--' + n))
  assert.match(brutal, /jayeB9SliceLeft/)
  assert.match(brutal, /jayeB9SliceRight/)
  assert.match(brutal, /clip-path:inset\(25% 0 50% 0\)/)
  assert.match(brutal, /clip-path:inset\(50% 0 25% 0\)/)
  assert.match(brutal, /background:#eeeae1/)
  assert.match(brutal, /font-weight:900/)
})

test('the new entrance uses hard material contrast without decorative effects', () => {
  assert.match(brutal, /jayeB9PaperPress/)
  assert.match(brutal, /jayeB9RailDown/)
  assert.match(brutal, /jayeB9RailAcross/)
  assert.match(brutal, /perspective:none!important/)
  assert.match(brutal, /transform-style:flat!important/)
  assert.match(brutal, /jaye-intro-grain\{display:none!important\}/)
  assert.match(brutal, /background:#080808;color:#eeeae1/)
  assert.doesNotMatch(brutal, /filter:|blur\(|box-shadow|backdrop-filter|mix-blend-mode|url\(/)
  assert.doesNotMatch(html, /jaye-intro-peak-light-v7|jaye-peak-light/)
})

test('the greeting hands off at 2.14 seconds and the complete intro remains brief', () => {
  assert.match(brutal, /jayeB9HiCut \.12s steps\(1,end\) 2\.14s/)
  assert.match(brutal, /2\.46s both/)
  assert.match(brutal, /2\.56s both/)
  assert.match(brutal, /2\.66s both/)
  assert.match(brutal, /2\.76s both/)
  assert.match(html, /timer=window\.setTimeout\(closeIntro,6350\)/)
  assert.match(brutal, /jayeB9Exit \.56s steps\(7,end\)/)
})

test('skip and reduced-motion behaviour remain intact with no new dependency', () => {
  assert.match(html, /skip\.addEventListener\('click',closeIntro\)/)
  assert.match(html, /prefers-reduced-motion/)
  assert.match(brutal, /@media\(prefers-reduced-motion:reduce\)/)
  assert.doesNotMatch(brutal, /@import|https?:\/\//)
})
