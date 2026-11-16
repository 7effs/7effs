import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

// Guards for the Archive notebook layer in index.html: pages change with PREV / NEXT and nothing else (no swipe, turn or crumple),
// the reading content, section ids, links and the outer Archive stay exactly as they were, and the layer is self-contained and scoped.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const fixture = JSON.parse(readFileSync(new URL('./fixtures/archive-book-content.json', import.meta.url), 'utf8'))

const SECTIONS = Object.keys(fixture.sections)
const CHAPTERS = Object.keys(fixture.chapters)

function norm(h) {
  // an editorial mark is a plain inline span inside a sentence: it must not add a space to the text
  return h.replace(/<span class="jm-[a-z]+">([\s\S]*?)<\/span>/g, '$1').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ')
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

test('pages change at once: no turn, swipe, fold, rotation, fade or slide', () => {
  assert.doesNotMatch(script, /perspective\(|rotate[XYZ]?\(|translate[XYZ]?\(|requestAnimationFrame|\.animate\(|setImp|jb-sheet|jb-under|jb-twin|data-jb-turning/)
  assert.doesNotMatch(style, /@keyframes|perspective|rotate[XY]\(|will-change|jb-sheet|jb-under|jb-back|jb-twin|data-jb-turning|jb-abs/)
  assert.doesNotMatch(style.replace(/transition:none/g, ''), /transition\s*:/, 'the only transition declarations left switch transitions off')
  assert.match(script, /function go\(b,to,o\)[\s\S]*?apply\(b,to\);sync\(b\)/, 'go() applies the new page immediately')
})

test('input is only PREV / NEXT and the arrow keys, scoped and cleaned up', () => {
  assert.match(script, /new AbortController/)
  assert.match(script, /\.abort\(\)/)
  assert.match(script, /signal:sig/)
  assert.match(script, /jbook-prev/)
  assert.match(script, /jbook-next/)
  assert.match(script, /ArrowRight/)
  assert.doesNotMatch(script, /pointer(down|move|up|cancel)|touch(start|move|end)|\bwheel\b|contextmenu|setPointerCapture/, 'no swipe, drag, wheel or long-press handlers')
  assert.doesNotMatch(style, /touch-action:\s*(none|pan|pinch)/, 'scrolling and pinch-zoom are left entirely to the browser')
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

test('the paper crumple and its black backdrop are gone, not hidden', () => {
  assert.doesNotMatch(script, /crumpl|crHold|crDraw|crMesh|crBegin|crEnd|crWatch|jb-dark|is-dark|getContext|createElement\('canvas'\)|CanvasRenderingContext2D/i)
  assert.doesNotMatch(style, /crumpl|jb-dark|is-dark|#050506|jb-crumple|cursor:\s*grab/i)
  assert.doesNotMatch(html, /jb-crumple|class="jb-dark"/)
  assert.doesNotMatch(script, /three|gsap|WebGL/i)
})

test('the four oversized chapter display titles are removed, with their styles, and the rows keep ids and range labels', () => {
  assert.doesNotMatch(html, /archive-chapter-title/, 'no heading element or style with that class remains')
  for (const id of CHAPTERS) assert.match(block(id, 'div'), /archive-chapter-range/, `${id} keeps its page range`)
  // the ordinary card titles inside the pages are not display titles and stay
  assert.equal([...html.matchAll(/<h3 class="archive-section-title/g)].length, 8)
})

test('the existing blue highlight markers are byte-for-byte what they were', () => {
  const sha = t => createHash('sha256').update(t).digest('hex').slice(0, 12)
  const lines = style.split('\n').map(l => l.trim())
  for (const [prefix, hash] of [['--jb-hl:', '42cef035e518'], ['--jb-hl-beat:', '02a8271e66f3'], ['font-weight:400!important;color:var(--jb-ink)!important;padding:0 .12em', '533f6378fdb4'], ['background:var(--jb-hl) 0 56%', '709ed420f752']]) {
    const l = lines.find(x => x.startsWith(prefix))
    assert.ok(l, `${prefix} present`)
    assert.equal(sha(l), hash, `${prefix} unchanged`)
  }
  assert.ok(style.includes('background:var(--jb-hl-beat) 0 56%/100% 92% no-repeat!important}'))
  // the editorial marks never touch <strong>
  assert.doesNotMatch(selectorsOf(style).filter(s => /\.jm-/.test(s)).join('\n'), /strong/)
})

test('a few static editorial marks: plain classes, SVG backgrounds, no script, no animation, text unchanged', () => {
  const marks = [...html.matchAll(/class="[^"]*?\b(jm-(?:u|hl|s|o|x|m))\b/g)].map(m => m[1])
  assert.ok(marks.length >= 10 && marks.length <= 18, `a small number of marks (${marks.length})`)
  for (const k of ['jm-u', 'jm-hl', 'jm-s', 'jm-o', 'jm-x', 'jm-m']) assert.ok(marks.includes(k), `${k} is used`)
  const rules = selectorsOf(style).filter(s => /\.jm-/.test(s))
  assert.ok(rules.length >= 6)
  for (const r of rules) assert.match(r, /data-jbook/, 'marks only show on the notebook pages')
  const css = style.slice(style.indexOf('--jm-u:'))
  assert.doesNotMatch(css, /animation|transition|@keyframes|filter|backdrop|will-change/)
  assert.doesNotMatch(script, /jm-/, 'no script paints or moves a mark')
})

test('touch screens: long-press selection is blocked on archive reading text only, and text is never inflated', () => {
  const g = html.match(/<style id="jaye-archive-touch-guard-v1">([\s\S]*?)<\/style>/)?.[1] ?? ''
  assert.match(g, /@media\(hover:none\) and \(pointer:coarse\)\{/, 'coarse, hover-less pointers only')
  assert.match(g, /user-select:none!important/)
  assert.match(g, /-webkit-touch-callout:none/)
  assert.match(g, /:not\(input\):not\(textarea\):not\(\[contenteditable\]\)/, 'form fields keep their behaviour')
  for (const s of selectorsOf(g.replace(/\/\*[\s\S]*?\*\//g, ''))) assert.match(s, /archive-interface-(one|two)/, `only the two Archive interfaces: ${s.slice(0, 80)}`)
  assert.match(g, /text-size-adjust:100%/)
  assert.doesNotMatch(g, /\bbody\s*\{|\bhtml\s*\{|\*\s*\{/, 'never site-wide')
})
