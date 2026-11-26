import { describe, expect, test } from 'vitest'
import { type ChartConfig, renderChart } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass } from '../test-utils.ts'
import type { VNode } from '../vnode.ts'
import { type HeatmapOptions, heatmap } from './heatmap.ts'
import { type SankeyOptions, sankey } from './sankey.ts'
import { type ScatterOptions, scatter } from './scatter.ts'
import { type SparklineOptions, sparkline } from './sparkline.ts'

const size = { width: 400, height: 200 }
const W = size.width

/** Build a chart both ways: its tree and its interaction, left to right and right to left. */
function both<O extends object>(config: ChartConfig<O>) {
  const build = (rtl: boolean) => {
    const { svg, interaction } = renderChart({ ...config, rtl }, size, 'r')
    return { node: svg, interaction: interaction as Interaction }
  }
  return { ltr: build(false), rtl: build(true) }
}

/** The x of every tick of an axis, in tick order. */
const tickXs = (node: VNode, axis: string): number[] =>
  findByClass(findByClass(node, axis)[0] as VNode, 'tc-tick').map((tick) =>
    Number(String(tick.attrs.style).match(/translate\((-?[\d.]+)px/)?.[1]),
  )

describe('rtl, scatter', () => {
  const config: ChartConfig<ScatterOptions> = {
    type: scatter,
    locale: 'en-US',
    data: {
      series: [
        {
          name: 'A',
          points: [
            { x: 1, y: 10, label: 'a' },
            { x: 4, y: 30, label: 'b' },
            { x: 9, y: 20, label: 'c' },
          ],
        },
      ],
    },
  }

  test('the value axis on the right, x running from the right', () => {
    const { ltr, rtl } = both(config)
    expect(findByClass(rtl.node, 'tc-axis-left')).toHaveLength(0)
    expect(findByClass(rtl.node, 'tc-axis-right')).toHaveLength(1)
    const mirrored = tickXs(ltr.node, 'tc-axis-bottom').map((x) => W - x)
    tickXs(rtl.node, 'tc-axis-bottom').forEach((x, i) => {
      expect(x).toBeCloseTo(mirrored[i] as number, 1)
    })
    // Points are indexed from the left of the screen: the same ones, the other way round.
    const xs = (i: Interaction) => [0, 1, 2].map((n) => i.hitIndex(n))
    const left = xs(ltr.interaction)
    const right = xs(rtl.interaction)
    expect(right.map((h) => h?.label)).toEqual(['c', 'b', 'a'])
    right.forEach((hit, n) => {
      expect(hit?.x).toBeCloseTo(W - (left[2 - n]?.x as number), 1)
    })
    const b = right[1]
    expect(rtl.interaction.hitTest(b?.x as number, b?.items[0]?.y as number)?.label).toBe('b')
  })

  test('x.reverse: false keeps x from the left under a right axis', () => {
    const { rtl } = both({ ...config, x: { reverse: false } })
    expect(findByClass(rtl.node, 'tc-axis-right')).toHaveLength(1)
    const xs = tickXs(rtl.node, 'tc-axis-bottom')
    expect(xs[0]).toBeLessThan(xs.at(-1) as number)
    expect([0, 1, 2].map((n) => rtl.interaction.hitIndex(n)?.label)).toEqual(['a', 'b', 'c'])
  })
})

describe('rtl, heatmap', () => {
  const config: ChartConfig<HeatmapOptions> = {
    type: heatmap,
    locale: 'en-US',
    data: {
      labels: ['W1', 'W2', 'W3', 'W4'],
      series: [
        { name: 'Monday', values: [0, 5, 10, 3] },
        { name: 'Tue', values: [2, null, 8, 1] },
      ],
    },
  }

  test('rows named on the right, columns from the right', () => {
    const { ltr, rtl } = both(config)
    expect(findByClass(rtl.node, 'tc-axis-left')).toHaveLength(0)
    expect(findByClass(rtl.node, 'tc-axis-right')).toHaveLength(1)
    for (let i = 0; i < 4; i++) {
      const hit = rtl.interaction.hitIndex(i, 1)
      const twin = ltr.interaction.hitIndex(i, 1)
      expect(hit?.x).toBeCloseTo(W - (twin?.x as number), 1)
      // The cell under the pointer is the one drawn there.
      const at = rtl.interaction.hitTest(hit?.x as number, hit?.items[1]?.y as number)
      expect([at?.index, at?.seriesIndex]).toEqual([i, 1])
    }
    expect(rtl.interaction.reversed).toBe(true)
    expect(ltr.interaction.reversed).toBe(false)
  })
})

describe('rtl, sparkline', () => {
  const data = [3, 5, 2, 8, 6]

  test.each(['line', 'bar'] as const)('%s: values run from the right', (variant) => {
    const config: ChartConfig<SparklineOptions> = {
      type: sparkline,
      locale: 'en-US',
      data,
      variant,
    }
    const { ltr, rtl } = both(config)
    data.forEach((_, i) => {
      const hit = rtl.interaction.hitIndex(i)
      expect(hit?.x).toBeCloseTo(W - (ltr.interaction.hitIndex(i)?.x as number), 1)
      expect(rtl.interaction.hitTest(hit?.x as number, 100)?.index).toBe(i)
    })
    expect(rtl.interaction.hitIndex(0)?.x).toBeGreaterThan(rtl.interaction.hitIndex(4)?.x as number)
    expect(rtl.interaction.reversed).toBe(true)
  })
})

describe('rtl, sankey', () => {
  const config: ChartConfig<SankeyOptions> = {
    type: sankey,
    locale: 'en-US',
    data: {
      links: [
        { from: 'Wages', to: 'Income', value: 60 },
        { from: 'Dividends', to: 'Income', value: 20 },
        { from: 'Income', to: 'Rent', value: 30 },
        { from: 'Income', to: 'Savings', value: 50 },
      ],
    },
  }
  const rects = (node: VNode) =>
    findByClass(node, 'tc-sankey-node').map((r) => ({
      x: Number(r.attrs.x),
      y: Number(r.attrs.y),
      width: Number(r.attrs.width),
      height: Number(r.attrs.height),
    }))
  const anchors = (node: VNode) =>
    findByClass(node, 'tc-sankey-label').map(
      (g) => (g.children[0] as VNode | undefined)?.attrs['text-anchor'],
    )

  test('flows run from the right: the mirror image of the left-to-right chart', () => {
    const { ltr, rtl } = both(config)
    const left = rects(ltr.node)
    const right = rects(rtl.node)
    expect(right).toHaveLength(left.length)
    right.forEach((r, i) => {
      const twin = left[i] as (typeof left)[number]
      expect(r.x).toBeCloseTo(W - twin.x - twin.width, 0)
      expect(r.y).toBeCloseTo(twin.y, 1)
    })
    // Sources stand right of their targets.
    const [wages, , income] = right as [(typeof right)[number], unknown, (typeof right)[number]]
    expect(wages.x).toBeGreaterThan(income.x)
    // Labels change sides with their nodes.
    const flipped = anchors(ltr.node).map((a) => (a === 'end' ? 'start' : 'end'))
    expect(anchors(rtl.node)).toEqual(flipped)
  })

  test('nodes and links are hit where they are drawn', () => {
    const { rtl } = both(config)
    const [wages, , income] = rects(rtl.node) as [
      ReturnType<typeof rects>[number],
      unknown,
      ReturnType<typeof rects>[number],
    ]
    const node = rtl.interaction.hitTest(income.x + 2, income.y + income.height / 2)
    expect(node?.label).toBe('Income')
    // Between the two: the ribbon from Wages (on the right) into Income.
    const between = (wages.x + income.x + income.width) / 2
    const link = rtl.interaction.hitTest(between, wages.y + wages.height / 2)
    // The arrow points the way the flow runs on screen.
    expect(link?.items[0]?.name).toBe('Wages ← Income')
    expect(rtl.interaction.hitTest(between, 2)).toBeNull()
  })
})
