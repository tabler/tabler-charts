import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { chartInteraction, findByClass, highlightOf } from '../test-utils.ts'
import { type SparklineOptions, sparkline } from './sparkline.ts'

const size = { width: 120, height: 40 }
const base: ChartConfig<SparklineOptions> = {
  type: sparkline,
  data: [3, 5, null, 7, 6, 9, 4],
  id: 'sp',
  locale: 'en-US',
}
const render = (config: Partial<ChartConfig<SparklineOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'sp')

const interactionOf = (config: Partial<ChartConfig<SparklineOptions>> = {}): Interaction =>
  chartInteraction({ ...base, ...config }, size, 'sp')

describe('sparkline', () => {
  test('renders a line with a last dot and nothing else', () => {
    const node = render()
    expect(node.attrs.class).toBe('tc-chart tc-chart-sparkline')
    expect(findByClass(node, 'tc-line')).toHaveLength(1)
    expect(findByClass(node, 'tc-point-last')).toHaveLength(1)
    expect(findByClass(node, 'tc-axis')).toHaveLength(0)
    expect(findByClass(node, 'tc-grid')).toHaveLength(0)
    expect(sparkline.legend).toBeUndefined()
    expect(sparkline.table).toBeUndefined()
  })

  test('uses the whole chart minus room for dots', () => {
    const d = String(findByClass(render({ curve: 'linear' }), 'tc-line')[0]?.attrs.d)
    const xs = (d.match(/-?[\d.]+,/g) ?? []).map((v) => Number.parseFloat(v))
    expect(Math.min(...xs)).toBe(5)
    expect(Math.max(...xs)).toBe(115)
  })

  test('fits lines to the data but includes zero for areas and bars', () => {
    const lineD = String(findByClass(render({ curve: 'linear' }), 'tc-line')[0]?.attrs.d)
    const ys = (lineD.match(/,(-?[\d.]+)/g) ?? []).map((v) => Number(v.slice(1)))
    // Minimum value (3) sits at the bottom of the plot, so the range is fitted.
    expect(Math.max(...ys)).toBe(35)
    const areaD = String(
      findByClass(render({ variant: 'area', curve: 'linear' }), 'tc-area')[0]?.attrs.d,
    )
    expect(areaD.includes(',35L')).toBe(true) // baseline at zero
    expect(findByClass(render({ variant: 'area' }), 'tc-area-gradient')).toHaveLength(1)
  })

  test('draws bars per value, skipping gaps', () => {
    const node = render({ variant: 'bar' })
    expect(findByClass(node, 'tc-bar')).toHaveLength(6)
    expect(findByClass(node, 'tc-point-last')).toHaveLength(0)
    expect(findByClass(render({ variant: 'bar', data: [1, -2] }), 'tc-bar-negative')).toHaveLength(
      1,
    )
  })

  test('tristate draws wins up, losses down and draws as a tick, by sign only', () => {
    const node = render({ variant: 'tristate', data: [3, -40, 0, 1, null] })
    const bars = findByClass(node, 'tc-bar')
    expect(bars.map((b) => b.attrs.class)).toEqual([
      'tc-bar tc-tristate-win',
      'tc-bar tc-bar-negative tc-tristate-loss',
      'tc-bar tc-tristate-draw',
      'tc-bar tc-tristate-win',
    ])
    // Magnitude does not matter: both wins span the same heights.
    const heights = (d: unknown) => [...String(d).matchAll(/V([\d.]+)/g)].map((m) => m[1])
    expect(heights(bars[0]?.attrs.d)).toEqual(heights(bars[3]?.attrs.d))
    expect(findByClass(node, 'tc-sparkline-zero')).toHaveLength(1)
    // The middle line sits at half the height.
    expect(Number(findByClass(node, 'tc-sparkline-zero')[0]?.attrs.y1)).toBeCloseTo(
      size.height / 2,
      0,
    )
    expect(findByClass(node, 'tc-point-last')).toHaveLength(0)
  })

  test('marks the minimum and maximum', () => {
    const node = render({ markers: 'minmax' })
    expect(findByClass(node, 'tc-point-min')).toHaveLength(1)
    expect(findByClass(node, 'tc-point-max')).toHaveLength(1)
    expect(findByClass(render({ markers: 'minmax', data: [2, 2] }), 'tc-point-max')).toHaveLength(0)
  })

  test('hits the nearest value and describes it', () => {
    const hit = interactionOf({
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      name: 'Sales',
    })
    expect(hit.count).toBe(7)
    const last = hit.hitTest(118, 20)
    expect(last?.title).toBe('Sun')
    expect(last?.items[0]).toMatchObject({ name: 'Sales', text: '4' })
    expect(hit.hitTest(5, 20)?.index).toBe(0)
    expect(hit.hitIndex(2)?.items[0]?.text).toBe('–')
    expect(hit.hitIndex(2)?.highlight).toBeUndefined()
    expect(hit.hitTest(60, 200)).toBeNull()
    expect(hit.hitIndex(7)).toBeNull()
  })

  test('tristate hover marks stay on the bar ends, whatever the magnitude', () => {
    const hit = interactionOf({ variant: 'tristate', data: [40, -40, 0] })
    const ys = [0, 1, 2].map((i) => highlightOf(hit.hitIndex(i), 'halo')?.y as number)
    // The win mark is at the top of the plot, the loss at the bottom, the draw in the middle.
    expect(ys[0]).toBeGreaterThanOrEqual(0)
    expect(ys[1]).toBeLessThanOrEqual(size.height)
    expect(ys[0]).toBeLessThan(ys[2] as number)
    expect(ys[1]).toBeGreaterThan(ys[2] as number)
    expect(ys[2]).toBeCloseTo(size.height / 2, 0)
    expect(hit.hitIndex(1)?.items[0]?.y).toBe(ys[1])
  })

  test('hits bars by slot', () => {
    const hit = interactionOf({ variant: 'bar' })
    expect(hit.hitTest(6, 20)?.index).toBe(0)
    expect(hit.hitTest(114, 20)?.index).toBe(6)
  })

  test('is not a tab stop unless asked', () => {
    expect(sparkline.keyboard).toBe(false)
  })

  test('renders empty and single values', () => {
    expect(() => chartToString({ ...base, data: [] }, size)).not.toThrow()
    const one = render({ data: [5] })
    expect(findByClass(one, 'tc-point-last')[0]?.attrs.cx).toBe(60)
  })

  test('matches the snapshot', () => {
    expect(chartToString({ ...base, markers: 'minmax' }, size)).toMatchSnapshot()
  })
})
