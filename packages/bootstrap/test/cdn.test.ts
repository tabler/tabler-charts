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
  join(process.cwd(), 'packages/bootstrap/dist/tabler-charts-bootstrap.min.js'),
  'utf8',
)

describe('Bootstrap CDN build', () => {
  test('injects the styles with the mapping and initializes [data-tc-chart]', () => {
    document.body.innerHTML = `<div id="x" data-tc-chart="bar" data-tc-width="300" data-tc-data='${JSON.stringify(
      { labels: ['a', 'b'], series: [{ name: 'A', values: [1, 2] }] },
    )}'></div>`
    // A classic script: top-level `var TablerCharts` becomes a global.
    const run = new Function(`${code}\nreturn TablerCharts`)
    const TablerCharts = run() as Record<string, unknown>
    const style = document.getElementById('tc-styles')
    expect(style?.textContent).toContain('.tc-chart')
    expect(style?.textContent).toContain('--tc-color-1:var(--bs-primary')
    expect(document.head.firstElementChild).toBe(style)
    for (const name of ['Chart', 'init', 'observe', 'getChart', 'line']) {
      expect(TablerCharts[name], name).toBeDefined()
    }
    ;(TablerCharts.flush as () => void)()
    expect(document.querySelectorAll('#x .tc-bar')).toHaveLength(2)
  })
})
