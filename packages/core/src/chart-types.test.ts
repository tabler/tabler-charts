/**
 * Every built-in chart type is registered by hand in several lists: its entry
 * point, the build entries, the size budgets and the framework adapters. This
 * test walks `types` and names what a type is missing, so a new type cannot
 * be half added.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { types } from './chart-types.ts'
import * as everything from './index.ts'

const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')
const tsdown = read('packages/core/tsdown.config.ts')
const pkg = JSON.parse(read('packages/core/package.json')) as { sideEffects: string[] }
const bundles = read('scripts/bundles.mjs')
const budgets = read('bundlewatch.config.cjs')
const adapters = {
  react: read('packages/react/src/index.ts'),
  vue: read('packages/vue/src/index.ts'),
}

/** Types that come with another type's entry point, by the name of that entry. */
const SHARED_ENTRY: Readonly<Record<string, string>> = { donut: 'pie' }

/** The name each type is exported under (`percentageBar` for `percentage-bar`). */
const exportName = (name: string): string => {
  const found = Object.entries(everything).find(([, value]) => value === types[name])
  return found?.[0] ?? `(no export of ${name})`
}

describe.each(Object.keys(types))('built-in chart type %s', (name) => {
  const entry = SHARED_ENTRY[name] ?? name
  const ident = exportName(name)

  test('is exported from @tabler/charts', () => {
    expect(ident).not.toMatch(/^\(no export/)
  })

  test(`has its entry point, @tabler/charts/${entry}`, async () => {
    const module = (await import(`./${entry}.ts`)) as Record<string, unknown>
    expect(module[ident]).toBe(types[name])
    expect(tsdown).toContain(`'src/${entry}.ts'`)
  })

  test('an entry that registers a feature is listed as having side effects', () => {
    const source = readFileSync(new URL(`./${entry}.ts`, import.meta.url), 'utf8')
    if (!source.includes('register(')) return
    expect(pkg.sideEffects).toEqual(
      expect.arrayContaining([`./src/${entry}.ts`, `./dist/${entry}.js`, `./dist/${entry}.cjs`]),
    )
  })

  test.skipIf(name in SHARED_ENTRY)('has a size budget of its own', () => {
    expect(bundles).toContain(`export { ${ident} } from '\${DIST}${entry}.js'`)
    expect(budgets).toContain(`'.size/core-${entry}.js'`)
  })

  test.each(Object.keys(adapters))('has a component in the %s adapter', (adapter) => {
    const source = adapters[adapter as keyof typeof adapters]
    expect(source).toMatch(new RegExp(`chartComponent\\(\\s*${ident},\\s*'\\w+'`))
  })
})
