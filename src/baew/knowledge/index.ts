import { FAQS, SITE_NAME, SITE_OVERVIEW, UNKNOWN_LEAD } from './site.ts'
import { SECTIONS } from './sections.ts'
import type { Knowledge } from './types.ts'

export type { Access, DeeperItem, Faq, Knowledge, SectionEntry, SectionGroup, TopicKind, Verification } from './types.ts'
export { UNKNOWN_LEAD }

export const KNOWLEDGE: Knowledge = {
  version: '1',
  siteName: SITE_NAME,
  overview: SITE_OVERVIEW,
  sections: SECTIONS,
  faqs: FAQS,
}
