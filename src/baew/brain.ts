// Baew's local brain.
//
// A deterministic engine that turns "what the visitor is looking at" plus "what they asked for" into a
// written answer, using only the verified knowledge in ./knowledge. It has no DOM, network or timer
// dependency, so it works with the internet completely unavailable and can be unit-tested in Node.
//
// It is not a language model and does not pretend to be one: every sentence it produces was written
// by a person and checked against the site. What it adds is selection and ordering: which fact comes
// first, what a return visit should skip, what to suggest next, and an honest "I don't know".
//
// Baew never depends on Cat AI. Nothing here imports, calls or shares state with it.

import { KNOWLEDGE, UNKNOWN_LEAD } from './knowledge/index.ts'
import type { Faq, Knowledge, SectionEntry } from './knowledge/index.ts'

export type Intent = 'welcome' | 'explain' | 'deeper' | 'question'

/** How far the visitor has got with one area this session. */
export interface EntryProgress {
  explained: boolean
  /** Position in the deeper sequence (see `respond`). */
  depth: number
}
export type Progress = Record<string, EntryProgress>

export interface BrainRequest {
  intent: Intent
  /** The DOM id of the section the visitor is looking at. */
  domId?: string
  /** That section's heading, used only when the knowledge has no entry for it. */
  title?: string
  /** That section's visible text (untrusted), used only when the knowledge has no entry for it. */
  text?: string
  /** What the visitor asked, for `question`. Baew's current UI offers choices only, so this is optional. */
  question?: string
  progress?: Progress
  /** Local hour 0 to 23, for the greeting. */
  hour?: number
}

/** Where an answer came from. Only `knowledge` and `faq` are verified statements about JAYE. */
export type Basis = 'knowledge' | 'faq' | 'section' | 'site' | 'unknown'

export interface BrainAnswer {
  text: string
  basis: Basis
  /** The knowledge entry the answer is about, when there is one. */
  entryId: string | null
  /** The angle taken: overview, recap, a deeper topic, navigation, and so on. */
  topic: string
  /** Progress to record once this answer is actually on screen (never before, so a dropped answer costs nothing). */
  next: { entryId: string; progress: EntryProgress } | null
  /** DOM id the visitor can be taken to, when the answer points somewhere. */
  target: string | null
  /** May this be sent to the online assistant as grounding? False for gated areas and for questions with no match. */
  onlineEligible: boolean
}

export interface Grounding {
  title: string
  node: string | null
  summary: string
  facts: string[]
}

export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Hello'
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'am', 'do', 'does', 'did', 'can', 'could', 'would', 'should',
  'will', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'about', 'and', 'or', 'but', 'if', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'we', 'you', 'your', 'please', 'tell', 'show', 'what', 'whats', 'how', 'why', 'who',
  'which', 'there', 'here', 'some', 'any', 'so', 'as', 'by', 'from', 'get', 'got', 'go', 'out', 'up',
  'he', 'she', 'his', 'her', 'him', 'they', 'them', 'their', 'have', 'has', 'when', 'where', 'anything', 'something',
])
// Words that only mean "the thing I am looking at".
const DEICTIC = new Set(['this', 'here', 'it', 'section', 'page', 'explain', 'current', 'thing', 'one'])
const NAV_WORDS = /\b(where|find|take me|go to|navigate|get to|jump to|show me where|locate)\b/i
// Questions about AI always get the vetted answer, which says which parts of the site use AI and which are rule-based.
// A question about the Cat chat itself still goes to that section.
const AI_WORDS = /\b(ai|a\.i\.|artificial intelligence|generative|generated|chat ?bots?|llm|machine learning)\b/i
// Anything that asks for a credential or for a locked area to be opened gets the access answer and nothing else,
// whichever section happens to share a word with the question. Nothing in the knowledge contains a credential.
const CREDENTIAL_WORDS = /\b(passwords?|passphrases?|passcodes?|pins?|unlock(ed|ing)?|log ?in|sign ?in|credentials?|owner (verification|access|auth\w*|panel|controls?)|access control)\b/i
// Questions about the author's private life. The knowledge holds none of it, and Baew would not share it if it did.
const PRIVATE_DETAILS = /\b(where (does|do|did|is|are)\b.{0,30}\b(live|lives|stay|based|located|from)|how old|\bage\b|born|birthday|phone|mobile number|whats ?app|e-?mail|home address|real name|full name|surname|school|college|girlfriend|boyfriend|salary|income)\b/i
// A question put to Baew itself about its own tastes or life ("do you like pizza"). Baew is a guide and says so.
const ABOUT_BAEW = /\b(do you|are you|have you|did you|would you|your)\b.{0,40}\b(like|love|hate|favou?rite|eat|drink|play|watch|sleep|feel|name|family|parents|hobby|hobbies|age|old)\b/i
// Questions about things the knowledge does not cover (cost, downloads, tracking, dates). Say so rather than answer a neighbouring question.
const OUT_OF_SCOPE = /\b(download(s|ed|ing)?|buy|purchase|price|prices|cost|pay|paid|subscribe|subscription|cookies?|tracking|track(s|ed)? me|privacy|dark mode|browser|updated?|version|when was|what year|how long ago|safe|secure|security|trustworthy|legit|scam|virus|malware)\b|\bis it free\b/i
const GREETING = /^\s*(hi|hello|hey|hiya|yo|good (morning|afternoon|evening))\b[\s!.?,]*$/i
// "what comes after Memories", "what is before Demi": the visitor wants the position of an area, not its contents.
const RELATION_WORDS = /\b(what )?(comes?|is|are|s)?\s*(directly |right )?(after|before|next to|next|previous|follows?|following|precedes?)\b/gi

function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.length > 4 && /(ss|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2)
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1)
  return word
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function contentTokens(text: string): string[] {
  return tokenize(text).filter(word => !STOPWORDS.has(word)).map(stem)
}

/** Lower-case words joined by single spaces, so phrases can be compared whatever the punctuation. */
function normalise(text: string): string {
  return tokenize(text).join(' ')
}

/** The first sentences of some text, up to a character budget. Used to quote an unknown section honestly. */
function openingOf(text: string, budget: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  const parts = clean.split(/([.!?])\s+/)
  let out = ''
  for (let i = 0; i < parts.length; i += 2) {
    const sentence = (parts[i] ?? '') + (parts[i + 1] ?? '')
    if (!sentence.trim()) continue
    if (out && (out + ' ' + sentence).length > budget) break
    out = out ? out + ' ' + sentence : sentence
    if (out.length >= budget * 0.6) break
  }
  if (out.length > budget) out = out.slice(0, budget).replace(/\s+\S*$/, '') + '…'
  return out
}

export function createBrain(knowledge: Knowledge = KNOWLEDGE) {
  const byId = new Map<string, SectionEntry>()
  const byDomId = new Map<string, SectionEntry>()
  knowledge.sections.forEach(entry => {
    byId.set(entry.id, entry)
    entry.domIds.forEach(domId => byDomId.set(domId, entry))
  })

  const entryForDomId = (domId: string | undefined): SectionEntry | null => (domId ? byDomId.get(domId) ?? null : null)
  const entryById = (id: string): SectionEntry | null => byId.get(id) ?? null
  const progressOf = (progress: Progress | undefined, entry: SectionEntry): EntryProgress =>
    progress?.[entry.id] ?? { explained: false, depth: 0 }

  function nextStep(entry: SectionEntry): string {
    const related = entry.related.map(id => byId.get(id)).find((item): item is SectionEntry => Boolean(item))
    if (!related) return 'You can ask me about any other section.'
    return `From here, ${related.title} is a natural next step. ${related.summary}`
  }

  function answerFor(entry: SectionEntry, text: string, topic: string, next: EntryProgress | null): BrainAnswer {
    return {
      text,
      basis: 'knowledge',
      entryId: entry.id,
      topic,
      next: next ? { entryId: entry.id, progress: next } : null,
      target: entry.domIds[0] ?? null,
      // Owner-approved wording is never paraphrased, and gated areas never leave the device.
      onlineEligible: !entry.localOnly && !(entry.approvedWording && topic === 'overview'),
    }
  }

  // "Explain this section": the overview the first time, then a short reminder plus the next detail.
  function explain(entry: SectionEntry, progress: Progress | undefined): BrainAnswer {
    const current = progressOf(progress, entry)
    if (!current.explained) {
      return answerFor(entry, entry.explain, 'overview', { explained: true, depth: current.depth })
    }
    const item = entry.deeper[current.depth % entry.deeper.length]
    return answerFor(entry, `${entry.recap} ${item.text}`, `recap+${item.topic}`, {
      explained: true,
      depth: current.depth + 1,
    })
  }

  // "Go deeper": each tap gives the next detail, then a pointer to where to go next, then starts over.
  function deeper(entry: SectionEntry, progress: Progress | undefined): BrainAnswer {
    const current = progressOf(progress, entry)
    const length = entry.deeper.length
    const position = current.depth % (length + 1)
    const round = Math.floor(current.depth / (length + 1))
    const advance: EntryProgress = { explained: current.explained, depth: current.depth + 1 }

    if (position === length) {
      return answerFor(entry, `That covers the main points of ${entry.title}. ${nextStep(entry)}`, 'next-step', advance)
    }
    const item = entry.deeper[position]
    // Someone who goes deeper before asking for the overview still needs to know where they are.
    const lead = !current.explained && current.depth === 0 ? `${entry.recap} ` : round > 0 && position === 0 ? `Going over ${entry.title} again. ` : ''
    return answerFor(entry, `${lead}${item.text}`, item.topic, advance)
  }

  function welcome(entry: SectionEntry | null, hour: number): BrainAnswer {
    const greeting = `${greetingFor(hour)}. I’m Baew, your guide to ${knowledge.siteName}.`
    if (entry?.welcome) {
      return answerFor(entry, `${greeting} ${entry.welcome}`, 'welcome', null)
    }
    if (entry) {
      return answerFor(entry, `${greeting} ${entry.summary} Tap me for a fuller explanation.`, 'welcome', null)
    }
    return {
      text: `${greeting} Scroll to a section and tap me for an explanation or a closer look.`,
      basis: 'site',
      entryId: null,
      topic: 'welcome',
      next: null,
      target: null,
      onlineEligible: false,
    }
  }

  // A section the knowledge does not describe. Never guess: say so, and quote only what the page itself says.
  function unknownSection(req: BrainRequest): BrainAnswer {
    const title = (req.title || 'this section').trim()
    const opening = req.text ? openingOf(req.text, 170) : ''
    const text = opening
      ? `I do not have a verified description of “${title}” yet. Its opening text reads: “${opening}”`
      : `I do not have a verified description of “${title}” yet, so I can only tell you its title. I can explain any of the other sections.`
    return {
      text,
      basis: 'section',
      entryId: null,
      topic: 'unverified',
      next: null,
      target: req.domId ?? null,
      onlineEligible: Boolean(req.text),
    }
  }

  function scoreEntry(entry: SectionEntry, query: Set<string>): number {
    let score = 0
    const keywords = new Set(entry.keywords.flatMap(contentTokens))
    const title = new Set(contentTokens(entry.title))
    for (const word of query) {
      if (keywords.has(word)) score += 3
      if (title.has(word)) score += 3
    }
    // Section numbers are written "07" on the page and often asked as "7".
    if (entry.node && [...query].some(word => /^\d+$/.test(word) && /^\d+$/.test(entry.node!) && Number(word) === Number(entry.node))) score += 4
    // The question is the title and nothing else ("memories"), so it beats an area that merely contains the word.
    if (score > 0 && title.size > 0 && query.size === title.size && [...query].every(word => title.has(word))) score += 2
    return score
  }

  function scoreFaq(faq: Faq, query: Set<string>): number {
    let score = 0
    const keywords = new Set(faq.keywords.flatMap(contentTokens))
    const phrasing = new Set(faq.questions.flatMap(contentTokens))
    for (const word of query) {
      if (keywords.has(word)) score += 3
      else if (phrasing.has(word)) score += 1.5
    }
    return score
  }

  function position(entry: SectionEntry): string {
    const index = knowledge.sections.indexOf(entry)
    const before = knowledge.sections[index - 1]
    const after = knowledge.sections[index + 1]
    const label = entry.node ? `${entry.title} is node ${entry.node}.` : `${entry.title} is one of the sections of the page.`
    const place = before && after ? ` It comes after ${before.title} and before ${after.title}.` : before ? ` It comes after ${before.title}.` : after ? ` It comes before ${after.title}.` : ''
    return `${label}${place} ${entry.summary}`
  }

  // Visitor questions. The current interface offers quick choices rather than a text box, so this is the
  // foundation for free text rather than something the choices depend on.
  function faqAnswer(faq: Faq): BrainAnswer {
    return { text: faq.answer, basis: 'faq', entryId: null, topic: faq.id, next: null, target: null, onlineEligible: false }
  }
  const faqById = (id: string): Faq | undefined => knowledge.faqs.find(faq => faq.id === id)

  // Full titles ("the things i do") with and without a leading article, longest first so the most specific title wins.
  const titlePhrases = knowledge.sections
    .flatMap(entry => {
      const full = normalise(entry.title)
      const bare = full.replace(/^(the|a|an) /, '')
      return [...new Set([full, bare])].filter(phrase => phrase.split(' ').length >= 2).map(phrase => ({ phrase, entry }))
    })
    .sort((a, b) => b.phrase.length - a.phrase.length)

  type Match = { kind: 'entry'; entry: SectionEntry; score: number } | { kind: 'faq'; faq: Faq; score: number }
  // "What games does he play": a question about the author belongs with the author's own sections.
  const PERSONAL_CUE = /\b(he|his|him|she|her|author|their)\b/i
  function bestByWords(query: Set<string>, current: SectionEntry | null, personal = false): { best: Match | null; tied: SectionEntry | null } {
    let best: Match | null = null
    let tied: SectionEntry | null = null
    for (const entry of knowledge.sections) {
      const base = scoreEntry(entry, query)
      let score = base + (current && entry.id === current.id ? 0.5 : 0)
      if (personal && base > 0 && /^archive-(one|two)-/.test(entry.domIds[0] ?? '')) score += 4
      if (score > (best?.score ?? 0)) {
        best = { kind: 'entry', entry, score }
        tied = null
      } else if (best && best.kind === 'entry' && score === best.score && score >= 3 && !tied) {
        tied = entry
      }
    }
    // A question aimed at the whole site beats a section that merely shares a word with it.
    for (const faq of knowledge.faqs) {
      const score = scoreFaq(faq, query)
      if (score > 0 && score >= (best?.score ?? 0)) {
        best = { kind: 'faq', faq, score }
        tied = null
      }
    }
    return { best, tied }
  }

  // Two areas matched equally well. Better to say so than to pick one and sound sure.
  function ambiguousAnswer(first: SectionEntry, second: SectionEntry): BrainAnswer {
    return {
      text: `That could mean two areas. ${first.title}: ${first.summary} ${second.title}: ${second.summary} Tell me which you mean, or open one and tap me.`,
      basis: 'knowledge',
      entryId: null,
      topic: 'ambiguous',
      next: null,
      target: null,
      onlineEligible: false,
    }
  }

  // Visitor questions. The current interface offers quick choices rather than a text box, so this is the
  // foundation for free text rather than something the choices depend on.
  function question(req: BrainRequest, current: SectionEntry | null): BrainAnswer {
    const raw = (req.question ?? '').trim()
    // Nothing usable at all (empty, or only punctuation): say so rather than explaining whatever is on screen.
    const spoken = normalise(raw)
    const tokens = contentTokens(raw)
    const meaningful = tokens.filter(word => !DEICTIC.has(word))

    if (!raw) return current ? explain(current, req.progress) : unknownSection(req)
    if (!spoken) return unknownAnswer(current)

    if (CREDENTIAL_WORDS.test(raw)) {
      const access = faqById('demi-access')
      if (access) return faqAnswer(access)
    }

    if (AI_WORDS.test(raw) && !/\bcat\b/i.test(raw)) {
      const ai = faqById('ai-use')
      if (ai) return faqAnswer(ai)
    }

    if (PRIVATE_DETAILS.test(raw) && !/\b(node|section)\b/i.test(raw)) {
      const privateFaq = faqById('private-details')
      if (privateFaq) return faqAnswer(privateFaq)
    }

    if (OUT_OF_SCOPE.test(raw) && !/\bfree fire\b/i.test(raw)) return unknownAnswer(current)

    if (GREETING.test(raw) || ABOUT_BAEW.test(raw)) {
      const self = faqById('what-is-baew')
      if (self) return faqAnswer(self)
    }

    // A question that is, or contains, one of the vetted questions word for word ("who are you").
    for (const faq of knowledge.faqs) {
      const listed = faq.questions.map(normalise)
      if (listed.some(item => spoken === item || (item.split(' ').length >= 3 && ` ${spoken} `.includes(` ${item} `)))) return faqAnswer(faq)
    }

    // A question that names an area by its full title ("the things i do") goes to that area, even though
    // the words in the title are ones that otherwise mean "this thing".
    const titled = titlePhrases.find(item => ` ${spoken} `.includes(` ${item.phrase} `))

    if (!titled && meaningful.length === 0) {
      return current ? explain(current, req.progress) : unknownSection(req)
    }

    // "What comes after Memories": the position of the area named, not its contents.
    if (!titled && RELATION_WORDS.test(raw)) {
      RELATION_WORDS.lastIndex = 0
      const rest = new Set(contentTokens(raw.replace(RELATION_WORDS, ' ')).filter(word => !DEICTIC.has(word) && word !== 'come'))
      RELATION_WORDS.lastIndex = 0
      const { best: named } = bestByWords(rest, null)
      if (named && named.kind === 'entry' && named.score >= 3) return answerFor(named.entry, position(named.entry), 'navigation', null)
    }
    RELATION_WORDS.lastIndex = 0

    const found = titled ? { best: { kind: 'entry', entry: titled.entry, score: 100 } as Match, tied: null } : bestByWords(new Set(meaningful), current, PERSONAL_CUE.test(raw))
    const best = found.best

    if (!best || best.score < 3) return unknownAnswer(current)
    if (best.kind === 'entry' && found.tied) return ambiguousAnswer(best.entry, found.tied)
    if (best.kind === 'faq') return faqAnswer(best.faq)
    if (NAV_WORDS.test(raw)) return answerFor(best.entry, position(best.entry), 'navigation', null)
    return explain(best.entry, req.progress)
  }

  function unknownAnswer(current: SectionEntry | null): BrainAnswer {
    const here = current ? ` I can explain ${current.title}, or tell you what any other section contains.` : ' I can explain any section, or tell you where things are.'
    return { text: `${UNKNOWN_LEAD}${here}`, basis: 'unknown', entryId: null, topic: 'unknown', next: null, target: null, onlineEligible: false }
  }

  function respond(req: BrainRequest): BrainAnswer {
    const entry = entryForDomId(req.domId)
    const hour = req.hour ?? new Date().getHours()
    switch (req.intent) {
      case 'welcome':
        return welcome(entry, hour)
      case 'question':
        return question(req, entry)
      case 'deeper':
        return entry ? deeper(entry, req.progress) : unknownSection(req)
      case 'explain':
      default:
        return entry ? explain(entry, req.progress) : unknownSection(req)
    }
  }

  // The vetted facts an online assistant may paraphrase. It is given these instead of raw page text,
  // so it can only ever say things that were checked, and gated areas are never described to it.
  function grounding(entryId: string): Grounding | null {
    const entry = byId.get(entryId)
    if (!entry || entry.localOnly) return null
    return {
      title: entry.title,
      node: entry.node ?? null,
      summary: entry.summary,
      facts: [entry.explain, ...entry.deeper.slice(0, 2).map(item => item.text)],
    }
  }

  return { respond, entryForDomId, entryById, grounding, knowledge }
}

export type Brain = ReturnType<typeof createBrain>
