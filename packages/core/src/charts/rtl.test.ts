import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { timePointScale } from '../scales/time.ts'
import { findByClass } from '../test-utils.ts'
import '../time.ts'
import '../value-labels.ts'
import type { VNode } from '../vnode.ts'
import { type BarOptions, bar } from './bar.ts'
import { type LineOptions, line } from './line.ts'

const size = { width: 400, height: 200 }
const data = {
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: '2025', values: [30, 45, 20, 60] },
    { name: '2026', values: [35, 50, 40, 70] },
  ],
}

const lines = (config: Partial<ChartConfig<LineOptions>> = {}) => {
  let interaction: Interaction | undefined
  const node = buildChart({ type: line, locale: 'en-US', data, ...config }, size, 'r', (i) => {
    interaction = i
  })
  return { node, interaction: interaction as Interaction }
}

/** The x of every tick of an axis, in tick order. */
const tickXs = (node: VNode, axis: string): number[] =>
  findByClass(findByClass(node, axis)[0] as VNode, 'tc-tick').map((tick) =>
    Number(String(tick.attrs.style).match(/translate\((-?[\d.]+)px/)?.[1]),
  )

describe('rtl', () => {
  test('is off by default: value axis on the left, categories from the left', () => {
    const { node, interaction } = lines()
    expect(String(node.attrs.class)).not.toContain('tc-rtl')
    expect(findByClass(node, 'tc-axis-left')).toHaveLength(1)
    const xs = tickXs(node, 'tc-axis-bottom')
    expect(xs[0]).toBeLessThan(xs[3] as number)
    expect(interaction.reversed).toBe(false)
  })

  test('mirrors the layout: the image of the left-to-right chart', () => {
    const ltr = lines()
    const rtl = lines({ rtl: true })
    expect(String(rtl.node.attrs.class)).toContain('tc-rtl')
    expect(findByClass(rtl.node, 'tc-axis-left')).toHaveLength(0)
    const axis = findByClass(rtl.node, 'tc-axis-right')[0] as VNode
    expect(findByClass(axis, 'tc-tick-label')[0]?.attrs['text-anchor']).toBe('start')
    // Every category sits where its mirror image would.
    const mirrored = tickXs(ltr.node, 'tc-axis-bottom').map((x) => size.width - x)
    tickXs(rtl.node, 'tc-axis-bottom').forEach((x, i) => {
      expect(x).toBeCloseTo(mirrored[i] as number, 1)
    })
    // The value axis stands at the plot's right edge, labels beside it.
    const [edge] = tickXs(rtl.node, 'tc-axis-right')
    expect(edge).toBeCloseTo(size.width - (tickXs(ltr.node, 'tc-axis-left')[0] as number), 1)
    expect(rtl.interaction.reversed).toBe(true)
  })

  test('swaps a one-sided padding with the layout', () => {
    const ltr = lines({ padding: { left: 40 } })
    const rtl = lines({ rtl: true, padding: { left: 40 } })
    // Padding is physical: 40 px stay free on the left in both.
    const left = Math.min(...tickXs(ltr.node, 'tc-axis-left'))
    expect(left).toBeGreaterThan(40)
    expect(Math.min(...tickXs(rtl.node, 'tc-axis-bottom'))).toBeGreaterThan(40)
  })

  test('x.reverse: false keeps the categories from the left under a right axis', () => {
    const { node, interaction } = lines({ rtl: true, x: { reverse: false } })
    expect(findByClass(node, 'tc-axis-right')).toHaveLength(1)
    const xs = tickXs(node, 'tc-axis-bottom')
    expect(xs[0]).toBeLessThan(xs[3] as number)
    expect(interaction.reversed).toBe(false)
  })

  test('x.reverse alone runs the categories from the right', () => {
    const { node } = lines({ x: { reverse: true } })
    expect(findByClass(node, 'tc-axis-left')).toHaveLength(1)
    const xs = tickXs(node, 'tc-axis-bottom')
    expect(xs[0]).toBeGreaterThan(xs[3] as number)
  })

  test('hit testing follows the reversed categories', () => {
    const { node, interaction } = lines({ rtl: true })
    const xs = tickXs(node, 'tc-axis-bottom')
    xs.forEach((x, i) => {
      expect(interaction.hitTest(x, 100)?.index).toBe(i)
    })
  })

  test('grouped bars keep the first series first: on the right', () => {
    let interaction: Interaction | undefined
    const config: ChartConfig<BarOptions> = { type: bar, locale: 'en-US', data, rtl: true }
    buildChart(config, size, 'r', (i) => {
      interaction = i
    })
    const hit = (interaction as Interaction).hitIndex(0)
    const [first, second] = hit?.items ?? []
    expect(first?.x).toBeGreaterThan(second?.x as number)
    // The bar under the pointer is the one drawn there.
    const at = (interaction as Interaction).hitTest(first?.x as number, 150)
    expect(at?.seriesIndex).toBe(0)
  })

  test('time axes find the nearest date on a reversed range', () => {
    const stamps = [0, 10, 20, 100]
    const { scale } = timePointScale(stamps, stamps, [300, 0], true)
    expect(stamps.map((_, i) => scale.at(i))).toEqual([300, 270, 240, 0])
    expect(scale.indexAt(300)).toBe(0)
    expect(scale.indexAt(262)).toBe(1)
    expect(scale.indexAt(250)).toBe(2)
    expect(scale.indexAt(130)).toBe(2)
    expect(scale.indexAt(100)).toBe(3)
    expect(scale.indexAt(-5)).toBe(3)
  })
})

describe('rtl, horizontal bars', () => {
  const bars = (config: Partial<ChartConfig<BarOptions>> = {}) => {
    let interaction: Interaction | undefined
    const node = buildChart(
      { type: bar, locale: 'en-US', orientation: 'horizontal', data, ...config },
      size,
      'r',
      (i) => {
        interaction = i
      },
    )
    return { node, interaction: interaction as Interaction }
  }

  test('categories on the right, values growing to the left', () => {
    const ltr = bars()
    const rtl = bars({ rtl: true })
    expect(findByClass(rtl.node, 'tc-axis-left')).toHaveLength(0)
    expect(findByClass(rtl.node, 'tc-axis-right')).toHaveLength(1)
    // Value ticks are the mirror image of the left-to-right ones.
    const mirrored = tickXs(ltr.node, 'tc-axis-bottom').map((x) => size.width - x)
    const xs = tickXs(rtl.node, 'tc-axis-bottom')
    expect(xs[0]).toBeGreaterThan(xs.at(-1) as number)
    xs.forEach((x, i) => {
      expect(x).toBeCloseTo(mirrored[i] as number, 1)
    })
    // A bar ends left of the baseline it starts from, where its mirror image would.
    const item = rtl.interaction.hitIndex(0)?.items[0]
    const twin = ltr.interaction.hitIndex(0)?.items[0]
    expect(item?.x).toBeCloseTo(size.width - (twin?.x as number), 1)
    expect(item?.box?.x).toBeCloseTo(item?.x as number, 1)
    // Categories still run top to bottom: the arrow keys keep their direction.
    expect(rtl.interaction.reversed).toBe(false)
  })

  test('stacked segments leave their gap on the side they grow to', () => {
    const boxes = (rtl: boolean) => {
      const { node } = bars({ rtl, stacked: true })
      return findByClass(node, 'tc-bar').map((path) => {
        const xs = [...String(path.attrs.d).matchAll(/[ML](-?[\d.]+),/g)].map((m) => Number(m[1]))
        return [Math.min(...xs), Math.max(...xs)] as const
      })
    }
    const ltr = boxes(false)
    const rtl = boxes(true)
    expect(rtl).toHaveLength(ltr.length)
    rtl.forEach(([lo, hi], i) => {
      const [tlo, thi] = ltr[i] as readonly [number, number]
      expect(lo).toBeCloseTo(size.width - thi, 0)
      expect(hi).toBeCloseTo(size.width - tlo, 0)
    })
  })

  test('value labels sit beyond the end of a bar: on its left', () => {
    const texts = (rtl: boolean) =>
      findByClass(bars({ rtl, valueLabels: true }).node, 'tc-value-label').map((t) =>
        Number(String(t.attrs.style).match(/translate\((-?[\d.]+)px/)?.[1]),
      )
    const ltr = texts(false)
    const rtl = texts(true)
    expect(rtl.length).toBeGreaterThan(0)
    rtl.forEach((x, i) => {
      expect(x).toBeCloseTo(size.width - (ltr[i] as number), 0)
    })
  })
})
