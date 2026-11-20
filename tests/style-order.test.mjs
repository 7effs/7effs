import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Performance only. index.html is one 1.3 MB document that streams in. A style block that arrives after the
// content it styles makes the browser paint that content once without it and again with it, so the hero and the
// archive launcher jumped several times while loading on a slow link. Every page style therefore sits ahead of <main>.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const main = html.indexOf('<main>')

// The Archive layer keeps its own CSS beside its region (see ux-polish.test.mjs); it is scoped to the reading pages, which are not painted while loading.
const archiveLayer = ['jaye-ux-polish-v1', 'jaye-switch-main-only-v1', 'jaye-archive-touch-guard-v1', 'jaye-archive-book-v1']

test('every page style block comes before the first section; only the Archive layer\'s own CSS follows it', () => {
  assert.ok(main > 0, 'the page has a <main> element')
  const late = [...html.slice(main).matchAll(/<style\b[^>]*\sid="([^"]+)"/g)].map((m) => m[1])
  assert.deepEqual(late, archiveLayer, `style blocks after <main> must be exactly the Archive layer's; put new page CSS ahead of <main> so the first layout is the final one (found: ${late.join(', ')})`)
  assert.equal([...html.slice(main).matchAll(/<style\b/g)].length, archiveLayer.length, 'no unnamed style block follows <main> either')
})

test('the style blocks still have unique ids, so the cascade order is explicit', () => {
  const ids = [...html.matchAll(/<style\b[^>]*\sid="([^"]+)"/g)].map((m) => m[1])
  assert.ok(ids.length > 90, `found ${ids.length} identified style blocks`)
  assert.equal(new Set(ids).size, ids.length, 'no two style blocks share an id')
})
