import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const style = html.match(/<style id="jaye-type-assault-v1">([\s\S]*?)<\/style>/)?.[1] ?? ''
const markupStart = html.indexOf('<div class="jaye-type-assault"')
const markupEnd = html.indexOf('</div>', markupStart)
const markup = markupStart >= 0 ? html.slice(markupStart, html.indexOf('<span class="jaye-v5-blade"', markupStart)) : ''

test('type assault is a decorative layer inside the protected entrance sequence', () => {
  assert.ok(markupStart > 0, 'the type layer exists')
  assert.ok(markup.includes('aria-hidden="true"'))
  assert.ok(html.indexOf('class="jaye-v5-hi-core"') < markupStart, 'the original Hi scene remains before it')
  assert.ok(html.indexOf('class="jaye-v5-wordmark"') > markupStart, 'the original JAYE wordmark remains after it')
  for (const word of ['MEMORY', 'ART', 'FRAGMENTS', 'BECOMING', 'WORDS', 'REMAIN', 'UNFINISHED', 'NOT FIXED'])
    assert.ok(markup.includes(word), `missing ${word}`)
})

test('the palette uses warm paper, ink, restrained red and a deliberate navy accent', () => {
  assert.ok(style, 'the new scoped style block exists')
  assert.match(style, /--jta-paper:#EEECE3/)
  assert.match(style, /--jta-ink:#080A0D/)
  assert.match(style, /--jta-navy:#18344F/)
  assert.match(style, /--jta-red:#D94A35/)
  assert.match(style, /\.jaye-v5-wipe--ivory\{background:#18344F!important\}/)
})

test('word collisions begin after Hi and clear before the existing JAYE transition', () => {
  for (const [selector, delay] of [
    ['.jaye-type-assault__paper', '2.34s'],
    ['.jaye-type-assault__memory', '2.44s'],
    ['.jaye-type-assault__art', '2.72s'],
    ['.jaye-type-assault__fragments', '3.04s'],
    ['.jaye-type-assault__of', '3.31s'],
    ['.jaye-type-assault__becoming', '3.72s'],
    ['.jaye-type-assault__words', '4.66s'],
    ['.jaye-type-assault__remain', '4.98s'],
    ['.jaye-type-assault__stamp', '5.98s'],
    ['.jaye-type-assault__slash', '6.32s'],
  ]) {
    const i = style.indexOf(selector)
    assert.ok(i >= 0, selector)
    assert.ok(style.slice(i, i + 240).includes(delay), `${selector} starts at ${delay}`)
  }
  assert.match(style, /\.jaye-type-assault\{\s*animation:jtaFieldExit \.28s ease 6\.58s both/)
  assert.match(style, /\.jaye-v5-wipe--ivory\{background:#18344F!important\}/)
})

test('mobile and reduced-motion fallbacks are defined', () => {
  assert.match(style, /@media\(max-width:600px\)/)
  assert.match(style, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(style, /\.jaye-type-assault\{display:none!important\}/)
})
