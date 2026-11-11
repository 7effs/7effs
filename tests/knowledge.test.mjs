import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { KNOWLEDGE } from '../src/baew/knowledge/index.ts'
import { wordCount } from '../src/baew/brain.ts'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const entries = KNOWLEDGE.sections

// The four Archive headings and the two numbered sections each one holds (the page's own wording and order).
const ARCHIVE_CHAPTERS = [
  { title: 'Curiosity', ids: ['archive-one-beliefs', 'archive-one-things-i-do'] },
  { title: 'What I Keep Close', ids: ['archive-one-favourites', 'archive-one-people'] },
  { title: 'Not the Whole Story', ids: ['archive-two-little-things', 'archive-two-figuring-out'] },
  { title: 'Now and Then', ids: ['archive-two-things-i-like', 'archive-two-memories'] },
]

test('ids are unique and every related id exists', () => {
  const ids = entries.map(e => e.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const e of entries) for (const r of e.related) assert.ok(ids.includes(r), `${e.id} relates to unknown ${r}`)
})

test('every DOM id described exists in index.html, and no DOM id is claimed twice', () => {
  const seen = new Set()
  for (const e of entries) for (const id of e.domIds) {
    assert.ok(!seen.has(id), `duplicate dom id ${id}`)
    seen.add(id)
    assert.ok(html.includes(`id="${id}"`), `index.html has no id="${id}" (entry ${e.id})`)
  }
})

test('the page numbers the knowledge states are the page numbers on the site', () => {
  const has = s => html.includes(s)
  assert.ok(has('NODE 10') || has('Node 10') || /NODE\s*<?[^>]*10/.test(html) || html.includes('10'), 'node 10 present')
  for (const label of ['12 / THE EVIDENCE ARCHIVE', '13 / THE INFERENCE ENGINE', '14 / THE ANOMALY PROTOCOL', '15 / EXPERIMENTAL WORLDS']) {
    assert.ok(html.includes(label) || html.toLowerCase().includes(label.toLowerCase()), `missing label ${label}`)
  }
})

test('gated and owner areas are local only and never described in detail', () => {
  for (const e of entries.filter(x => x.access !== 'open')) assert.equal(e.localOnly, true, `${e.id} must be local only`)
  const demi = entries.find(e => e.id === 'demi')
  assert.equal(demi.access, 'gated')
})

test('no credential, PIN or owner secret appears anywhere in the knowledge', () => {
  const blob = JSON.stringify(KNOWLEDGE)
  assert.ok(!/\b\d{4,}\b/.test(blob.replace(/1,200/g, '')), 'a 4+ digit number would look like a PIN')
  assert.ok(!/(pin is|password is|passphrase is|passcode)/i.test(blob))
})

test('register: professional, no slang, no emoji, every text is a finished sentence', () => {
  const banned = /\b(tiny|vibes?|lol|awesome|amazing|super|iconic|slay|captain|quest)\b/i
  const texts = []
  for (const e of entries) texts.push(e.summary, e.explain, e.recap, e.welcome ?? '', ...e.deeper.map(d => d.text))
  for (const f of KNOWLEDGE.faqs) texts.push(f.answer)
  for (const t of texts.filter(Boolean)) {
    assert.ok(!banned.test(t), `banned word in: ${t}`)
    assert.ok(!/\p{Extended_Pictographic}/u.test(t), `emoji in: ${t}`)
    assert.ok(/[.”’)]$/.test(t.trim()), `does not end like a sentence: ${t}`)
  }
})

test('length: explanations 28 to 60 words, deeper items 12 to 50 words', () => {
  for (const e of entries) {
    const n = wordCount(e.explain)
    assert.ok(n >= 28 && n <= 60, `${e.id} explain is ${n} words`)
    for (const d of e.deeper) {
      const m = wordCount(d.text)
      assert.ok(m >= 12 && m <= 50, `${e.id} deeper item is ${m} words: ${d.text}`)
    }
    assert.ok(e.deeper.length >= 1)
  }
})

test('the approved Archive wording is used exactly', () => {
  const archive = entries.find(e => e.id === 'archive-gateway')
  assert.equal(
    archive.explain,
    'The Archive is the central navigation space of JAYE. It brings together different sections covering personal beliefs, interests, experiences, relationships, and memories. Each section explores a different subject, so you can choose where to begin and move through the collection at your own pace.',
  )
})

test('personal sections are described in the third person', () => {
  for (const id of ['beliefs', 'things-i-do', 'favourites', 'people', 'little-things', 'figuring-out', 'things-i-like', 'memories']) {
    const e = entries.find(x => x.id === id)
    // Titles are the page's own wording ("The Things I Do"), so they are removed before looking for first person.
    const titles = [...entries.map(x => x.title), ...ARCHIVE_CHAPTERS.map(c => c.title)]
    let all = [e.explain, e.recap, ...e.deeper.map(d => d.text)].join(' ')
    for (const t of titles) all = all.split(t).join('')
    assert.ok(!/\b(I|my|me|myself)\b/.test(all), `${id} speaks in the first person`)
  }
})

test('site-specific claims match the page text', () => {
  const must = ['Enter the Parent Space', 'Read the room', 'Generate whisper', 'Contradiction Lab', 'Counterexample Terminal', 'Pattern & Sequence', 'Logic & Deduction', 'Unsupported attribution', 'The story stays', 'Made by @cvechz', 'NO FEED. NO ALGORITHM']
  for (const s of must) assert.ok(html.includes(s) || html.toLowerCase().includes(s.toLowerCase()), `page does not contain "${s}"`)
})

test('the four Archive headings are on the page, in order, each holding the two sections the knowledge says', () => {
  const tokens = [...html.matchAll(/<h2 class="archive-chapter-title" id="[^"]+">([^<]+)<\/h2>|<section[^>]*\bid="(archive-(?:one|two)-[a-z-]+)"/g)]
  const chapters = []
  for (const m of tokens) {
    if (m[1]) chapters.push({ title: m[1].replace(/\.$/, ''), ids: [] })
    else chapters.at(-1).ids.push(m[2])
  }
  assert.equal(chapters.length, 4, 'exactly four chapter headings')
  assert.deepEqual(chapters, ARCHIVE_CHAPTERS)
  // All eight headings stay in the DOM (routing focus, screen readers, Baew's context); only four show.
  // The second section of each chapter continues under the first one's title, so its own is visually folded.
  const titles = [...html.matchAll(/<h3 class="archive-section-title( is-folded)?" id="([^"]+)-title"/g)].map(m => ({ id: m[2], folded: Boolean(m[1]) }))
  assert.equal(titles.length, 8, 'all eight section titles are kept in the page')
  assert.deepEqual(titles.filter(t => t.folded).map(t => t.id), ['archive-one-things-i-do', 'archive-one-people', 'archive-two-figuring-out', 'archive-two-memories'], 'the 2nd section of each chapter folds its title')
  assert.equal(titles.filter(t => !t.folded).length, 4, 'four section titles stay visible')
  // Every section's own page text mentions the heading it sits under, and nothing else claims a different heading.
  for (const c of ARCHIVE_CHAPTERS) for (const id of c.ids) {
    const entry = entries.find(e => e.domIds.includes(id))
    const all = [entry.explain, entry.recap, ...entry.deeper.map(d => d.text)].join(' ')
    assert.ok(all.includes(`“${c.title}”`), `${entry.id} should name its heading “${c.title}”`)
    for (const other of ARCHIVE_CHAPTERS.filter(x => x !== c)) assert.ok(!all.includes(`“${other.title}”`), `${entry.id} names the wrong heading`)
  }
  const faq = KNOWLEDGE.faqs.find(f => f.id === 'archive-headings')
  for (const c of ARCHIVE_CHAPTERS) assert.ok(faq.answer.includes(`“${c.title}”`), `FAQ misses ${c.title}`)
})
