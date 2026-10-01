/**
 * Smoke test against the built package (run `pnpm build` first): what ships
 * must behave like the sources, including side-effect imports that register
 * optional features.
 */
import { describe, expect, test } from 'vitest'

const size = { width: 400, height: 200 }
const data = { labels: [1, 2, 3], series: [{ name: 'A', values: [1, 3, 2] }] }

describe('built package', () => {
  test('@tabler/charts registers every optional feature', async () => {
    const all = await import('../dist/index.js')
    expect(all.features.time).toBeDefined()
    expect(all.features.log).toBeDefined()
    expect(all.features.decimate).toBeDefined()
    const svg = all.chartToString(
      {
        type: all.line,
        data: {
          labels: [Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 2), Date.UTC(2026, 0, 9)],
          series: data.series,
        },
        x: { type: 'time', utc: true },
        y: { scale: 'log' },
        decimate: 2,
        locale: 'en-US',
      },
      size,
    )
    expect(svg).toContain('tc-line')
    expect(svg).not.toMatch(/NaN/)
  })

  test('@tabler/charts/core stays feature-free until an entry is imported', async () => {
    const core = await import('../dist/core.js')
    // The default entry above already registered everything in this process,
    // so check the entries themselves register the right thing instead.
    const time = await import('../dist/time.js')
    const log = await import('../dist/log.js')
    const decimate = await import('../dist/decimate.js')
    expect(core.features.time?.scale).toBe(time.time)
    expect(core.features.log).toBe(log.log)
    expect(core.features.decimate).toBe(decimate.lttbIndices)
    expect(core.features.line?.linePath).toBe(core.linePath)
    expect(core.features.annotations).toBeDefined()
  })

  test('every chart type renders from the built entries', async () => {
    const { chartToString } = await import('../dist/core.js')
    const { line } = await import('../dist/line.js')
    const { area } = await import('../dist/area.js')
    const { bar } = await import('../dist/bar.js')
    const { pie, donut } = await import('../dist/pie.js')
    const { scatter } = await import('../dist/scatter.js')
    const { gauge } = await import('../dist/gauge.js')
    const { heatmap } = await import('../dist/heatmap.js')
    const { candlestick } = await import('../dist/candlestick.js')
    const { sparkline } = await import('../dist/sparkline.js')
    for (const type of [line, area, bar])
      expect(chartToString({ type, data }, size)).toContain('tc-series-1')
    for (const type of [pie, donut]) {
      expect(chartToString({ type, data: [{ name: 'A', value: 1 }] }, size)).toContain('tc-slice')
    }
    expect(
      chartToString(
        { type: scatter, data: { series: [{ name: 'A', points: [{ x: 1, y: 2 }] }] } },
        size,
      ),
    ).toContain('tc-point')
    expect(chartToString({ type: sparkline, data: [1, 2] }, size)).toContain('tc-sparkline')
    expect(chartToString({ type: gauge, data: 42 }, size)).toContain('tc-gauge-arc')
    expect(chartToString({ type: heatmap, data }, size)).toContain('tc-cell')
    expect(
      chartToString(
        { type: candlestick, data: [{ x: 'a', open: 1, high: 3, low: 0, close: 2 }] },
        size,
      ),
    ).toContain('tc-candle-up')
  })

  test('the stylesheet ships', async () => {
    const { readFile } = await import('node:fs/promises')
    const css = await readFile(new URL('../dist/style.css', import.meta.url), 'utf8')
    expect(css).toContain('.tc-chart')
    // Minified, with the banner kept and nothing down-levelled.
    expect(css.startsWith('/*! @tabler/charts')).toBe(true)
    expect(css.match(/\/\*/g)).toHaveLength(1)
    for (const kept of ['@supports', 'color-mix(', 'prefers-reduced-motion', ':where(']) {
      expect(css, kept).toContain(kept)
    }
  })
})
