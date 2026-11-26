// @vitest-environment happy-dom
/**
 * Optional features are registered twice: by their own entry point
 * (`@tabler/charts/time` …) and again by `@tabler/charts`, which must keep
 * the registration in its own file so no bundler shakes it away. These tests
 * keep the two in step, check that a missing feature names an import that
 * provides it, and that rendering never writes to the registry.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import type { Features } from './features.ts'

const SRC = import.meta.dirname
const source = (path: string) => readFileSync(join(SRC, path), 'utf8')

/** The entry points that register features, from the build entries. */
const ENTRIES = [...source('../tsdown.config.ts').matchAll(/'src\/([\w-]+)\.ts'/g)]
  .map((m) => m[1] as string)
  .filter((name) => /\b(register|addPost)\(/.test(source(`./${name}.ts`)))
  // The default entry is what is checked; the saver is left out of it on purpose.
  .filter((name) => name !== 'index' && name !== 'export')

/** The features, as names: functions from separate module graphs compare by name. */
const shape = (value: unknown): unknown =>
  typeof value === 'function'
    ? `fn ${value.name}`
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]))
      : value

/** What `imports` register, each time in a fresh module graph. */
async function registered(...imports: string[]): Promise<{ features: Features }> {
  vi.resetModules()
  for (const path of imports) await import(/* @vite-ignore */ path)
  return import('./features.ts')
}

describe('feature registry', () => {
  test('finds the entry points that register features', () => {
    expect(ENTRIES).toEqual(expect.arrayContaining(['time', 'log', 'line', 'candlestick']))
  })

  test('@tabler/charts registers what its entry points register, nothing more', async () => {
    const { features: all } = await registered('./index.ts')
    const { features: each } = await registered(...ENTRIES.map((name) => `./${name}.ts`))
    // The post steps compose into one function: compare that both have them.
    const { post: allPost, ...allRest } = all
    const { post: eachPost, ...eachRest } = each
    expect(shape(allRest)).toEqual(shape(eachRest))
    expect(Boolean(allPost)).toBe(Boolean(eachPost))
  })

  test('a missing feature names an entry point that registers it', async () => {
    const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' }).filter(
      (file) => file.endsWith('.ts') && !file.endsWith('.test.ts'),
    )
    const asked = new Set(
      files.flatMap((file) =>
        [...source(file).matchAll(/\bfeature\('([\w-]+)'\)/g)].map((m) => m[1] as keyof Features),
      ),
    )
    expect(asked.size).toBeGreaterThan(5)
    for (const name of asked) {
      const { feature } = (await registered()) as unknown as {
        feature: (name: keyof Features) => unknown
      }
      let hint = ''
      try {
        feature(name)
      } catch (error) {
        hint = (error as Error).message.match(/"@tabler\/charts\/([\w-]+)"/)?.[1] ?? ''
      }
      const { features } = await registered(`./${hint}.ts`)
      expect(features[name], `${name} from @tabler/charts/${hint}`).toBeDefined()
    }
  })

  test('rendering leaves the registry alone; a chart in the page installs the sweep', async () => {
    const { features } = await registered()
    const { chartToString, Chart } = await import('./core.ts')
    const { pie, donut } = await import('./charts/pie.ts')
    const { gauge } = await import('./charts/gauge.ts')
    const size = { width: 200, height: 200 }
    const data = [{ name: 'A', value: 1 }]
    for (const type of [pie, donut]) chartToString({ type, data }, size)
    chartToString({ type: gauge, data: 40 }, size)
    expect(features.sweep).toBeUndefined()

    const el = document.createElement('div')
    document.body.append(el)
    const chart = new Chart(el, { type: pie, data, ...size })
    expect(features.sweep).toBe(pie.sweep)
    chart.destroy()
    el.remove()
  })
})
