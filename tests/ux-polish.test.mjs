import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Guards for the small UI/UX pass: touch-height and reduced-motion fixes only, scoped so mouse layouts and the design stay as they were.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = html.match(/<style id="jaye-ux-polish-v1">([\s\S]*?)<\/style>/)?.[1].replace(/\/\*[\s\S]*?\*\//g, '') ?? ''

test('touch targets reach 44px on touch screens only', () => {
  const m = css.match(/@media \(pointer:coarse\)\{([\s\S]*?)\}\s*(?=@media|$)/)
  assert.ok(m, 'a coarse-pointer media query')
  assert.match(m[1], /min-height:44px/)
  for (const sel of ['.node-ai-chip', '#nodeAINewWhisper', '#nodeAICopyChat', '#nodeAIClearChat', '#nodeAIMode', '#ja-language-14', '#ja-anomaly-export', '#ja-anomaly-next', '#ja-anomaly-answer', '.ja-btn']) assert.ok(m[1].includes(sel), sel)
  assert.doesNotMatch(css.replace(m[0], ''), /min-height/, 'nothing outside the touch query changes sizes')
  assert.doesNotMatch(css, /transform|scale\(|position|width\s*:/, 'no layout or look changes beyond the height floor')
})

test('reduced motion also stops the Deviation butterfly idle animation', () => {
  const m = css.match(/@media \(prefers-reduced-motion:reduce\)\{([\s\S]*?)\}\s*$/)
  assert.ok(m)
  assert.match(m[1], /\.demi-butterfly-stage/)
  assert.match(m[1], /demi-butterfly-label/)
  assert.match(m[1], /#demiDestination \.demi-butterfly-stage::after/, 'the ring that turns around it')
  assert.match(m[1], /animation:none!important/)
})

test('the block sits just before the Archive layer, which regenerates its own region, and is added once', () => {
  assert.equal((html.match(/id="jaye-ux-polish-v1"/g) ?? []).length, 1)
  const start = html.indexOf('<style id="jaye-ux-polish-v1">')
  assert.match(html.slice(start).replace(/^[\s\S]*?<\/style>\n/, ''), /^<!-- jbook:start -->/, 'directly before the notebook region')
  // the only styles that follow belong to the Archive layer (scoped to its own selectors), so they never undo these rules
  assert.deepEqual([...html.slice(start).matchAll(/<style id="([^"]+)"/g)].map(m => m[1]), ['jaye-ux-polish-v1', 'jaye-switch-main-only-v1', 'jaye-archive-touch-guard-v1', 'jaye-archive-book-v1'])
})
