import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString } from '../chart.ts'
import type { Child, VNode } from '../vnode.ts'
import { resolveLabels, valueDomain } from './cartesian.ts'
import { type LineOptions, line } from './line.ts'

const size = { width: 400, height: 200 }

const base: ChartConfig<LineOptions> = {
  type: line,
  id: 't',
  locale: 'en-US',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    series: [
      { name: 'Sales', values: [10, 30, 20, 40] },
      { name: 'Costs', values: [5, 15, null, 25] },
    ],
  },
}

/** All descendant nodes matching a class. */
function find(node: Child, cls: string, out: VNode[] = []): VNode[] {
  if (typeof node === 'string') return out
  if (
    String(node.attrs.class ?? '')
      .split(' ')
      .includes(cls)
  )
    out.push(node)
  for (const child of node.children) find(child, cls, out)
  return out
}

const render = (config: Partial<ChartConfig<LineOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 't')

describe('resolveLabels()', () => {
  test('uses labels or 1…n for the longest series', () => {
    expect(resolveLabels({ labels: ['a'], series: [] })).toEqual(['a'])
    expect(
      resolveLabels({
        series: [
          { name: 'a', values: [1, 2] },
          { name: 'b', values: [1, 2, 3] },
        ],
      }),
    ).toEqual([1, 2, 3])
    expect(resolveLabels({ series: [] })).toEqual([])
  })
})

describe('valueDomain()', () => {
  const data = { series: [{ name: 's', values: [12, 47, null, 30] }] }

  test('niced data extent, optionally including zero', () => {
    expect(valueDomain(data, {}, false, 5)).toEqual([10, 50])
    expect(valueDomain(data, {}, true, 5)).toEqual([0, 50])
    expect(valueDomain(data, { zero: true }, false, 5)).toEqual([0, 50])
  })

  test('respects min, max and nice: false', () => {
    expect(valueDomain(data, { min: 0, max: 100 }, false, 5)).toEqual([0, 100])
    expect(valueDomain(data, { min: 5 }, false, 5)).toEqual([5, 50])
    expect(valueDomain(data, { nice: false }, false, 5)).toEqual([12, 47])
  })

  test('gives flat and empty data a visible range', () => {
    expect(valueDomain({ series: [] }, {}, false, 5)).toEqual([0, 1])
    expect(valueDomain({ series: [{ name: 's', values: [0, 0] }] }, {}, true, 5)).toEqual([0, 1])
    expect(
      valueDomain({ series: [{ name: 's', values: [50, 50] }] }, { nice: false }, false, 5),
    ).toEqual([45, 55])
  })
})

describe('line', () => {
  test('renders one keyed, 1-based series group per series', () => {
    const groups = find(render(), 'tc-series')
    expect(groups.map((g) => g.key)).toEqual(['Sales', 'Costs'])
    expect(groups.map((g) => g.attrs.class)).toEqual([
      'tc-series tc-series-1',
      'tc-series tc-series-2',
    ])
    expect(groups[0]?.attrs['data-series']).toBe('Sales')
    expect(find(render(), 'tc-line')).toHaveLength(2)
  })

  test('marks the root svg with the chart type', () => {
    expect(render().attrs.class).toBe('tc-chart tc-chart-line')
  })

  test('leaves gaps for null values unless connectNulls is set', () => {
    const d = (config: Partial<LineOptions>) =>
      find(render(config), 'tc-line')[1]?.attrs.d as string
    expect(d({ curve: 'linear' }).match(/M/g)).toHaveLength(2)
    expect(d({ curve: 'linear', connectNulls: true }).match(/M/g)).toHaveLength(1)
  })

  test('draws points on none, the last or all values', () => {
    expect(find(render(), 'tc-point')).toHaveLength(0)
    expect(find(render({ points: 'last' }), 'tc-point')).toHaveLength(2)
    expect(find(render({ points: 'all' }), 'tc-point')).toHaveLength(7)
    expect(find(render({ points: 'all', pointRadius: 6 }), 'tc-point')[0]?.attrs.r).toBe(6)
  })

  test('applies custom series colors and classes', () => {
    const groups = find(
      render({
        data: {
          labels: ['a'],
          series: [{ name: 'A', values: [1], color: '#066fd1', class: 'is-main', id: 'a1' }],
        },
      }),
      'tc-series',
    )
    expect(groups[0]?.attrs).toMatchObject({
      class: 'tc-series tc-series-1 is-main',
      style: '--tc-series-color:#066fd1',
    })
    expect(groups[0]?.key).toBe('a1')
  })

  test('fills the area when asked', () => {
    expect(find(render(), 'tc-area')).toHaveLength(0)
    expect(find(render({ area: true }), 'tc-area')).toHaveLength(2)
  })

  test('clips series to the plot area with a chart-unique id', () => {
    const svg = chartToString({ ...base, id: 'sales' }, size)
    expect(svg).toContain('<clipPath id="sales-clip">')
    expect(svg).toContain('clip-path="url(#sales-clip)"')
  })

  test('renders axes and grid with formatted labels', () => {
    const svg = chartToString(
      { ...base, y: { format: { style: 'currency', currency: 'USD' } } },
      size,
    )
    expect(svg).toContain('>$40</text>')
    expect(svg).toContain('>Jan</text>')
    expect(svg).toContain('class="tc-grid tc-grid-y"')
  })

  test('hides axes and grid on request', () => {
    const svg = chartToString(
      { ...base, x: { show: false }, y: { show: false, grid: false } },
      size,
    )
    expect(svg).not.toContain('tc-axis')
    expect(svg).not.toContain('tc-grid')
  })

  test('keeps every mark inside the chart bounds', () => {
    const node = render({ points: 'all' })
    for (const point of find(node, 'tc-point')) {
      const { cx, cy, r } = point.attrs as { cx: number; cy: number; r: number }
      expect(cx - r).toBeGreaterThanOrEqual(0)
      expect(cx + r).toBeLessThanOrEqual(size.width)
      expect(cy - r).toBeGreaterThanOrEqual(0)
      expect(cy + r).toBeLessThanOrEqual(size.height)
    }
  })

  test('renders empty data without errors', () => {
    expect(() => chartToString({ ...base, data: { series: [] } }, size)).not.toThrow()
    expect(() => chartToString({ ...base, data: { labels: [], series: [] } }, size)).not.toThrow()
    expect(() =>
      chartToString(
        { ...base, data: { labels: ['a'], series: [{ name: 's', values: [null] }] } },
        size,
      ),
    ).not.toThrow()
  })

  test('matches the snapshot', () => {
    expect(chartToString({ ...base, points: 'last' }, size)).toMatchSnapshot()
  })
})
