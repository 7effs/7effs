import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Guards for the Archive notebook (page-turn) layer in index.html: the reading content, section ids, links and the outer
// Archive stay exactly as they were, and the layer is self-contained, scoped and cleans up after itself.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const fixture = JSON.parse(readFileSync(new URL('./fixtures/archive-book-content.json', import.meta.url), 'utf8'))

const SECTIONS = Object.keys(fixture.sections)
const CHAPTERS = Object.keys(fixture.chapters)

function norm(h) {
  return h.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}
function block(id, tag) {
  // a chapter heading holds a nested <div>, so it ends at the </div> that is followed by its first section
  const end = tag === 'div' ? '<\\/div>\\s*(?=<section)' : `<\\/${tag}>`
  const m = html.match(new RegExp(`<${tag}\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)${end}`))
  assert.ok(m, `#${id} must exist`)
  return m[1]
}
// Selector lists of every rule (at-rule headers such as @media are skipped, their inner rules are included).
function selectorsOf(css) {
  const out = []
  let start = 0
  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (c === '{') {
      const prelude = css.slice(start, i).trim()
      if (prelude && !prelude.startsWith('@')) out.push(prelude)
      start = i + 1
    } else if (c === '}' || c === ';') start = i + 1
  }
  return out
}
const style = html.match(/<style id="jaye-archive-book-v1">([\s\S]*?)<\/style>/)?.[1] ?? ''
const script = html.match(/<script id="jaye-archive-book-script-v1">([\s\S]*?)<\/script>/)?.[1] ?? ''

test('every numbered section keeps its id, text and links', () => {
  for (const id of SECTIONS) {
    assert.equal((html.match(new RegExp(`\\sid="${id}"`, 'g')) ?? []).length, 1, `${id} appears exactly once`)
    assert.equal(norm(block(id, 'section')), fixture.sections[id], `${id} text unchanged`)
    assert.deepEqual([...block(id, 'section').matchAll(/href="([^"]+)"/g)].map(m => m[1]), fixture.links[id], `${id} links unchanged`)
  }
})

test('chapter headings keep their ids and text', () => {
  for (const id of CHAPTERS) {
    assert.equal((html.match(new RegExp(`\\sid="${id}"`, 'g')) ?? []).length, 1)
    assert.equal(norm(block(id, 'div')), fixture.chapters[id])
  }
})

test('the page layer adds no dependency and no network access', () => {
  assert.ok(script.length > 1000, 'script is present')
  assert.equal((html.match(/<script[^>]+\ssrc=/g) ?? []).length, fixture.scriptSrc, 'no new external script')
  assert.doesNotMatch(script.replaceAll('http://www.w3.org/2000/svg', ''), /\bimport\s*\(|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|https?:\/\//, 'only the SVG namespace appears in the inline drawings')
  assert.doesNotMatch(style.replaceAll('http://www.w3.org/2000/svg', ''), /@import|https?:\/\//, 'only the SVG namespace appears in inline data URIs')
})

test('the layer is wired to both collections and all eight sections', () => {
  for (const id of ['archive-interface-one', 'archive-interface-two', ...SECTIONS, ...CHAPTERS]) assert.ok(script.includes(`'${id}'`), `${id} referenced`)
  assert.match(script, /data-archive-view/, 'follows the router view')
})

test('the outer Archive is never styled by the layer', () => {
  const selectors = selectorsOf(style)
  assert.ok(selectors.length > 20)
  for (const s of selectors) {
    assert.match(s, /data-jbook/, `scoped to an enhanced collection: ${s.slice(0, 80)}`)
    for (const outer of ['archiveInterfaces', 'archive-launch', 'archive-interface-nav', 'archive-view-home-link', 'archive-interface-heading', 'archive-interface-brand', 'demi', 'strobi'])
      assert.ok(!s.includes(outer), `${outer} untouched by: ${s.slice(0, 80)}`)
  }
})

test('pages turn with CSS 3D, not a slide or fade', () => {
  assert.match(script, /perspective\(/)
  assert.match(script, /rotateY\(/)
  assert.doesNotMatch(script, /translateX\(\s*-?\d+(\.\d+)?%/, 'no percentage slide')
})

test('input is scoped, cancellable and cleaned up', () => {
  assert.match(script, /new AbortController/)
  assert.match(script, /\.abort\(\)/)
  assert.match(script, /signal:sig/)
  assert.match(script, /pointercancel/)
  assert.match(script, /prefers-reduced-motion/)
  assert.match(style, /touch-action:pan-y pinch-zoom/, 'vertical scrolling and pinch-zoom stay with the browser')
  assert.doesNotMatch(style, /touch-action:\s*none/)
})

test('without the script the original layout is untouched (every rule needs [data-jbook])', () => {
  const unscoped = selectorsOf(style).filter(s => !/data-jbook/.test(s))
  assert.deepEqual(unscoped, [])
})

test('the background switch belongs to the main page only (hidden inside both Archive collections)', () => {
  const sw = html.match(/<style id="jaye-switch-main-only-v1">([\s\S]*?)<\/style>/)?.[1] ?? ''
  assert.match(sw, /body\[data-archive-view="interface-one"\] #jaye-background-switch/)
  assert.match(sw, /body\[data-archive-view="interface-two"\] #jaye-background-switch/)
  assert.match(sw, /display:none!important/)
  assert.doesNotMatch(sw, /data-archive-view="home"/, 'the main page keeps its switch')
})

// The ink drawings are original, decorative and self-contained: no text, no scripts, no external or embedded images.
const artSrc = script.match(/var ART=\{([\s\S]*?)\};\n/)?.[1] ?? ''
const pieces = [...artSrc.matchAll(/(\w+):'(<svg[\s\S]*?<\/svg>)'/g)].map(m => ({ name: m[1], svg: m[2] }))

test('the page art is a small set of original decorative drawings', () => {
  assert.equal(pieces.length, 9, 'one drawing per page')
  for (const { name, svg } of pieces) {
    assert.doesNotMatch(svg.replaceAll('http://www.w3.org/2000/svg', ''), /<text|<script|<image|<use|foreignObject|href=|https?:\/\/|<style|on\w+=/i, name)
  }
  assert.ok(artSrc.length < 140 * 1024, 'the drawings stay light (' + artSrc.length + ' bytes)')
  assert.match(script, /className='jb-art is-off'/)
  assert.match(script, /setAttribute\('aria-hidden','true'\)/, 'the drawing is hidden from assistive technology')
})

test('the paper crumple is dependency-free, opt-in by press-and-hold and removes itself', () => {
  assert.doesNotMatch(script, /three|gsap|WebGL|getContext\('webgl/i)
  assert.match(script, /getContext\('2d'\)/)
  assert.match(script, /function crHold[\s\S]*?reduced\(\)/, 'not used with reduced motion')
  assert.match(script, /function crEnd[\s\S]*?canvas\.remove\(\)/, 'the canvas is removed when it is done')
  assert.match(script, /function crWatch/, 'slow frames lower the detail')
  assert.match(script, /crCancel\(true\);\s*var from=b\.idx/, 'a page turn clears any crumple first')
})

test('while a drawing is crumpled the page behind it goes black and the sheet is filled with paper', () => {
  assert.match(script, /className='jb-dark'/, 'a black backdrop element exists for each page')
  assert.match(style, /\.jb-art\.is-dark~\.jb-dark\{opacity:1/)
  assert.match(style, /\.jb-dark\{[^}]*background:#050506!important/)
  assert.match(script, /classList\.add\('is-crumpling','is-dark'\)/)
  assert.match(script, /function crSettle[\s\S]*?classList\.remove\('is-dark'\)/, 'the page returns as soon as the sheet starts to open')
  assert.match(script, /fillStyle=paper/, 'the folded sheet is paper, not just ink')
})
