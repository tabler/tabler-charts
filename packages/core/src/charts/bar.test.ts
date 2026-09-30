import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString } from '../chart.ts'
import { findByClass } from '../test-utils.ts'
import { type BarOptions, bar } from './bar.ts'

const size = { width: 400, height: 200 }

const base: ChartConfig<BarOptions> = {
  type: bar,
  id: 'b',
  locale: 'en-US',
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [
      { name: '2025', values: [30, 45, null, 60] },
      { name: '2026', values: [35, 50, 40, 70] },
    ],
  },
}

const render = (config: Partial<ChartConfig<BarOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'b')

interface Bounds {
  left: number
  right: number
  top: number
  bottom: number
}

/** Bounding box of a bar path built by barPath() (M, V, H and A commands). */
function bounds(d: unknown): Bounds {
  const xs: number[] = []
  const ys: number[] = []
  for (const [, cmd, args] of String(d).matchAll(/([MVHA])([^MVHAZ]*)/g)) {
    const n = (args ?? '').split(',').map(Number)
    if (cmd === 'V') {
      ys.push(n[0] ?? 0)
    } else if (cmd === 'H') {
      xs.push(n[0] ?? 0)
    } else {
      // M x,y  or  A rx,ry,rotation,large,sweep,x,y
      const offset = cmd === 'M' ? 0 : 5
      xs.push(n[offset] ?? 0)
      ys.push(n[offset + 1] ?? 0)
    }
  }
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  }
}

const barsOf = (node: ReturnType<typeof render>, key?: string) =>
  findByClass(node, 'tc-bar').filter((b) => key === undefined || b.key === key)

describe('bar', () => {
  test('renders one keyed bar per non-null value', () => {
    const [first, second] = findByClass(render(), 'tc-series')
    expect([first?.key, second?.key]).toEqual(['2025', '2026'])
    expect(first && findByClass(first, 'tc-bar').map((b) => b.key)).toEqual(['Q1', 'Q2', 'Q4'])
    expect(second && findByClass(second, 'tc-bar')).toHaveLength(4)
    expect(render().attrs.class).toBe('tc-chart tc-chart-bar')
  })

  test('always includes zero and grows bars from it', () => {
    const zero = Number(findByClass(render(), 'tc-grid-line-zero')[0]?.attrs.y1)
    for (const b of barsOf(render())) expect(bounds(b.attrs.d).bottom).toBe(zero)
  })

  test('places series side by side with a gap, centered in the band', () => {
    const [a, b] = barsOf(render(), 'Q1').map((bar) => bounds(bar.attrs.d))
    if (!a || !b) throw new Error('expected two bars')
    expect(a.right - a.left).toBeLessThanOrEqual(24)
    expect(b.left - a.right).toBeCloseTo(2)
  })

  test('caps bar width and honours custom sizing', () => {
    const [a, b] = barsOf(render({ maxBarWidth: 10, gap: 6 }), 'Q2').map((bar) =>
      bounds(bar.attrs.d),
    )
    if (!a || !b) throw new Error('expected two bars')
    expect(a.right - a.left).toBeCloseTo(10)
    expect(b.left - a.right).toBeCloseTo(6)
  })

  test('rounds the data end with the given radius', () => {
    const d = (config: Partial<BarOptions>) => barsOf(render(config))[0]?.attrs.d
    expect(d({})).toContain('A4,4')
    expect(d({ radius: 0 })).not.toContain('A')
  })

  test('grows negative bars down from zero and marks them', () => {
    const node = render({
      data: { labels: ['a', 'b'], series: [{ name: 'Profit', values: [20, -10] }] },
    })
    const zero = Number(findByClass(node, 'tc-grid-line-zero')[0]?.attrs.y1)
    const [pos, neg] = barsOf(node)
    expect(pos?.attrs.class).toBe('tc-bar')
    expect(neg?.attrs.class).toBe('tc-bar tc-bar-negative')
    expect(bounds(pos?.attrs.d).bottom).toBe(zero)
    expect(bounds(neg?.attrs.d).top).toBe(zero)
  })

  test('keeps bars inside the plot area', () => {
    for (const b of barsOf(render())) {
      const { left, right, top, bottom } = bounds(b.attrs.d)
      expect(left).toBeGreaterThanOrEqual(0)
      expect(right).toBeLessThanOrEqual(size.width)
      expect(top).toBeGreaterThanOrEqual(0)
      expect(bottom).toBeLessThanOrEqual(size.height)
    }
  })

  test('renders empty data without errors', () => {
    expect(() => chartToString({ ...base, data: { series: [] } }, size)).not.toThrow()
    expect(() =>
      chartToString({ ...base, data: { labels: ['a'], series: [] } }, size),
    ).not.toThrow()
  })

  test('matches the snapshot', () => {
    expect(chartToString(base, size)).toMatchSnapshot()
  })
})
