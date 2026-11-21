import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// A short list of original taglines and statements cannot be selected; everything else (and the whole Archive) can.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const main = html.indexOf('<main>')
const marked = [...html.matchAll(/<[a-z0-9]+\b[^>]*\bclass="[^"]*\bjaye-sig\b[^"]*"[^>]*>/g)].map((m) => m[0])

test('one small rule, in its own style block ahead of <main>, and no global selection rule', () => {
  const block = html.match(/<style id="jaye-signature-lines-v1">([\s\S]*?)<\/style>/)
  assert.ok(block, 'the named style block exists')
  assert.ok(html.indexOf('<style id="jaye-signature-lines-v1">') < main, 'page CSS sits ahead of <main>')
  const css = block[1].replace(/\/\*[\s\S]*?\*\//g, '')
  assert.equal(css.trim(), '.jaye-sig{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}')
  // user-select:none appears only on the signature class, the Story 002 reader, the "01" numeral and the existing Archive touch guard
  const rules = [...html.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{[^{}]*user-select:\s*none[^{}]*\}/g)].map((m) => m[1].trim())
  for (const sel of rules) assert.doesNotMatch(sel, /^(\*|html|body|main|p|h[1-6]|span|div|a)$/i, `no global rule: ${sel}`)
})

test('exactly the approved lines are marked, and nothing else', () => {
  assert.equal(marked.length, 16, marked.join('\n'))
  const need = [
    /hero-intro"><p class="jaye-sig">A Private Index of Things Unrecorded\./,
    /<p class="jaye-v5-phrase jaye-v5-phrase--one jaye-sig">/, /<p class="jaye-v5-phrase jaye-v5-phrase--two jaye-sig">/,
    /<p class="jaye-intro-phrase jaye-intro-phrase--one jaye-sig">/, /<p class="jaye-intro-phrase jaye-intro-phrase--two jaye-sig">/,
    /<h2 class="postai-heading jaye-sig" id="postAI-game-title">A game that does not/,
    /<div class="demi-eyebrow jaye-sig">A door was left open\./, /<h2 class="jaye-sig">There is one/, /<p class="jaye-sig">This page does not continue downward\./,
    /<h2 class="sys-title jaye-sig">The story/, /<b class="jaye-sig">Return to the beginning\.<\/b><span class="jaye-sig">The archive closes\./,
    /<h2 id="parent-atlas-title" class="jaye-sig">Read the record\./,
    /<h3 class="jaye-sig">\$\{esc\(x\.title\)\}<\/h3>/, /ACTIVE DOSSIER[^<]*<\/div><h3 class="jaye-sig">\$\{esc\(c\.title\)\}<\/h3>/, /<div class="ja-panel"><h3 class="jaye-sig">\$\{esc\(c\.title\)\}<\/h3>/,
  ]
  for (const re of need) assert.match(html, re)
})

test('the Archive is untouched: none of its markup or text carries the class', () => {
  const lines = html.split('\n')
  for (const key of ['NO FEED. NO ALGORITHM', 'JUST WHAT I CHOOSE TO KEEP', 'I still come back to blue', "I think that's what memories really are", "I'm still growing into the person", 'archive-interface-one', 'archive-interface-two', 'id="archiveInterfaces"', 'portal-bottomline']) {
    for (const l of lines.filter((x) => x.includes(key))) assert.doesNotMatch(l, /jaye-sig/, `${key}: ${l.slice(0, 120)}`)
  }
  // ordinary text stays copyable: no paragraph in the page body, the navigation, buttons, labels or the footer is marked
  assert.ok(!marked.some((t) => /^<(button|a|label|input|textarea|nav|footer|select|option)\b/.test(t)))
  // the existing protections are still exactly as they were
  assert.match(html, /\.story002-pages\{[^}]*user-select:none/)
  assert.match(html, /jaye-archive-touch-guard-v1/)
})
