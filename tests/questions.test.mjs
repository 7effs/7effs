import test from 'node:test'
import assert from 'node:assert/strict'
import { createBrain } from '../src/baew/brain.ts'
import { UNKNOWN_LEAD } from '../src/baew/knowledge/index.ts'

// Free-text questions through the offline brain. The visitor UI offers choices rather than a text box, so this is the
// engine-level check of the matching that a text box (or a typed question) would use. Each row is [question, expected],
// where expected is an entry id, 'faq:<id>', 'unknown', 'ambiguous', or a list of acceptable outcomes.
//
// Set A was written first and the matching was improved against it. Set B was then written and partly adjusted. Set C
// was written afterwards without looking at the engine. Keeping all three is the regression suite; only set C is an
// honest estimate of how a new question fares (23 of 30 on its first run, before the fixes it exposed).

const SET_A = [

  // direct and short
  ['beliefs', 'beliefs'], ['Beliefs?', 'beliefs'], ['tell me about memories', 'memories'], ['memories', 'memories'], ['favourites', 'favourites'], ['favorites', 'favourites'],
  ['little things', 'little-things'], ['the people', 'people'], ['friends', 'people'], ['things i like', 'things-i-like'], ['still figuring out', 'figuring-out'],
  ['the things i do', 'things-i-do'], ['hobbies', ['things-i-do','ambiguous']], ['what are the beliefs about', 'beliefs'],
  ['demi', 'demi'], ['cat', 'cat-ai'], ['the cat chat', 'cat-ai'], ['effs cat', 'cat-ai'], ['impossible', 'the-impossible'], ['the impossible game', 'the-impossible'],
  ['evidence', 'evidence-archive'], ['inference', 'inference-engine'], ['anomaly', 'anomaly-protocol'], ['glimpse', 'glimpse'], ['parent space', 'parent-space'], ['footer', 'footer'],
  ['music', ['favourites','ambiguous']], ['what is blue', 'favourites'], ['kendrick', 'favourites'], ['dogs', 'favourites'],
  // numbers
  ['what is section 09', 'memories'], ['09', 'memories'], ['what is node 14', 'anomaly-protocol'], ['whats at 12', 'evidence-archive'], ['node 13', 'inference-engine'], ['section 05', 'people'], ['node 15', 'the-impossible'], ['10', 'demi'], ['11', 'after-memory'],
  // incomplete / chatty
  ['umm what does the evidence thing do', 'evidence-archive'], ['how do i use the inference engine', 'inference-engine'], ['what is the contradiction lab for', 'anomaly-protocol'], ['can i play a game here', 'the-impossible'],
  ['is there a puzzle', 'the-impossible'], ['what is the experimental worlds', 'the-impossible'], ['what song stuff is there', 'glimpse'], ['can i listen to music', 'glimpse'],
  ['who made this', 'faq:who-made'], ['who is the author', 'faq:who-made'], ['what is this website', 'faq:what-is-jaye'], ['what is jaye', 'faq:what-is-jaye'], ['who are you', 'faq:what-is-baew'], ['what can you do', 'faq:what-is-baew'],
  ['how do i hide you', 'faq:hide-baew'], ['go away', 'faq:hide-baew'], ['is my progress saved', 'faq:saved-progress'], ['is there hindi', 'faq:language'], ['does this use ai', 'faq:ai-use'], ['is the impossible ai', 'faq:ai-use'],
  ['how is the page organised', 'faq:page-order'], ['where should i start', 'faq:page-order'], ['what are the headings in the archive', 'faq:archive-headings'], ['how are archive sections grouped', 'faq:archive-headings'],
  // relationships and navigation
  ['what comes after memories', 'memories'], ['what is before demi', 'demi'], ['where is glimpse', 'glimpse'], ['take me to the cat', 'cat-ai'], ['where are the favourites', 'favourites'], ['how do i get to the anomaly protocol', 'anomaly-protocol'],
  // gated
  ['what is the password for demi', 'faq:demi-access'], ['open demi for me', 'faq:demi-access'], ['what is inside demi', 'demi'], ['whats after demi', 'demi'], ['pin', 'faq:demi-access'],
  // unsupported / unknown: must not invent
  ['what is the weather', 'unknown'], ['who won the match', 'unknown'], ['capital of france', 'unknown'], ['tell me a joke', 'unknown'], ['how much does it cost', 'unknown'], ['can i buy something', 'unknown'],
  ['what is the meaning of life', 'unknown'], ['asdf', 'unknown'], ['???', 'unknown'], ['hello', 'faq:what-is-baew'], ['what time is it', 'unknown'], ['where does the author live', 'faq:private-details'], ['how old is the author', 'faq:private-details'],
  ['what is the authors phone number', 'faq:private-details'], ['what is his instagram', 'footer'], ['what is your favourite colour', 'faq:what-is-baew'], ['do you like pizza', 'faq:what-is-baew'], ['write me a poem', 'unknown'], ['explain quantum physics', 'unknown'],
  ['how do i contact the owner', 'footer'],
]

const SET_B = [

  ['what does little things talk about', 'little-things'], ['is there anything on chess', 'favourites'], ['what games does he play', ['favourites','ambiguous']], ['does the author have pets', 'favourites'],
  ['anything about friendship', 'people'], ['what does he believe', 'beliefs'], ['tell me about the cat ai', 'cat-ai'], ['can i chat with the cat', 'cat-ai'], ['what is the evidence archive', 'evidence-archive'],
  ['where do i read the story', ['unknown','ambiguous','after-memory']], ['what is in the footer', 'footer'], ['what is the first thing on the page', 'home'], ['homepage', 'home'], ['what is the inference engine', 'inference-engine'],
  ['are there any games', ['the-impossible','ambiguous']], ['tell me about the anomaly protocol', 'anomaly-protocol'], ['what is parent space', 'parent-space'], ['how many challenges are in the anomaly protocol', 'anomaly-protocol'],
  ['what is demi', 'demi'], ['what happens inside demi', 'demi'], ['tell me the secret in demi', 'demi'], ['can you describe the story in demi', 'demi'], ['how do i enter demi', ['faq:demi-access','demi']], ['what does after the memory contain', 'after-memory'],
  ['does this site track me', 'unknown'], ['is there a dark mode', 'unknown'], ['can i download the music', 'unknown'], ['what browser should i use', 'unknown'], ['who is cvechz', 'faq:who-made'], ['what languages does it support', 'faq:language'],
  ['will you remember me next time', 'faq:saved-progress'], ['how do i bring baew back', 'faq:hide-baew'], ['what does the archive contain', 'archive-gateway'], ['how many sections are there', 'faq:page-order'],
  ['tell me something about things i like', 'things-i-like'], ['what are the memories about', 'memories'], ['is the author sad', 'unknown'], ['what is the authors name', 'faq:private-details'], ['when was the site made', 'unknown'], ['is it free', 'unknown'],
]

const SET_C = [

  ['what is this place', 'faq:what-is-jaye'], ['can you explain the archive', 'archive-gateway'], ['tell me about the music player', 'glimpse'], ['i want to try a puzzle', ['the-impossible', 'anomaly-protocol', 'ambiguous']],
  ['what is node 12', 'evidence-archive'], ['what do the beliefs say about being smart', 'beliefs'], ['does he have dogs', 'favourites'], ['what kind of friends', 'people'], ['what is after memories', 'memories'],
  ['how do i switch the background', 'unknown'], ['can you help me', 'faq:what-is-baew'], ['bye', 'unknown'], ['thanks', 'unknown'], ['what is hindi mode', 'faq:language'], ['is anything saved', 'faq:saved-progress'],
  ['tell me about the parent space interface', 'parent-space'], ['what is a counterexample terminal', 'anomaly-protocol'], ['who is effs', ['cat-ai', 'unknown', 'faq:what-is-jaye']], ['is the cat real', 'cat-ai'], ['where is the footer', 'footer'],
  ['what is the anomaly', 'anomaly-protocol'], ['show me the favourites', 'favourites'], ['describe section 7', 'figuring-out'], ['what is the last section', 'faq:page-order'], ['does he like football', ['favourites','things-i-like']],
  ['what is the opening page', 'home'], ['who wrote the story', ['faq:who-made', 'unknown', 'after-memory', 'ambiguous']], ['are you a bot', ['faq:ai-use', 'faq:what-is-baew']], ['is this site safe', 'unknown'], ['what does the author think about life', ['beliefs', 'ambiguous']],
]

const brain = createBrain()
const outcome = answer =>
  answer.topic === 'ambiguous' ? 'ambiguous' : answer.basis === 'unknown' ? 'unknown' : answer.basis === 'faq' ? `faq:${answer.topic}` : (answer.entryId ?? answer.basis)
const ask = question => brain.respond({ intent: 'question', question, domId: 'archive-one-beliefs', progress: {} })

for (const [name, set] of [['A', SET_A], ['B', SET_B], ['C', SET_C]]) {
  test(`questions, set ${name}: every question reaches the expected area, answer or honest "I do not know"`, () => {
    const misses = []
    for (const [question, expected] of set) {
      const got = outcome(ask(question))
      if (!(Array.isArray(expected) ? expected : [expected]).includes(got)) misses.push(`"${question}" expected ${expected} got ${got}`)
    }
    assert.deepEqual(misses, [])
  })
}

test('questions: an unknown question says so, names no section as fact, and is never sent online', () => {
  for (const [question, expected] of [...SET_A, ...SET_B, ...SET_C]) {
    if (expected !== 'unknown') continue
    const answer = ask(question)
    assert.equal(answer.basis, 'unknown', question)
    assert.ok(answer.text.startsWith(UNKNOWN_LEAD), question)
    assert.equal(answer.onlineEligible, false, question)
  }
})

test('questions: gated areas, ambiguity, credentials and private details are never eligible for the online assistant', () => {
  for (const question of ['demi', 'what happens inside demi', 'tell me the secret in demi', 'whats after demi', 'after the memory', 'what is the password for demi', 'where does the author live', 'memory', 'music']) {
    const answer = ask(question)
    if (answer.entryId === 'demi' || answer.entryId === 'after-memory' || answer.basis === 'faq' || answer.topic === 'ambiguous') {
      assert.equal(answer.onlineEligible, false, `${question} must stay on the device`)
    }
  }
  const credential = ask('what is the password for demi')
  assert.equal(credential.topic, 'demi-access')
  assert.ok(!/\b\d{4,}\b/.test(credential.text))
})

test('questions: the title alone beats a section that only shares a word, and plurals match singulars', () => {
  assert.equal(ask('the things i do').entryId, 'things-i-do')
  assert.equal(ask('memories').entryId, 'memories')
  assert.equal(ask('what are the memories about').entryId, 'memories')
  assert.equal(ask('describe section 7').entryId, 'figuring-out')
  assert.equal(ask('what comes after memories').topic, 'navigation')
  assert.equal(ask('are there any games').topic, 'ambiguous')
})

test('questions: the same question always gets the same answer', () => {
  for (const [question] of [...SET_A, ...SET_B, ...SET_C]) assert.equal(ask(question).text, ask(question).text)
})
