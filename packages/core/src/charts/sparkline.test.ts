import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass } from '../test-utils.ts'
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

function interactionOf(config: Partial<ChartConfig<SparklineOptions>> = {}): Interaction {
  let found: Interaction | undefined
  buildChart({ ...base, ...config }, size, 'sp', (i) => {
    found = i
  })
  if (!found) throw new Error('no interaction')
  return found
}

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
    expect(hit.hitIndex(2)?.mark).toBeUndefined()
    expect(hit.hitTest(60, 200)).toBeNull()
    expect(hit.hitIndex(7)).toBeNull()
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
