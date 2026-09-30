import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString, renderContext } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass } from '../test-utils.ts'
import { type ScatterOptions, scatter } from './scatter.ts'

const size = { width: 400, height: 240 }
const data = {
  series: [
    {
      name: 'North',
      points: [
        { x: 10, y: 20, label: 'Oslo' },
        { x: 40, y: 80 },
        { x: 25, y: 50 },
      ],
    },
    {
      name: 'South',
      points: [
        { x: 30, y: 10 },
        { x: 70, y: 60, label: 'Rome' },
      ],
      color: '#f00',
    },
  ],
}
const base: ChartConfig<ScatterOptions> = { type: scatter, data, id: 's', locale: 'en-US' }

const render = (config: Partial<ChartConfig<ScatterOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 's')

function interactionOf(config: Partial<ChartConfig<ScatterOptions>> = {}): Interaction {
  let found: Interaction | undefined
  buildChart({ ...base, ...config }, size, 's', (i) => {
    found = i
  })
  if (!found) throw new Error('no interaction')
  return found
}

const circles = (node: ReturnType<typeof render>) =>
  findByClass(node, 'tc-point').map((c) => c.attrs as { cx: number; cy: number; r: number })

describe('scatter', () => {
  test('renders one circle per point in keyed series groups', () => {
    const node = render()
    expect(findByClass(node, 'tc-series').map((g) => g.key)).toEqual(['North', 'South'])
    expect(circles(node)).toHaveLength(5)
    expect(node.attrs.class).toBe('tc-chart tc-chart-scatter')
  })

  test('maps both axes linearly', () => {
    const [a, b, c] = circles(render())
    if (!a || !b || !c) throw new Error('missing points')
    // x: 10 < 25 < 40, y: 20 < 50 < 80 (up is smaller y)
    expect(a.cx).toBeLessThan(c.cx)
    expect(c.cx).toBeLessThan(b.cx)
    expect(a.cy).toBeGreaterThan(c.cy)
    expect(c.cy).toBeGreaterThan(b.cy)
    // Collinear points stay collinear.
    expect((c.cx - a.cx) / (b.cx - a.cx)).toBeCloseTo(0.5)
    expect((c.cy - a.cy) / (b.cy - a.cy)).toBeCloseTo(0.5)
  })

  test('labels both axes and keeps points inside the chart', () => {
    const node = render()
    expect(findByClass(node, 'tc-axis-left')).toHaveLength(1)
    expect(findByClass(node, 'tc-axis-bottom')).toHaveLength(1)
    for (const { cx, cy, r } of circles(node)) {
      expect(cx - r).toBeGreaterThanOrEqual(0)
      expect(cx + r).toBeLessThanOrEqual(size.width)
      expect(cy - r).toBeGreaterThanOrEqual(0)
      expect(cy + r).toBeLessThanOrEqual(size.height)
    }
  })

  test('sizes bubbles by area', () => {
    const node = render({
      data: {
        series: [
          {
            name: 'B',
            points: [
              { x: 1, y: 1, size: 100 },
              { x: 2, y: 2, size: 25 },
            ],
          },
        ],
      },
      size: { min: 0, max: 20 },
    })
    const [big, small] = circles(node)
    expect(big?.r).toBe(20)
    // A quarter of the size is half the radius (a quarter of the area).
    expect(small?.r).toBe(10)
    expect(findByClass(node, 'tc-bubble')).toHaveLength(2)
  })

  test('hits the nearest point within reach and reports both values', () => {
    const [oslo] = circles(render())
    if (!oslo) throw new Error('missing')
    const hit = interactionOf().hitTest(oslo.cx + 3, oslo.cy - 2)
    expect(hit?.title).toBe('Oslo')
    expect(hit?.items[0]).toMatchObject({ name: 'North', text: '10, 20' })
    expect(hit?.mark?.d).toMatch(/^M/)
    expect(interactionOf().hitTest(oslo.cx + 60, oslo.cy + 60)).toBeNull()
  })

  test('walks points in x order for the keyboard and skips hidden series', () => {
    const all = interactionOf()
    expect(all.count).toBe(5)
    expect([0, 1, 2, 3, 4].map((i) => all.hitIndex(i)?.items[0]?.text)).toEqual([
      '10, 20',
      '25, 50',
      '30, 10',
      '40, 80',
      '70, 60',
    ])
    const onlySouth = interactionOf({
      data: { series: [{ ...data.series[0], hidden: true } as never, data.series[1] as never] },
    })
    expect(onlySouth.count).toBe(2)
  })

  test('describes the points as a table', () => {
    const table = scatter.table?.(
      base,
      renderContext(base, size, 's', () => {}, new Set()),
    )
    expect(table?.columns).toEqual(['', 'Label', 'x', 'y'])
    expect(table?.rows[0]).toEqual(['North', 'Oslo', '10', '20'])
    expect(table?.rows).toHaveLength(5)
  })

  test('handles empty and non-finite data', () => {
    expect(() => chartToString({ ...base, data: { series: [] } }, size)).not.toThrow()
    const node = render({
      data: {
        series: [
          {
            name: 'A',
            points: [
              { x: Number.NaN, y: 1 },
              { x: 1, y: 1 },
            ],
          },
        ],
      },
    })
    expect(circles(node)).toHaveLength(1)
  })

  test('finds the nearest of many points quickly', () => {
    const many = {
      series: [
        {
          name: 'Many',
          points: Array.from({ length: 20000 }, (_, i) => ({ x: i % 200, y: Math.floor(i / 200) })),
        },
      ],
    }
    const interaction = interactionOf({ data: many })
    const start = performance.now()
    for (let i = 0; i < 1000; i++) interaction.hitTest(200, 120)
    // 1000 lookups among 20k points stay well under a frame each.
    expect((performance.now() - start) / 1000).toBeLessThan(1)
  })
})
