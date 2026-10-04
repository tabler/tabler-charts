// @vitest-environment happy-dom
import { describe, expect, test } from 'vitest'
import { type ChartConfig, chartToString } from '../chart.ts'
import { Chart } from '../chart-default.ts'
import { features } from '../features.ts'
import '../patterns.ts'
import { flush } from '../scheduler.ts'
import { bar } from './bar.ts'
import { pie } from './pie.ts'

const size = { width: 400, height: 200 }
const series = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ name: `S${i}`, values: [1 + i, 2] }))
const render = (options: Record<string, unknown> = {}, n = 3) =>
  chartToString(
    {
      type: bar,
      id: 'c',
      locale: 'en-US',
      data: { labels: ['a', 'b'], series: series(n) },
      ...options,
    } as ChartConfig<object>,
    size,
  )

describe('pattern fills', () => {
  test('by default the chart carries a pattern per entry, worn in forced colors', () => {
    const svg = render()
    expect(svg).toMatch(/class="tc-chart tc-chart-bar tc-patterns-auto"/)
    expect(svg.match(/<pattern /g)).toHaveLength(3)
    expect(svg).toContain('id="c-pattern-1"')
    expect(svg).toContain('--tc-pattern-3:url(#c-pattern-3)')
    // Saying so is the same.
    expect(render({ patterns: 'auto' })).toBe(svg)
  })

  test('`true` wears them always, `false` leaves them out', () => {
    expect(render({ patterns: true })).toMatch(/class="tc-chart tc-chart-bar tc-patterned"/)
    const off = render({ patterns: false })
    expect(off).not.toContain('<pattern')
    expect(off).not.toContain('tc-pattern')
  })

  test('each of the eight slots has a shape of its own; series 9+ share one', () => {
    const svg = render({}, 11)
    const shapes = [...svg.matchAll(/class="tc-pattern-ink" d="([^"]+)"/g)].map((m) => m[1])
    expect(shapes).toHaveLength(9)
    expect(new Set(shapes.slice(0, 8)).size).toBe(8)
    expect(svg).toContain('id="c-pattern-other"')
    expect(svg).toContain('--tc-pattern-other:url(#c-pattern-other)')
  })

  test('a pattern takes the color of its entry, and only a safe one', () => {
    const svg = chartToString(
      {
        type: pie,
        id: 'p',
        data: [
          { name: 'A', value: 1, color: '#123456' },
          { name: 'B', value: 2, color: 'red;position:fixed' },
        ],
      } as ChartConfig<object>,
      size,
    )
    expect(svg).toMatch(/id="p-pattern-1"[^>]*style="--tc-series-color:#123456"/)
    expect(svg).not.toContain('position:fixed')
  })

  test('without the module, `auto` draws none and `true` names the import', () => {
    const saved = features.patterns
    delete features.patterns
    try {
      expect(render()).not.toContain('<pattern')
      expect(render({ patterns: 'auto' })).not.toContain('<pattern')
      expect(() => render({ patterns: true })).toThrow('@tabler/charts/patterns')
    } finally {
      features.patterns = saved
    }
  })

  test('the legend and tooltip stay as they are: their swatches are patterned in CSS', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const chart = new Chart(el, {
      type: bar,
      id: 'd',
      width: 400,
      height: 200,
      patterns: true,
      data: { labels: ['a'], series: series(2) },
    })
    chart.highlightIndex(0)
    flush()
    // One svg, the chart: nothing extra for code that looks for it.
    expect(el.querySelectorAll('svg')).toHaveLength(1)
    expect(el.querySelector('.tc-legend-item')?.classList.contains('tc-series-1')).toBe(true)
    expect(el.querySelector('.tc-tooltip-item')?.classList.contains('tc-series-1')).toBe(true)
    chart.update({ patterns: false } as never)
    flush()
    expect(el.querySelector('pattern')).toBeNull()
    expect(el.querySelector('svg')?.getAttribute('style')).toBeNull()
    chart.destroy()
  })
})
