import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass, gridLineOffset } from '../test-utils.ts'
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
    const zero = gridLineOffset(findByClass(render(), 'tc-grid-line-zero')[0])
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
    const zero = gridLineOffset(findByClass(node, 'tc-grid-line-zero')[0])
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

  describe('stacked', () => {
    const stackedData = {
      labels: ['Q1', 'Q2'],
      series: [
        { name: 'A', values: [30, -10] },
        { name: 'B', values: [20, 25] },
        { name: 'C', values: [10, -5] },
      ],
    }
    const stackedNode = (config: Partial<ChartConfig<BarOptions>> = {}) =>
      render({ data: stackedData, stacked: true, ...config })
    const q = (node: ReturnType<typeof render>, key: string) =>
      barsOf(node, key).map((b) => ({ ...bounds(b.attrs.d), d: String(b.attrs.d) }))

    test('draws one column per category with segments on top of each other', () => {
      const [a, b, c] = q(stackedNode(), 'Q1')
      if (!a || !b || !c) throw new Error('expected three segments')
      expect(a.left).toBe(b.left)
      expect(b.left).toBe(c.left)
      expect(a.right - a.left).toBeLessThanOrEqual(24)
      // B sits on A and C on B, separated by the 2px gap.
      expect(a.top - b.bottom).toBeCloseTo(2)
      expect(b.top - c.bottom).toBeCloseTo(2)
      expect(a.bottom).toBe(gridLineOffset(findByClass(stackedNode(), 'tc-grid-line-zero')[0]))
    })

    test('rounds only the outermost segment of each sign', () => {
      const [a, b, c] = q(stackedNode(), 'Q1')
      expect([a?.d.includes('A'), b?.d.includes('A'), c?.d.includes('A')]).toEqual([
        false,
        false,
        true,
      ])
      // Q2: B is the only positive (rounded), C the outermost negative (rounded), A in between.
      const [na, nb, nc] = q(stackedNode(), 'Q2')
      expect([na?.d.includes('A'), nb?.d.includes('A'), nc?.d.includes('A')]).toEqual([
        false,
        true,
        true,
      ])
    })

    test('stacks negative values down from zero', () => {
      const node = stackedNode()
      const zero = gridLineOffset(findByClass(node, 'tc-grid-line-zero')[0])
      const [a, , c] = q(node, 'Q2')
      expect(a?.top).toBe(zero)
      expect(c?.top).toBeCloseTo((a?.bottom ?? 0) + 2)
    })

    test('uses the stack totals for the y domain', () => {
      const labels = findByClass(stackedNode(), 'tc-tick-label').map((t) => t.children[0])
      expect(labels).toContain('60')
      expect(labels).toContain('-20')
    })

    test('percent mode shows 100% columns with a percent axis', () => {
      const node = stackedNode({
        stacked: 'percent',
        data: {
          labels: ['Q1'],
          series: stackedData.series.map((s) => ({ ...s, values: [Math.abs(s.values[0] ?? 0)] })),
        },
      })
      const labels = findByClass(node, 'tc-tick-label').map((t) => t.children[0])
      expect(labels).toContain('100%')
      const [a, , c] = q(node, 'Q1')
      const zero = gridLineOffset(findByClass(node, 'tc-grid-line-zero')[0])
      expect(a?.bottom).toBe(zero)
      expect(c?.top).toBeLessThan(a?.top ?? 0)
    })

    test('reports the segment under the pointer and raw values', () => {
      let interaction: Interaction | undefined
      buildChart({ ...base, data: stackedData, stacked: true }, size, 's', (i) => {
        interaction = i
      })
      const [a, b] = q(stackedNode(), 'Q1')
      if (!interaction || !a || !b) throw new Error('missing')
      const cx = (a.left + a.right) / 2
      expect(interaction.hitTest(cx, (a.top + a.bottom) / 2)?.seriesIndex).toBe(0)
      expect(interaction.hitTest(cx, (b.top + b.bottom) / 2)?.seriesIndex).toBe(1)
      expect(interaction.hitTest(cx, (b.top + b.bottom) / 2)?.items.map((i) => i.value)).toEqual([
        30, 20, 10,
      ])
      expect(interaction.hitTest(cx + 40, (a.top + a.bottom) / 2)?.seriesIndex).toBeUndefined()
    })
  })

  describe('horizontal', () => {
    const hData = {
      labels: ['North', 'South', 'West'],
      series: [
        { name: '2025', values: [30, -10, 20] },
        { name: '2026', values: [40, 15, 25] },
      ],
    }
    const hNode = (config: Partial<ChartConfig<BarOptions>> = {}) =>
      render({ data: hData, orientation: 'horizontal', ...config })
    const zeroX = (node: ReturnType<typeof render>) =>
      gridLineOffset(findByClass(node, 'tc-grid-line-zero')[0])

    test('lays categories along y and grows bars right from zero', () => {
      const node = hNode()
      const [a, b] = barsOf(node, 'North').map((bar) => bounds(bar.attrs.d))
      if (!a || !b) throw new Error('expected two bars')
      expect(a.left).toBe(zeroX(node))
      expect(a.bottom - a.top).toBeLessThanOrEqual(24)
      // Grouped series sit one below the other with the 2px gap.
      expect(b.top - a.bottom).toBeCloseTo(2)
      expect(
        barsOf(node).every((bar) => String(bar.attrs.class).includes('tc-bar-horizontal')),
      ).toBe(true)
    })

    test('grows negative bars left and rounds only their data end', () => {
      const node = hNode()
      const [neg] = barsOf(node, 'South')
      expect(neg?.attrs.class).toContain('tc-bar-negative')
      expect(bounds(neg?.attrs.d).right).toBe(zeroX(node))
      expect(String(neg?.attrs.d)).toMatch(/A4,4,0,0,0/)
    })

    test('puts category labels on the left and value labels at the bottom', () => {
      const node = hNode()
      const labelsOf = (cls: string) =>
        findByClass(node, cls).flatMap((axis) => findByClass(axis, 'tc-tick-label'))
      const left = labelsOf('tc-axis-left')
      const bottom = labelsOf('tc-axis-bottom')
      expect(left.map((t) => t.children[0])).toEqual(['North', 'South', 'West'])
      expect(bottom.map((t) => t.children[0])).toContain('0')
      expect(findByClass(node, 'tc-grid-x')).toHaveLength(1)
      expect(findByClass(node, 'tc-grid-y')).toHaveLength(0)
    })

    test('stacks horizontally with gaps between segments', () => {
      const node = hNode({ stacked: true })
      const [a, b] = barsOf(node, 'West').map((bar) => bounds(bar.attrs.d))
      expect(a?.top).toBe(b?.top)
      expect((b?.left ?? 0) - (a?.right ?? 0)).toBeCloseTo(2)
    })

    test('hit tests along y and anchors at the bar end', () => {
      let interaction: Interaction | undefined
      buildChart({ ...base, data: hData, orientation: 'horizontal' }, size, 'h', (i) => {
        interaction = i
      })
      const [a] = barsOf(hNode(), 'West').map((bar) => bounds(bar.attrs.d))
      if (!interaction || !a) throw new Error('missing')
      const hit = interaction.hitTest((a.left + a.right) / 2, (a.top + a.bottom) / 2)
      expect(hit?.label).toBe('West')
      expect(hit?.axis).toBe('y')
      expect(hit?.seriesIndex).toBe(0)
      expect(hit?.items[0]?.x).toBeCloseTo(a.right)
      expect(hit?.band?.height).toBeGreaterThan(0)
      expect(hit?.band?.width).toBe(hit?.area.width)
    })
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
