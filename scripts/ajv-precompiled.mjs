import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// Performance only. @bible-strong/avatar-core compiles a JSON-schema validator with ajv at module load, so every page
// load pays for ajv's compiler (about 120 KB of the Baew bundle) and for compiling the avatar schema and ajv's own
// meta-schema on the main thread, to validate a definition that never changes. This plugin generates the very same
// validator at build time (ajv's standalone code generation, same schema, same options) and answers the library's
// `new Ajv({ allErrors: true, strict: true }).compile(schema)` with it. Validation still happens, with the same results
// and error shapes; only the compiling moves to the build.
//
// It is switched on only for the library and ajv versions it was checked against. Anything else falls back to the real
// ajv, so upgrading either package can never silently ship a validator for a different schema.
const VERIFIED = [
  ['@bible-strong/avatar-core', '@bible-strong/avatar-core/schema', '0.1.0'],
  ['ajv', 'ajv/dist/2020.js', '8.20.0'],
]
const ID = 'ajv/dist/2020.js'
const VIRTUAL = '\0ajv-precompiled-avatar-validator'

export function precompiledValidatorModule(root = process.cwd()) {
  const require = createRequire(join(root, 'package.json'))
  const Ajv2020 = require('ajv/dist/2020.js').default
  const standalone = require('ajv/dist/standalone').default
  const schema = JSON.parse(readFileSync(require.resolve('@bible-strong/avatar-core/schema'), 'utf8'))
  const ajv = new Ajv2020({ allErrors: true, strict: true, code: { source: true, esm: true } })
  const validate = ajv.compile(schema)
  const source = standalone(ajv, validate)
  const head = /^"use strict";export const validate = (\w+);export default \1;/.exec(source)
  if (!head) throw new Error('ajv-precompiled: unexpected standalone output')
  const body = source
    .slice(head[0].length)
    .replace(/require\("ajv\/dist\/runtime\/(\w+)"\)\.default/g, (_, name) => `__fn(__rt_${name})`)
  return [
    'import __rt_equal from "ajv/dist/runtime/equal.js"',
    'import __rt_ucs2length from "ajv/dist/runtime/ucs2length.js"',
    'const __fn = (m) => (typeof m === "function" ? m : m.default)',
    body,
    `export default class Ajv { compile() { return ${head[1]} } }`,
  ].join('\n')
}

export function ajvPrecompiled(root = process.cwd()) {
  const require = createRequire(join(root, 'package.json'))
  // walk up from a file the package does export to its own package.json (some packages do not export it)
  const versionOf = (pkg, entry) => {
    for (let dir = dirname(require.resolve(entry)); dir !== dirname(dir); dir = dirname(dir)) {
      const file = join(dir, 'package.json')
      if (!existsSync(file)) continue
      const json = JSON.parse(readFileSync(file, 'utf8'))
      if (json.name === pkg) return json.version
    }
    return 'unknown'
  }
  return {
    name: 'ajv-precompiled-avatar-validator',
    enforce: 'pre',
    apply: 'build',
    resolveId(id) {
      if (id !== ID) return null
      for (const [pkg, entry, want] of VERIFIED) {
        const have = versionOf(pkg, entry)
        if (have !== want) {
          this.warn(`ajv-precompiled: ${pkg}@${have} is not the verified ${want}; bundling the real ajv instead`)
          return null
        }
      }
      return VIRTUAL
    },
    load(id) {
      return id === VIRTUAL ? precompiledValidatorModule(root) : null
    },
  }
}
