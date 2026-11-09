import test from 'node:test'
import assert from 'node:assert/strict'
import { createBrain, greetingFor, wordCount } from '../src/baew/brain.ts'
import { KNOWLEDGE } from '../src/baew/knowledge/index.ts'

const brain = createBrain()
const apply = (progress, answer) => (answer.next ? { ...progress, [answer.next.entryId]: answer.next.progress } : progress)

test('explain gives the overview first, then a reminder plus the next detail, never the overview twice', () => {
  let progress = {}
  const first = brain.respond({ intent: 'explain', domId: 'archive-one-beliefs', progress })
  assert.equal(first.basis, 'knowledge')
  assert.equal(first.text, brain.entryForDomId('archive-one-beliefs').explain)
  progress = apply(progress, first)
  const second = brain.respond({ intent: 'explain', domId: 'archive-one-beliefs', progress })
  assert.notEqual(second.text, first.text)
  assert.ok(second.text.startsWith(brain.entryForDomId('archive-one-beliefs').recap))
  assert.ok(!second.text.includes(first.text))
})

test('progress is only returned, never mutated: dropping an answer costs nothing', () => {
  const progress = {}
  brain.respond({ intent: 'explain', domId: 'glimpse', progress })
  assert.deepEqual(progress, {})
})

test('go deeper walks every detail once, then points to the next section, then starts over', () => {
  const entry = brain.entryForDomId('postAI-signal-room')
  let progress = {}
  const seen = []
  for (let i = 0; i < entry.deeper.length; i += 1) {
    const a = brain.respond({ intent: 'deeper', domId: 'postAI-signal-room', progress })
    seen.push(a.text)
    progress = apply(progress, a)
  }
  entry.deeper.forEach((d, i) => assert.ok(seen[i].includes(d.text)))
  assert.equal(new Set(seen).size, seen.length)
  const wrap = brain.respond({ intent: 'deeper', domId: 'postAI-signal-room', progress })
  assert.equal(wrap.topic, 'next-step')
  assert.ok(wrap.text.includes('The Inference Engine'))
  progress = apply(progress, wrap)
  const again = brain.respond({ intent: 'deeper', domId: 'postAI-signal-room', progress })
  assert.ok(again.text.startsWith('Going over'))
})

test('going deeper before asking for the overview still orients the visitor', () => {
  const a = brain.respond({ intent: 'deeper', domId: 'postAI-impossible', progress: {} })
  assert.ok(a.text.startsWith('This is The Impossible'))
})

test('welcome greets by the hour and introduces Baew without claiming to be JAYE', () => {
  assert.equal(greetingFor(8), 'Good morning')
  assert.equal(greetingFor(13), 'Good afternoon')
  assert.equal(greetingFor(19), 'Good evening')
  assert.equal(greetingFor(23), 'Hello')
  assert.equal(greetingFor(3), 'Hello')
  const w = brain.respond({ intent: 'welcome', domId: 'archive-home', hour: 19 })
  assert.ok(w.text.startsWith('Good evening. I’m Baew, your guide to JAYE.'))
  assert.ok(w.text.includes('private archive'))
  assert.ok(wordCount(w.text) <= 50, `welcome is ${wordCount(w.text)} words`)
  const elsewhere = brain.respond({ intent: 'welcome', domId: 'glimpse', hour: 9 })
  assert.ok(elsewhere.text.startsWith('Good morning.'))
  const nowhere = brain.respond({ intent: 'welcome', hour: 9 })
  assert.ok(nowhere.text.includes('Scroll to a section'))
})

test('an unknown section is never invented: the title and the page’s own opening words only', () => {
  const a = brain.respond({ intent: 'explain', domId: 'brand-new', title: 'Brand New', text: 'First line of the page. Second line. Third line that goes on.' })
  assert.equal(a.basis, 'section')
  assert.ok(a.text.includes('do not have a verified description'))
  assert.ok(a.text.includes('First line of the page.'))
  assert.equal(a.next, null)
  const bare = brain.respond({ intent: 'explain', domId: 'brand-new', title: 'Brand New' })
  assert.ok(bare.text.includes('only tell you its title'))
  assert.equal(bare.onlineEligible, false)
})

test('questions are matched to the right area or answer', () => {
  const q = (question, domId) => brain.respond({ intent: 'question', question, domId })
  assert.equal(q('what is the password for demi?').topic, 'demi-access')
  assert.equal(q('how do I unlock demi').topic, 'demi-access')
  assert.equal(q('how do I hide you').topic, 'hide-baew')
  assert.equal(q('what is jaye?').topic, 'what-is-jaye')
  assert.equal(q('is the impossible game ai?').topic, 'ai-use')
  assert.equal(q('what are the anomaly protocol modules').entryId, 'anomaly-protocol')
  assert.equal(q('tell me about glimpse').entryId, 'glimpse')
  assert.equal(q('what do the verdicts mean in the inference engine').entryId, 'inference-engine')
  const where = q('where is the evidence archive?')
  assert.equal(where.topic, 'navigation')
  assert.ok(where.text.includes('node 12'))
  assert.ok(where.text.includes('Parent Space'))
  assert.equal(where.target, 'postAI-signal-room')
  assert.equal(q('who made this').topic, 'who-made')
})

test('a question with no match is answered honestly, and a vague one explains the current section', () => {
  const none = brain.respond({ intent: 'question', question: 'what is the capital of France', domId: 'glimpse' })
  assert.equal(none.basis, 'unknown')
  assert.ok(none.text.startsWith('I do not have verified information about that.'))
  assert.ok(none.text.includes('Glimpse'))
  assert.equal(none.onlineEligible, false)
  const vague = brain.respond({ intent: 'question', question: 'explain this', domId: 'glimpse' })
  assert.equal(vague.entryId, 'glimpse')
  assert.equal(vague.text, brain.entryForDomId('glimpse').explain)
})

test('gated and chat areas are local only and are never handed to the online assistant', () => {
  for (const domId of ['demi-system', 'after-demi', 'nodeAISection']) {
    const a = brain.respond({ intent: 'explain', domId })
    assert.equal(a.onlineEligible, false, domId)
    assert.equal(brain.grounding(brain.entryForDomId(domId).id), null, domId)
  }
  const g = brain.grounding('beliefs')
  assert.ok(g && g.facts.length === 3 && g.title === 'Beliefs')
})

test('the Demi answer is spoiler-free and never contains a credential', () => {
  const all = KNOWLEDGE.sections.find(e => e.id === 'demi')
  const text = [all.explain, ...all.deeper.map(d => d.text)].join(' ')
  assert.ok(text.includes('cannot open it'))
  assert.ok(!/\d{3,}/.test(text))
})

test('every entry answers every intent, within a readable length, in order', () => {
  for (const entry of KNOWLEDGE.sections) {
    const domId = entry.domIds[0] ?? 'x'
    if (!entry.domIds.length) continue
    let progress = {}
    for (let i = 0; i < entry.deeper.length + 3; i += 1) {
      const intent = i % 2 === 0 ? 'deeper' : 'explain'
      const a = brain.respond({ intent, domId, progress })
      assert.ok(a.text.trim().length > 20, `${entry.id} ${intent} ${i}`)
      assert.ok(wordCount(a.text) <= 75, `${entry.id} ${intent} ${i}: ${wordCount(a.text)} words`)
      progress = apply(progress, a)
    }
  }
})

test('the engine imports nothing from Cat AI and nothing from the DOM', async () => {
  const { readFileSync } = await import('node:fs')
  for (const f of ['../src/baew/brain.ts', '../src/baew/handoff.ts', '../src/baew/knowledge/sections.ts', '../src/baew/knowledge/site.ts']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8')
    assert.ok(!/from\s+['"][^'"]*(chat|ambient|cat)[^'"]*['"]/i.test(src), f)
    assert.ok(!/\b(document|window|localStorage|sessionStorage|navigator)\./.test(src.replace(/\/\/.*$/gm, '')), `${f} touches the DOM`)
  }
})

test('owner-approved wording is shown exactly as written and never sent to be paraphrased', () => {
  const first = brain.respond({ intent: 'explain', domId: 'archiveInterfaces', progress: {} })
  assert.equal(first.onlineEligible, false)
  const later = brain.respond({ intent: 'explain', domId: 'archiveInterfaces', progress: { 'archive-gateway': { explained: true, depth: 0 } } })
  assert.equal(later.onlineEligible, true, 'follow-up detail may be rephrased')
  assert.equal(brain.respond({ intent: 'explain', domId: 'archive-one-beliefs', progress: {} }).onlineEligible, true)
})
