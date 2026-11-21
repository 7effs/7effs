import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const style = html.match(/<style id="jaye-type-assault-v1">([\s\S]*?)<\/style>/)?.[1] ?? ''
const markupStart = html.indexOf('<div class="jaye-type-assault"')
const bladeAt = html.indexOf('<span class="jaye-v5-blade"', markupStart)
const markup = markupStart >= 0 && bladeAt > markupStart ? html.slice(markupStart, bladeAt) : ''

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
  for (const [animation, delay] of [
    ['jtaPaperHit .58s', '2.34s'],
    ['jtaSlamLeft .76s', '2.44s'],
    ['jtaArtHit .72s', '2.72s'],
    ['jtaSlamLeft .78s', '3.04s'],
    ['jtaStamp .5s', '3.31s'],
    ['jtaSlamRight .82s', '3.72s'],
    ['jtaArtHit .7s', '4.66s'],
    ['jtaSlamUp .78s', '4.98s'],
    ['jtaNotFixed .48s', '5.98s'],
    ['jtaSlash .34s', '6.32s'],
  ]) {
    const i = style.indexOf(`animation:${animation}`)
    assert.ok(i >= 0, animation)
    assert.ok(style.slice(i, i + 140).includes(delay), `${animation} starts at ${delay}`)
  }
  assert.match(style, /\.jaye-type-assault\{\s*animation:jtaFieldExit \.28s ease 6\.58s both/)
  assert.match(style, /\.jaye-v5-wipe--ivory\{background:#18344F!important\}/)
})

test('mobile and reduced-motion fallbacks are defined', () => {
  assert.match(style, /@media\(max-width:600px\)/)
  assert.match(style, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(style, /\.jaye-type-assault\{display:none!important\}/)
})


const v2Style = html.match(/<style id="jaye-entry-brutalist-v2">([\s\S]*?)<\/style>/)?.[1] ?? ''

test('the print-impact upgrade keeps every mobile word inside the viewport', () => {
  assert.ok(v2Style, 'the v2 entrance style exists')
  assert.match(v2Style, /\.jaye-type-assault__memory\{left:4%;right:4%;/)
  assert.match(v2Style, /\.jaye-type-assault__fragments\{left:4%;right:4%;/)
  assert.match(v2Style, /#jaye-intro-v1 \.jaye-type-assault__remain\{left:4%;right:4%;/)
  assert.match(v2Style, /@media\(max-width:600px\)/)
  assert.match(v2Style, /jtaTypeImpactV2/)
})

test('the JAYE reveal resolves as a hard paper plate with mechanical letter impacts', () => {
  assert.match(v2Style, /background:var\(--jta-paper\);/)
  assert.match(v2Style, /\.jaye-v5-final-stage\{--jta-paper:#EEECE3;--jta-ink:#080A0D;--jta-navy:#18344F;--jta-red:#D94A35;/)
  assert.match(v2Style, /box-shadow:10px 10px 0 var\(--jta-red\)/)
  for (const name of ['jtaFinalJV2','jtaFinalAV2','jtaFinalYV2','jtaFinalEV2'])
    assert.ok(v2Style.includes(name))
  assert.match(v2Style, /jaye-v5-wordmark>span:nth-child\(1\)[\s\S]*?7\.98s/)
  assert.match(v2Style, /@media\(prefers-reduced-motion:reduce\)/)
  assert.doesNotMatch(v2Style, /@import|https?:\/\/|<script/)
})
