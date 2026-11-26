import { describe, expect, test } from 'vitest'
import { type ChartConfig, renderChart } from '../chart.ts'
import type { Hit, Interaction } from '../interaction.ts'
import { findByClass } from '../test-utils.ts'
import '../line.ts'
import type { VNode } from '../vnode.ts'
import { type BarOptions, bar } from './bar.ts'
import { seriesTable } from './cartesian.ts'
import { type LineOptions, line } from './line.ts'

const size = { width: 400, height: 200 }
const labels = ['Mon', 'Tue', 'Wed', 'Thu']
// Sales in thousands as bars, the average price per person in tens as a line.
const sales = { name: 'Net revenue', values: [4200, 5100, 3800, 6100] }
const perPax = { name: 'Net revenue / PAX', values: [42, 48, 39, 55] }
const data = {
  labels,
  series: [sales, { ...perPax, type: 'line' as const, axis: 'y2' as const }],
}

function render<O extends object>(config: ChartConfig<O>) {
  const { svg: node, interaction } = renderChart({ locale: 'en-US', ...config }, size, 'y')
  return { node, interaction: interaction as Interaction }
}
const bars = (config: Partial<ChartConfig<BarOptions>> = {}) =>
  render<BarOptions>({ type: bar, data, ...config })
const lines = (config: Partial<ChartConfig<LineOptions>> = {}) =>
  render<LineOptions>({ type: line, data, ...config })

const axisOf = (node: VNode, position: string) => findByClass(node, `tc-axis-${position}`)[0]
const tickLabels = (node: VNode, position: string): string[] =>
  findByClass(axisOf(node, position) as VNode, 'tc-tick-label').map((t) => t.children.join(''))
const tickX = (node: VNode, position: string): number =>
  Number(
    String(findByClass(axisOf(node, position) as VNode, 'tc-tick')[0]?.attrs.style).match(
      /translate\((-?[\d.]+)px/,
    )?.[1],
  )
const hits = (interaction: Interaction): Hit[] =>
  labels.map((_, i) => interaction.hitIndex(i) as Hit)
const ysOf = (interaction: Interaction, seriesIndex: number): number[] =>
  hits(interaction).map(
    (hit) => hit.items.find((it) => it.seriesIndex === seriesIndex)?.y as number,
  )

describe('second value axis (y2)', () => {
  test('is not drawn until a series uses it', () => {
    const { node } = bars({ data: { labels, series: [sales, perPax] }, y2: { title: 'PAX' } })
    expect(axisOf(node, 'right')).toBeUndefined()
    expect(findByClass(node, 'tc-axis-title')).toHaveLength(0)
  })

  test('a series on y2 gets its own scale on the right, so it does not lie flat', () => {
    const { node, interaction } = bars()
    expect(tickLabels(node, 'left').at(-1)).toMatch(/^[\d,]{5,}$/)
    expect(Number(tickLabels(node, 'right').at(-1))).toBeLessThan(100)
    const area = (interaction.hitIndex(0) as Hit).area
    const ys = ysOf(interaction, 1)
    // On the shared axis the line would span under 1% of the plot height.
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(area.height / 4)
    // Lines on y2 do not need zero; the bars on y still grow from it.
    expect(Number(tickLabels(node, 'right')[0])).toBeGreaterThan(0)
    expect(tickLabels(node, 'left')[0]).toBe('0')
  })

  test('the plot makes room for the second axis and its title', () => {
    const plain = bars({ data: { labels, series: [sales, { ...perPax, type: 'line' }] } })
    const width = (i: Interaction) => (i.hitIndex(0) as Hit).area.width
    const withAxis = bars()
    const withTitle = bars({ y2: { title: 'Net revenue / PAX' } })
    expect(width(withAxis.interaction)).toBeLessThan(width(plain.interaction))
    expect(width(withTitle.interaction)).toBeLessThan(width(withAxis.interaction))
    const area = (withTitle.interaction.hitIndex(0) as Hit).area
    expect(tickX(withTitle.node, 'right')).toBeCloseTo(area.x + area.width, 0)
  })

  test('y2.title is turned 90° on the right, y.title stays on the left', () => {
    const { node } = bars({ y: { title: 'Net revenue' }, y2: { title: 'Net revenue / PAX' } })
    const right = findByClass(node, 'tc-axis-title-right')[0] as VNode
    expect(right.children.join('')).toBe('Net revenue / PAX')
    expect(String(right.attrs.transform)).toContain('rotate(90)')
    expect(findByClass(node, 'tc-axis-title-left')[0]?.children.join('')).toBe('Net revenue')
  })

  test('y2.show: false hides the labels but keeps the scale and the title', () => {
    const { node, interaction } = bars({ y2: { show: false, title: 'PAX' } })
    expect(axisOf(node, 'right')).toBeUndefined()
    expect(findByClass(node, 'tc-axis-title-right')).toHaveLength(1)
    const ys = ysOf(interaction, 1)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(20)
  })

  test('swaps sides in rtl', () => {
    const { node } = bars({ rtl: true, y2: { title: 'PAX' } })
    expect(Number(tickLabels(node, 'left').at(-1))).toBeLessThan(100)
    expect(tickLabels(node, 'right').at(-1)).toMatch(/^[\d,]{5,}$/)
    expect(findByClass(node, 'tc-axis-title-left')[0]?.children.join('')).toBe('PAX')
  })

  test('min, max and format of y2 apply to its series, in the tooltip and the table', () => {
    const y2 = { min: 0, max: 100, format: { style: 'currency', currency: 'EUR' } } as const
    const { node, interaction } = bars({ y2 })
    expect(tickLabels(node, 'right')[0]).toBe('€0')
    expect(tickLabels(node, 'right').at(-1)).toBe('€100')
    const items = (interaction.hitIndex(0) as Hit).items
    expect(items[0]?.text).toBe('4,200')
    expect(items[1]?.text).toBe('€42.00')
    const table = seriesTable({ data, y2 }, { locale: 'en-US', hidden: new Set() } as never)
    expect(table.rows[0]).toEqual(['Mon', '4,200', '€42.00'])
  })

  test('the grid follows y only', () => {
    const { node } = bars()
    const grid = findByClass(node, 'tc-grid')
    expect(grid).toHaveLength(1)
    expect(findByClass(grid[0] as VNode, 'tc-grid-line')).toHaveLength(
      tickLabels(node, 'left').length,
    )
  })

  test('keeps its scale when its series are hidden', () => {
    const shown = bars()
    const hidden = bars({
      data: {
        ...data,
        series: [sales, { ...perPax, type: 'line' as const, axis: 'y2' as const, hidden: true }],
      },
    })
    expect(tickLabels(hidden.node, 'right')).toEqual(tickLabels(shown.node, 'right'))
  })

  test('bars on y2 stand beside the stack, in a column of their own', () => {
    const other = { name: 'Other', values: [1000, 1200, 900, 1500] }
    const pax = { name: 'PAX', values: [90, 110, 80, 130], axis: 'y2' as const }
    const { node, interaction } = bars({
      stacked: true,
      data: { labels, series: [sales, other, pax] },
    })
    const items = (interaction.hitIndex(0) as Hit).items
    // The two stacked series share a column; the y2 bar is beside them.
    expect(items[0]?.x).toBe(items[1]?.x)
    expect(items[2]?.x).toBeGreaterThan(items[0]?.x as number)
    // The stack tops out at the sum on y; the y2 bar is not part of it.
    expect(tickLabels(node, 'left').at(-1)).toBe('8,000')
    expect(Number(tickLabels(node, 'right').at(-1))).toBeLessThan(200)
    // Both the stack and the y2 bar are hit under the pointer.
    const box = items[2]?.box
    expect(box).toBeDefined()
    const hit = interaction.hitTest(
      (box?.x as number) + 1,
      (box?.y as number) + (box?.height as number) / 2,
    )
    expect(hit?.seriesIndex).toBe(2)
  })

  test('grouped bars on both axes keep one slot each', () => {
    const pax = { name: 'PAX', values: [90, 110, 80, 130], axis: 'y2' as const }
    const { interaction } = bars({ data: { labels, series: [sales, pax] } })
    const [a, b] = (interaction.hitIndex(0) as Hit).items
    expect(b?.x).toBeGreaterThan(a?.x as number)
    // Both bars grow from the bottom of the plot (zero on each axis).
    expect((a?.box?.y as number) + (a?.box?.height as number)).toBeCloseTo(
      (b?.box?.y as number) + (b?.box?.height as number),
      5,
    )
  })

  test('line charts: series on y2 stay out of the stacks', () => {
    const { node, interaction } = lines({
      stacked: true,
      data: {
        labels,
        series: [sales, { ...sales, name: 'Other' }, { ...perPax, axis: 'y2' }],
      },
    })
    expect(tickLabels(node, 'left').at(-1)).toMatch(/^1[\d,]{5}$/)
    const ys = ysOf(interaction, 2)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(20)
    expect(Number(tickLabels(node, 'right').at(-1))).toBeLessThan(100)
  })

  test('horizontal bars have no second axis', () => {
    const { node } = bars({ orientation: 'horizontal', y2: { title: 'PAX' } })
    expect(findByClass(node, 'tc-axis-title')).toHaveLength(0)
    expect(findByClass(node, 'tc-axis')).toHaveLength(2)
  })
})
