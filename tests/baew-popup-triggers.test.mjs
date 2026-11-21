import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Baew's popups: what may start one, and what must never. The behaviour itself (welcome, whispers, fun messages,
// idle chatter, tap-to-explain, rapid switching, hiding, restoring) was exercised in a browser on a fake clock;
// these keep the shape of the code that decides it.
const tsx = readFileSync(new URL('../src/StrobiGuide.tsx', import.meta.url), 'utf8')
const bundle = readFileSync(new URL('../strobi-widget.js', import.meta.url), 'utf8')
const code = tsx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// the body of the first `new IntersectionObserver(` callback
function observerCallback() {
  const start = code.indexOf('new IntersectionObserver(')
  assert.ok(start > 0, 'the section observer exists (it still tells the menu which section is "this section")')
  const end = code.indexOf('{ threshold:', start)
  return code.slice(start, end)
}

test('being in view never starts an explanation: the section observer only records the active section', () => {
  const body = observerCallback()
  assert.doesNotMatch(body, /requestHelp|setTimeout|scheduleTry|presentCue|setCue/, 'no explanation, timer or popup from visibility')
  assert.match(body, /activeSectionRef\.current = current\.id/, 'the menu and Explain still learn which section is in view')
  assert.doesNotMatch(code, /seenSections|sectionTimer/, 'the write-only seen-set and the 1.4 s section timer are gone')
  assert.doesNotMatch(code, /,\s*1400\s*\)/, 'no 1400 ms section timer anywhere')
})

test('every requestHelp call site is classified: two welcomes, one title tap, two menu buttons', () => {
  const calls = code.split('\n').filter(line => /\brequestHelp\(/.test(line))
  assert.equal(calls.length, 5, 'five call sites in all')
  const welcome = calls.filter(c => /welcome: true, automatic: true/.test(c))
  assert.equal(welcome.length, 2, 'the homepage welcome (section and generic) is the only automatic request')
  assert.equal((code.match(/automatic: true/g) ?? []).length, 2, 'nothing else passes automatic: true')
  assert.equal((code.match(/void requestHelp\(section, \{\}\)/g) ?? []).length, 1, 'exactly one title-tap request')
  assert.equal((code.match(/requestHelp\(findActiveSection\(activeSectionRef\.current\), \{\}\)/g) ?? []).length, 1, 'menu: Explain this section')
  assert.equal((code.match(/requestHelp\(findActiveSection\(activeSectionRef\.current\), \{ deeper: true \}\)/g) ?? []).length, 1, 'menu: Go deeper')
})

test('the welcome and the priority system are untouched (trigger-specific change, not a global suppression)', () => {
  assert.match(code, /const priority: CuePriority = options\.automatic \? 'important' : 'user'/)
  assert.match(code, /const WELCOME_DELAY_MS = 1250/)
  assert.match(code, /introShown\.current = true/)
  assert.match(code, /classList\.contains\('jaye-intro-active'\)/, 'the welcome still waits for the cinematic intro')
  assert.match(code, /const AMBIENT_IDLE_MS = 22000/)
  assert.match(code, /const SPONTANEOUS_MIN_GAP_MS = 240000/)
  assert.match(code, /const DISMISS_MS: Record<CuePriority, number> = \{ ambient: 4500, important: AUTO_HIDE_MS, user: AUTO_HIDE_MS \}/)
})

test('the welcome never replaces something the visitor already asked for', () => {
  // In a browser on a fake clock: a tap or the menu inside the 1.25 s before the welcome used to be replaced by it.
  assert.match(code, /if \(priority === 'user'\) introShown\.current = true/, 'the menu, "Surprise me" and every answer the visitor asked for')
  assert.match(code, /if \(!options\.automatic\) introShown\.current = true/, 'a visitor request that is still being prepared')
  assert.match(code, /if \(introShown\.current\) \{ stopWatching\(\); return \}/, 'a welcome that is no longer needed stops watching and does nothing')
  assert.ok(code.indexOf("if (!options.automatic) introShown.current = true") < code.indexOf("const generic = brain.respond"), 'it is decided before any answer is built')
})

test('tap-to-explain: one delegated click listener, on section titles only, with every guard', () => {
  assert.equal((code.match(/document\.addEventListener\('click', onSectionTap\)/g) ?? []).length, 1)
  assert.equal((code.match(/document\.removeEventListener\('click', onSectionTap\)/g) ?? []).length, 1, 'removed on cleanup')
  const fn = code.slice(code.indexOf('function sectionForTap'), code.indexOf('function sectionForTap') + 1400)
  assert.match(fn, /event\.button !== 0 \|\| event\.detail !== 1 \|\| event\.defaultPrevented/, 'primary, first, unhandled click only (not scripted, keyboard or double)')
  assert.match(fn, /metaKey \|\| event\.ctrlKey \|\| event\.shiftKey \|\| event\.altKey/)
  assert.match(fn, /closest<HTMLElement>\(TAP_TITLE\)/, 'the section title is the target')
  assert.match(code, /const TAP_TITLE = 'h1, h2, h3\.archive-section-title'/, 'h1 and h2, plus the Archive reading sections’ own title, and no other heading')
  assert.match(fn, /target\.closest\(TAP_INTERACTIVE\)/, 'anything interactive is left to the page')
  assert.match(fn, /getComputedStyle\(target\)\.cursor === 'pointer'/, 'anything styled as clickable is left to the page')
  assert.match(fn, /selection\.isCollapsed/, 'the end of a text selection is not a tap')
  for (const guard of ['a[href]', 'button', 'input', 'select', 'textarea', 'summary', 'label', 'video', 'audio', 'canvas', 'iframe', '[role="button"]', '[role="link"]', '[contenteditable]', '[onclick]', '[data-strobi-ignore]', '#strobi-widget'])
    assert.ok(code.includes(guard), `TAP_INTERACTIVE covers ${guard}`)
  assert.match(code, /section\.id === lastTapId && event\.timeStamp - lastTapAt < 700/, 'one tap, one request')
  assert.match(code, /if \(manualHiddenRef\.current\) return\s*\n\s*const section = sectionForTap\(event\)/, 'hidden Baew ignores taps')
  assert.doesNotMatch(code.slice(code.indexOf('const onSectionTap'), code.indexOf('const onWheel')), /preventDefault|stopPropagation|stopImmediatePropagation/, 'never interferes with the page')
})

test('the shipped bundle carries the change (the page loads strobi-widget.js)', () => {
  // the minifier folds the two welcome calls (with and without a section) into one request
  assert.equal((bundle.match(/automatic:!0/g) ?? []).length, 1, 'only the welcome request is automatic')
  assert.match(bundle, /welcome:!0,automatic:!0/)
  assert.ok(bundle.includes('[tabindex]:not([tabindex="-1"])'), 'tap guard present in the bundle')
  assert.doesNotMatch(bundle, /,1400\)/, 'the old 1.4 s section timer is not in the bundle')
})
