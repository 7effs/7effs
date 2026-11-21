import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { precompiledValidatorModule } from '../scripts/ajv-precompiled.mjs'

// Performance only. The avatar library compiles an ajv validator at module load; the widget build ships the same
// validator compiled ahead of time. These prove it is the same validator: same verdicts, same errors.
const root = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(new URL('../package.json', import.meta.url))
const Ajv2020 = require('ajv/dist/2020.js').default
const schema = JSON.parse(readFileSync(require.resolve('@bible-strong/avatar-core/schema'), 'utf8'))
const definition = JSON.parse(readFileSync(new URL('../strobi.avatar.json', import.meta.url), 'utf8'))
const bundle = readFileSync(new URL('../strobi-widget.js', import.meta.url), 'utf8')

const real = new Ajv2020({ allErrors: true, strict: true }).compile(schema)

async function precompiled() {
  const dir = new URL('../node_modules/.cache/avatar-validator-test/', import.meta.url)
  mkdirSync(dir, { recursive: true })
  const file = new URL('validator.mjs', dir)
  writeFileSync(file, precompiledValidatorModule(root))
  try {
    const { default: Ajv } = await import(pathToFileURL(fileURLToPath(file)).href)
    return new Ajv({ allErrors: true, strict: true }).compile(schema)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// small seeded generator so the test is the same on every run
function rng(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296 }
const clone = (value) => JSON.parse(JSON.stringify(value))
const keyPaths = (value, prefix = []) => Object.entries(value ?? {}).flatMap(([key, child]) => [[...prefix, key], ...(child && typeof child === 'object' ? keyPaths(child, [...prefix, key]) : [])])
const at = (value, path) => path.reduce((node, key) => (node === null || typeof node !== 'object' ? undefined : node[key]), value)

function mutate(random, paths, base = definition) {
  const copy = clone(base)
  const pick = (list) => list[Math.floor(random() * list.length)]
  for (let i = 0, n = 1 + Math.floor(random() * 3); i < n; i++) {
    const path = pick(paths)
    const parent = at(copy, path.slice(0, -1))
    const key = path[path.length - 1]
    if (parent === null || typeof parent !== 'object' || !(key in parent)) continue
    const value = parent[key]
    switch (Math.floor(random() * 9)) {
      case 0: delete parent[key]; break
      case 1: parent[key] = typeof value === 'number' ? String(value) : typeof value === 'string' ? 7 : Array.isArray(value) ? {} : []; break
      case 2: parent[key] = typeof value === 'number' ? -value - 1 : typeof value === 'string' ? `${value}${'x'.repeat(300)}` : value; break
      case 3: parent.zz_extra = 1; break
      case 4: parent[key] = null; break
      case 5: parent[key] = typeof value === 'number' ? value * 1000 : typeof value === 'string' ? '' : value; break
      case 6: parent[key] = typeof value === 'string' ? '#zzzzzz' : value; break
      case 7: parent[key] = typeof value === 'number' ? 0.5 : value; break
      default: parent[key] = typeof value === 'boolean' ? !value : value
    }
  }
  return copy
}

test('the shipped avatar definition is valid, and the precompiled validator agrees', async () => {
  const pre = await precompiled()
  assert.equal(real(definition), true)
  assert.equal(pre(definition), true)
})

test('precompiled and real validators agree on every verdict and every error across 2,000 mutated definitions', async () => {
  const pre = await precompiled()
  const random = rng(42)
  const paths = keyPaths(definition)
  let valid = 0
  let invalid = 0
  for (let i = 0; i < 2000; i++) {
    const candidate = mutate(random, paths)
    const verdict = real(candidate)
    const errors = JSON.stringify(real.errors)
    assert.equal(pre(candidate), verdict, `verdict differs for mutation ${i}`)
    assert.equal(JSON.stringify(pre.errors), errors, `errors differ for mutation ${i}`)
    verdict ? valid++ : invalid++
  }
  assert.ok(valid > 100 && invalid > 100, `the fuzz covers both outcomes (valid ${valid}, invalid ${invalid})`)
})

// The shipped definition has no nodes, so on its own it never reaches the node rules (allOf, prefixItems, maxItems,
// minItems and the nodeSurface enum). These run the same comparison on definitions that do.
const node = (type, position, rotation) => ({ surface: { type, width: 40, height: 30, depth: 20, roundness: 0.5 }, position, rotation })
const withNodes = (() => {
  const copy = clone(definition)
  copy.body.nodes = [node('cube', [10, -5, 0], [0, 45, 90]), node('capsule', [-12, 8, 3], [10, 20, 30]), node('cone', [0, 0, 15], [-90, 0, 180])]
  return copy
})()

test('node-bearing definitions: the same verdict and the same errors on targeted cases', async () => {
  const pre = await precompiled()
  assert.equal(real(withNodes), true, 'the node-bearing base definition is valid')
  const edit = (fn) => { const copy = clone(withNodes); fn(copy.body.nodes); return copy }
  const cases = {
    'seventeen nodes': edit((n) => { while (n.length < 17) n.push(node('cube', [0, 0, 0], [0, 0, 0])) }),
    'sixteen nodes': edit((n) => { while (n.length < 16) n.push(node('cube', [0, 0, 0], [0, 0, 0])) }),
    'node type outside the node list (mickey)': edit((n) => { n[0].surface.type = 'mickey' }),
    'node type outside every list': edit((n) => { n[1].surface.type = 'torus' }),
    'node without a rotation': edit((n) => { delete n[0].rotation }),
    'node without a position': edit((n) => { delete n[2].position }),
    'node with an extra key': edit((n) => { n[0].zz_extra = 1 }),
    'two-number position': edit((n) => { n[0].position = [1, 2] }),
    'four-number position': edit((n) => { n[0].position = [1, 2, 3, 4] }),
    'string in a position': edit((n) => { n[0].position = [1, '2', 3] }),
    'rotation past 360': edit((n) => { n[0].rotation = [0, 361, 0] }),
    'rotation below -360': edit((n) => { n[1].rotation = [-361, 0, 0] }),
    'rotation exactly at the limits': edit((n) => { n[1].rotation = [-360, 360, 0] }),
    'null node': edit((n) => { n[1] = null }),
    'no nodes at all': edit((n) => { n.length = 0 }),
    'node surface without a width': edit((n) => { delete n[0].surface.width }),
    'node surface roundness above 1': edit((n) => { n[0].surface.roundness = 1.5 }),
    'node surface with an optional roundness': edit((n) => { n[0].surface.morphRoundness = 0.25 }),
  }
  const record = []
  for (const [name, candidate] of Object.entries(cases)) {
    const verdict = real(candidate)
    assert.equal(pre(candidate), verdict, `verdict differs: ${name}`)
    assert.equal(JSON.stringify(pre.errors), JSON.stringify(real.errors), `errors differ: ${name}`)
    record.push(verdict)
  }
  assert.ok(record.includes(true) && record.includes(false), 'the targeted cases cover both outcomes')
})

test('node-bearing definitions: 2,000 mutations give the same verdicts and errors', async () => {
  const pre = await precompiled()
  const random = rng(7)
  const paths = keyPaths(withNodes)
  assert.ok(paths.some((path) => path.includes('nodes') && path.includes('rotation')), 'the fuzz reaches node fields')
  let valid = 0
  let invalid = 0
  for (let i = 0; i < 2000; i++) {
    const candidate = mutate(random, paths, withNodes)
    const verdict = real(candidate)
    const errors = JSON.stringify(real.errors)
    assert.equal(pre(candidate), verdict, `verdict differs for mutation ${i}`)
    assert.equal(JSON.stringify(pre.errors), errors, `errors differ for mutation ${i}`)
    verdict ? valid++ : invalid++
  }
  assert.ok(valid > 100 && invalid > 100, `the fuzz covers both outcomes (valid ${valid}, invalid ${invalid})`)
})

test('the plugin answers the library’s own ajv import and no other module’s', async () => {
  const { ajvPrecompiled } = await import('../scripts/ajv-precompiled.mjs')
  const plugin = ajvPrecompiled(root)
  const warnings = []
  const context = { warn: (message) => warnings.push(message) }
  const library = fileURLToPath(new URL('index.js', pathToFileURL(require.resolve('@bible-strong/avatar-core/schema'))))
  assert.equal(plugin.resolveId.call(context, 'ajv/dist/2020.js', library), '\0ajv-precompiled-avatar-validator', 'the library gets the precompiled validator')
  assert.equal(plugin.resolveId.call(context, 'ajv/dist/2020.js', `${library}?v=1`), '\0ajv-precompiled-avatar-validator', 'a query string on the importer changes nothing')
  assert.equal(plugin.resolveId.call(context, 'ajv/dist/2020.js', fileURLToPath(new URL('../src/widget.tsx', import.meta.url))), null, 'the widget’s own source keeps the real ajv')
  assert.equal(plugin.resolveId.call(context, 'ajv/dist/2020.js', require.resolve('ajv/dist/2020.js')), null, 'ajv importing itself is left alone')
  assert.equal(plugin.resolveId.call(context, 'ajv/dist/2020.js', undefined), null, 'an import with no importer is left alone')
  assert.equal(plugin.resolveId.call(context, 'ajv', library), null, 'only the exact 2020 entry is answered')
  assert.deepEqual(warnings, [])
})

test('the shipped Baew bundle carries the precompiled validator, not ajv’s compiler', () => {
  for (const marker of ["can't resolve reference", 'strict mode', 'unknown keyword', 'schema is invalid'])
    assert.ok(!bundle.includes(marker), `ajv compiler text "${marker}" is not in the bundle`)
  assert.ok(bundle.includes('Invalid avatar definition'), 'the library still validates and still rejects an invalid definition')
})

test('the plugin only applies to the library and ajv versions it was checked against', () => {
  const source = readFileSync(new URL('../scripts/ajv-precompiled.mjs', import.meta.url), 'utf8')
  const wanted = Object.fromEntries([...source.matchAll(/\['([^']+)', '[^']+', '([\d.]+)'\]/g)].map((m) => [m[1], m[2]]))
  const installed = (pkg, entry) => {
    let dir = require.resolve(entry)
    for (;;) {
      dir = fileURLToPath(new URL('..', pathToFileURL(dir)))
      try {
        const json = JSON.parse(readFileSync(`${dir}package.json`, 'utf8'))
        if (json.name === pkg) return json.version
      } catch { /* keep walking up */ }
    }
  }
  assert.equal(installed('@bible-strong/avatar-core', '@bible-strong/avatar-core/schema'), wanted['@bible-strong/avatar-core'])
  assert.equal(installed('ajv', 'ajv/dist/2020.js'), wanted.ajv)
})
