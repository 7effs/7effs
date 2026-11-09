// Baew's structured knowledge of JAYE.
//
// Everything in here is written by hand from what the site actually shows a visitor. It is the
// foundation of Baew's local brain: the brain never needs the network, and the online assistant is
// only ever handed these vetted facts (or nothing at all for gated sections), never raw page text
// for a section described here.
//
// Rules for every entry:
//   - Describe only what a visitor can see or do. No invented features, links or behaviour.
//   - Gated or owner-only areas get a spoiler-free description of the public doorway and nothing
//     about what is behind it. No passphrases, PINs or owner controls, ever.
//   - Professional, informative register. The site's personal sections are written in the author's
//     own voice; Baew describes them in the third person and never speaks as the author.

/** Who may open the area. `gated` and `owner` entries are described from their public doorway only. */
export type Access = 'open' | 'gated' | 'owner'

/** `verified` = read against the live page. `partial` = some behaviour could not be confirmed. */
export type Verification = 'verified' | 'partial'

/** What a "go deeper" answer is about, so the brain can vary the angle. */
export type TopicKind = 'contents' | 'how' | 'actions' | 'connections' | 'notes'

export type SectionGroup = 'main' | 'archive' | 'special' | 'systems' | 'other'

export interface DeeperItem {
  topic: TopicKind
  text: string
}

export interface SectionEntry {
  /** Stable knowledge id (never a DOM id). */
  id: string
  /** DOM element ids this entry describes. A footer-like area without an id has none. */
  domIds: string[]
  title: string
  /** The numbering the site itself uses ("02", "10", "12 to 13"), when it has one. */
  node?: string
  group: SectionGroup
  access: Access
  /** True: nothing about this entry is ever sent to the online assistant. */
  localOnly: boolean
  verification: Verification
  /** One short sentence: what this is. Used in navigation answers and as grounding. */
  summary: string
  /** The answer to "Explain this section". Aim for 35 to 55 words. */
  explain: string
  /** A very short reminder, used instead of repeating `explain` on a return visit. */
  recap: string
  /** Further answers, in the order they are given. Each stands on its own. */
  deeper: DeeperItem[]
  /** Words a visitor might use for this area. Used to match questions. */
  keywords: string[]
  /** Knowledge ids of the areas that naturally come next or relate. First is the best next step. */
  related: string[]
  /** Optional replacement for the generic welcome when this is the first thing a visitor sees. */
  welcome?: string
  /**
   * True when the `explain` text is wording the site owner approved exactly. It is always shown as written, so it
   * is never sent to the online assistant to be paraphrased.
   */
  approvedWording?: boolean
}

export interface Faq {
  id: string
  /** Example phrasings, used for matching and for tests. */
  questions: string[]
  keywords: string[]
  answer: string
}

export interface Knowledge {
  version: string
  siteName: string
  /** What the whole site is, in a sentence or two. */
  overview: string
  /** In page order. The brain uses the order for "where is" and "what comes next". */
  sections: SectionEntry[]
  faqs: Faq[]
}
