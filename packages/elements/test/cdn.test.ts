// @vitest-environment happy-dom
/**
 * The CDN build as a page would load it: a classic script, run once, with
 * no bundler. Runs after `pnpm build`.
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

// (import.meta.url is not a file: URL under happy-dom; tests run from the repo root.)
const code = readFileSync(
  join(process.cwd(), 'packages/elements/dist/tabler-charts.min.js'),
  'utf8',
)

describe('CDN build', () => {
  test('registers <tabler-chart>, injects the styles and exposes TablerCharts', () => {
    // A classic script: top-level `var TablerCharts` becomes a global.
    const run = new Function(`${code}\nreturn TablerCharts`)
    const TablerCharts = run() as Record<string, unknown>
    expect(customElements.get('tabler-chart')).toBeDefined()
    const style = document.getElementById('tc-styles')
    expect(style?.textContent).toContain('.tc-chart')
    expect(document.head.firstElementChild).toBe(style)
    for (const name of ['Chart', 'line', 'bar', 'defineChartElement', 'chartToString']) {
      expect(TablerCharts[name], name).toBeDefined()
    }

    document.body.innerHTML = '<tabler-chart type="bar" width="300" height="150"></tabler-chart>'
    const el = document.body.firstElementChild as HTMLElement & { data: unknown }
    el.data = { labels: ['a', 'b'], series: [{ name: 'A', values: [1, 2] }] }
    ;(TablerCharts.flush as () => void)()
    expect(el.querySelectorAll('.tc-bar')).toHaveLength(2)
    // Running it again neither redefines the element nor duplicates the styles.
    run()
    expect(document.querySelectorAll('#tc-styles')).toHaveLength(1)
  })
})
