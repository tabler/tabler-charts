import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString, renderContext } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass } from '../test-utils.ts'
import type { VNode } from '../vnode.ts'
import { bar } from './bar.ts'
import { type LineOptions, line } from './line.ts'

const size = { width: 600, height: 300 }

/** Text of the tick labels of the axis with class `cls`. */
const axisLabels = (node: VNode, cls: string) =>
  findByClass(node, cls).flatMap((axis) =>
    findByClass(axis, 'tc-tick-label').map((t) => t.children[0]),
  )
const day = (d: number, h = 0) => Date.UTC(2026, 8, d, h)

describe('time axis', () => {
  // Unevenly spaced days: 1, 2, 3, then a jump to 10.
  const base: ChartConfig<LineOptions> = {
    type: line,
    id: 't',
    locale: 'en-US',
    data: {
      labels: [day(1), day(2), day(3), day(10)],
      series: [{ name: 'Sales', values: [10, 20, 15, 30] }],
    },
    x: { type: 'time', utc: true },
    curve: 'linear',
  }
  const render = (config: Partial<ChartConfig<LineOptions>> = {}) =>
    buildChart({ ...base, ...config }, size, 't')

  test('places points at their real distance in time', () => {
    const d = String(findByClass(render(), 'tc-line')[0]?.attrs.d)
    const xs = (d.match(/-?[\d.]+,/g) ?? []).map((v) => Number.parseFloat(v))
    const [a, b, , d10] = xs
    if (a === undefined || b === undefined || d10 === undefined) throw new Error('missing')
    // Day 10 sits 9 days after day 1, i.e. 9 times the day-1→day-2 distance.
    expect((d10 - a) / (b - a)).toBeCloseTo(9)
  })

  test('draws calendar ticks with dates instead of one tick per label', () => {
    const labels = axisLabels(render(), 'tc-axis-x')
    expect(labels.length).toBeGreaterThan(4)
    expect(labels[0]).toMatch(/^Sep \d+$/)
  })

  test('accepts Date objects and formats hits and the table as dates', () => {
    const config = {
      ...base,
      data: { ...base.data, labels: base.data.labels?.map((t) => new Date(t as number)) },
    }
    let interaction: Interaction | undefined
    buildChart(config, size, 't', (i) => {
      interaction = i
    })
    const hit = interaction?.hitIndex(3)
    expect(hit?.title).toBe('Sep 10, 2026')
    expect(hit?.label).toBe(day(10))
    const table = line.table?.(
      config,
      renderContext(config, size, 't', () => {}, new Set()),
      100,
    )
    expect(table?.rows[0]?.[0]).toBe('Sep 1, 2026')
  })

  test('snaps hovers to the nearest point in time', () => {
    let interaction: Interaction | undefined
    buildChart(base, size, 't', (i) => {
      interaction = i
    })
    const third = interaction?.hitIndex(2)
    const last = interaction?.hitIndex(3)
    if (!third || !last) throw new Error('missing')
    const mid = (third.x + last.x) / 2
    expect(interaction?.hitTest(mid - 5, 150)?.index).toBe(2)
    expect(interaction?.hitTest(mid + 5, 150)?.index).toBe(3)
  })

  test('shows the time of day for short spans and honours x.format', () => {
    const hours = {
      ...base,
      data: { labels: [day(1, 9), day(1, 12), day(1, 15)], series: base.data.series },
    }
    let interaction: Interaction | undefined
    buildChart(hours, size, 't', (i) => {
      interaction = i
    })
    expect(interaction?.hitIndex(1)?.title).toBe('Sep 1, 2026, 12:00 PM')
    const custom = chartToString(
      {
        ...base,
        x: { type: 'time', utc: true, format: (l) => `#${new Date(l as number).getUTCDate()}` },
      },
      size,
    )
    expect(custom).toContain('>#1</text>')
  })

  test('is ignored by bar charts, which keep one band per label', () => {
    const node = buildChart({ ...base, type: bar } as ChartConfig<object>, size, 'b')
    expect(findByClass(node, 'tc-bar')).toHaveLength(4)
    const ticks = axisLabels(node, 'tc-axis-x')
    expect(ticks).toHaveLength(4)
    expect(ticks[0]).toBe('Sep 1, 2026')
  })
})

describe('time axis with many points', () => {
  test('lays out 200k points without overflowing the stack', () => {
    const n = 200_000
    const labels = Array.from({ length: n }, (_, i) => day(1) + i * 60_000)
    const values = labels.map((_, i) => Math.sin(i / 500) * 10)
    const config = {
      type: line,
      data: { labels, series: [{ name: 'S', values }] },
      x: { type: 'time', utc: true },
      decimate: 300,
      id: 'm',
    } as ChartConfig<object>
    const node = buildChart(config, size, 'm')
    expect(String(findByClass(node, 'tc-line')[0]?.attrs.d).match(/C/g)?.length).toBe(299)
  })
})

describe('log axis', () => {
  const base: ChartConfig<LineOptions> = {
    type: line,
    id: 'l',
    locale: 'en-US',
    data: {
      labels: ['a', 'b', 'c', 'd'],
      series: [{ name: 'Users', values: [12, 150, 2400, 31000] }],
    },
    y: { scale: 'log' },
    curve: 'linear',
  }
  const render = (config: Partial<ChartConfig<LineOptions>> = {}) =>
    buildChart({ ...base, ...config }, size, 'l')
  const yLabels = (config: Partial<ChartConfig<LineOptions>> = {}) =>
    axisLabels(render(config), 'tc-axis-y')

  test('ticks at powers of ten over a niced domain', () => {
    expect(yLabels()).toEqual(['10', '100', '1,000', '10,000', '100,000'])
  })

  test('spaces decades evenly', () => {
    const d = String(
      findByClass(
        render({
          data: { labels: ['a', 'b', 'c'], series: [{ name: 'U', values: [10, 100, 1000] }] },
        }),
        'tc-line',
      )[0]?.attrs.d,
    )
    const ys = (d.match(/,(-?[\d.]+)/g) ?? []).map((v) => Number(v.slice(1)))
    expect((ys[0] ?? 0) - (ys[1] ?? 0)).toBeCloseTo((ys[1] ?? 0) - (ys[2] ?? 0))
  })

  test('ignores zero and negative values and works for horizontal bars', () => {
    const node = render({
      data: { labels: ['a', 'b', 'c'], series: [{ name: 'U', values: [0, 5, 500] }] },
    })
    expect(findByClass(node, 'tc-grid-line-zero')).toHaveLength(0)
    const h = buildChart(
      { ...base, type: bar, orientation: 'horizontal' } as ChartConfig<object>,
      size,
      'h',
    )
    expect(findByClass(h, 'tc-bar')).toHaveLength(4)
    expect(axisLabels(h, 'tc-axis-bottom')[0]).toBe('10')
  })
})
