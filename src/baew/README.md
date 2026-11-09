# Baew: offline-first guide

Baew is the mascot guide on JAYE. This folder is everything Baew *knows* and *decides*; `src/StrobiGuide.tsx` is the part
that draws it (mascot, speech bubble, menu) and is the only file here that touches the page.

Baew has no dependency on Cat AI. It shares no code, prompts, history, memory or fallback text with it, and nothing
in this folder imports or calls it.

## How an answer is produced

```
visitor action (menu choice / first visit)
        │
        ▼
 brain.respond()  ── pure, offline, instant ──►  local answer  (always computed first)
        │
        ├─ gated / owner-approved wording ─────────────────────►  shown as is, never sent online
        │
        ▼
 startHandoff()   races the online assistant against a 5 000 ms budget
        │
        ├─ valid reply within 5 s ──► the reworded answer is shown
        └─ timeout / offline / error / unusable reply ──► the local answer is shown (already in hand, so instant)
```

* One request produces exactly one answer. When the local answer wins, the online request is aborted and anything it
  returns later is ignored. A newer request or a closed popup cancels the older one, which settles with nothing to show,
  so an old request can never replace a newer answer.
* The online assistant is **never asked what JAYE contains.** For a section the knowledge covers, it is handed the
  verified local answer and asked to put it in fresh words (`VERIFIED ANSWER:`). For a section the knowledge does not
  cover, it is handed the section's own visible text, marked as untrusted data, and told to say only what that text says.
* The reply is sanitised before display (`sanitizeReply`): labels, markdown, links and over-length text are stripped, and an
  empty result counts as unusable, which falls back to the local answer.

## Files

| File | Role |
| --- | --- |
| `knowledge/types.ts` | Shape of an entry: `summary`, `explain`, `recap`, `deeper[]`, `related[]`, `keywords`, `access`, `localOnly`, `verification`, `approvedWording`. |
| `knowledge/sections.ts` | One vetted entry per section of the page (20), written from the section's own content. 18 are marked `verified` (read against the page); 2 (Demi and the area after it) are `partial` because what lies behind the gate is deliberately not described. |
| `knowledge/site.ts` | Whole-site FAQs (what JAYE is, what Baew is, page order, hiding Baew, saved progress, owner-only access, AI use, language, who made it) and the honest "I don't know" lead. |
| `brain.ts` | Deterministic engine: chooses what to say first, skips what the visitor already heard, suggests a next step, and answers questions only from the knowledge. No DOM, network or timers. |
| `handoff.ts` | The 5-second race, cancellation and `sanitizeReply`. No DOM or React. |
| `online.ts` | Builds the prompt for the online assistant and makes the single request to `/api/strobi-guide`. |
| `clearance.ts` | Geometry for keeping Baew's home corner clear of page controls. Moved out of `StrobiGuide.tsx` unchanged. |

## How a question is matched

The visitor menu offers choices only (Explain this section, Go deeper, Surprise me), so free-text questions never reach
Baew from the page today. The engine still answers them (`brain.respond({ intent: 'question', question })`) so a future
input box needs no new logic, and so the behaviour can be tested.

* The question is lower-cased, split into words, stripped of filler words and lightly stemmed (plural endings only, so
  "games" matches "game" and nothing is over-reduced).
* Fixed routes come first: credential or unlock questions get the owner-only answer, AI questions the AI-use answer,
  questions about private details the privacy answer, off-topic questions the honest "I don't know", and greetings or
  "who are you" the introduction. A sample question from an FAQ, repeated word for word, goes to that FAQ.
* A question that is only "this / here / what is this" explains the section on screen. A question that names an area by
  its full title goes to that area. "What comes after X" answers with X's position, not its contents.
* Otherwise each section and each FAQ is scored on its keywords and title words (and, for FAQs, the wording of its sample
  questions); a numbered node ("node 04") scores highest. Third-person cues (he, his, she, her, author) lean to the
  personal Archive sections.
* When two sections tie, Baew says that more than one fits and names them, instead of guessing.
* Anything below the confidence floor (a score under 3) gets the honest "I don't know" lead followed by what Baew can
  actually help with. Nothing is improvised.

## Rules the code enforces

* **Gated areas are local-only.** Entries marked `localOnly` (Demi, the area after it, and Cat AI) are never sent online.
  Baew describes the public doorway of such an area, never what is behind it, and never mentions or asks for access details.
  Questions about passwords, PINs or owner access get a fixed answer: Baew cannot open Demi, give its passphrase or describe what is inside, because that access belongs to the site owner.
* **Owner-approved wording is verbatim.** An entry marked `approvedWording` (the Archive gateway's overview) is shown exactly
  as approved and is never reworded online.
* **Progress is committed only when an answer is actually shown**, so a cancelled or ignored request does not make Baew
  think the visitor has already heard something.
* **Nothing is invented.** A section the knowledge does not cover is described from its visible text only, and Baew says
  so when that text is unclear. Challenges are described as what they are; none is presented as generative AI.
* **Register.** Professional and informative, in both personality modes. Light playfulness is limited to the explicit
  "Surprise me" / chatter path.

## Timing (in `StrobiGuide.tsx`)

* The welcome popup is armed only once Baew is actually visible, that is after the opening intro lifts, so it is never
  shown to an empty screen. It opens about 1.3 s after the intro and stays about 8 s.
* Every answer stays about 8 s from the moment it becomes visible (the timer starts then, not at the request).
  Ambient popups keep their shorter 4.5 s. Hovering holds a popup; leaving restarts the timer.
* The timer pauses while the tab is hidden.

## Adding or changing knowledge

1. Edit the entry in `knowledge/sections.ts` (or `site.ts`). Write from what the section really contains.
2. Keep `explain` to 28 to 60 words and each `deeper` item to 12 to 50 words (the tests enforce this).
3. Run `npm test`. `tests/knowledge.test.mjs` checks that ids are unique and related ids exist, that every DOM id described
   exists in `index.html`, that the page numbers stated match the site, that gated areas stay local-only, that no
   credential appears, the professional register, word counts, the verbatim approved wording, the third-person voice of
   the personal sections, and that site-specific claims match the page text.

## Tests

`npm test` runs `tests/*.test.mjs` with Node's built-in runner:

* `knowledge.test.mjs`: entry shape and word counts, ids and related links, every described DOM id exists in
  `index.html`, page numbers and site claims match the page, gated areas stay local-only, no credentials, register,
  verbatim approved wording, third-person voice for the personal sections, and the Archive structure: exactly four chapter
  headings, each followed by its two numbered sections, all eight sections present.
* `questions.test.mjs`: natural, short, incomplete and misspelt questions against the right section (three independent
  question sets, one of them held out while the matching was tuned), unknown questions, gated questions, ambiguity and
  determinism.
* `brain`, `handoff`, `online` and `api` tests: progress and return visits, routing, the 5-second race, late and empty
  replies, cancellation, the prompt, and the API route.

Browser behaviour (timing, popups, the handoff against a stubbed API, unmount while pending, rapid interactions,
offline) was verified separately with Playwright against a stubbed `/api/strobi-guide`; those scripts live outside the
repository. The live online model cannot be exercised from a test environment, so only its failure and success paths are
tested, not the quality of its wording.
