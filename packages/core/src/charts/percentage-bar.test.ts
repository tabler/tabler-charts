import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, resolveSize } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass } from '../test-utils.ts'
import { type PercentageBarOptions, percentageBar } from './percentage-bar.ts'

const size = { width: 400, height: 16 }
const data = [
  { name: 'Paid', value: 50 },
  { name: 'Open', value: 30, color: '#2fb344' },
  { name: 'Draft', value: 15 },
  { name: 'Overdue', value: 5 },
]
const base: ChartConfig<PercentageBarOptions> = {
  type: percentageBar,
  data,
  id: 'b',
  locale: 'en-US',
}

const render = (config: Partial<ChartConfig<PercentageBarOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'b')

function interactionOf(config: Partial<ChartConfig<PercentageBarOptions>> = {}): Interaction {
  let found: Interaction | undefined
  buildChart({ ...base, ...config }, size, 'b', (i) => {
    found = i
  })
  if (!found) throw new Error('no interaction')
  return found
}

const segmentsOf = (node: ReturnType<typeof render>) =>
  findByClass(node, 'tc-segment').map((s) => ({
    x: Number(s.attrs.x),
    width: Number(s.attrs.width),
    height: Number(s.attrs.height),
  }))

const ctx = () => ({
  width: 400,
  height: 16,
  fontSize: 12,
  locale: 'en-US',
  id: 'b',
  onHitTest() {},
  hidden: new Set<string>(),
})

describe('percentage bar', () => {
  test('draws one segment per entry, in palette slots, as wide as its share', () => {
    const node = render({ gap: 0 })
    expect(node.attrs.class).toBe('tc-chart tc-chart-percentage-bar')
    const groups = findByClass(node, 'tc-series')
    expect(groups.map((g) => g.attrs.class)).toEqual([
      'tc-series tc-series-1',
      'tc-series tc-series-2',
      'tc-series tc-series-3',
      'tc-series tc-series-4',
    ])
    expect(groups[1]?.attrs.style).toBe('--tc-series-color:#2fb344')
    expect(segmentsOf(node)).toEqual([
      { x: 0, width: 200, height: 16 },
      { x: 200, width: 120, height: 16 },
      { x: 320, width: 60, height: 16 },
      { x: 380, width: 20, height: 16 },
    ])
  })

  test('the gap separates segments and the bar still spans the whole width', () => {
    const segments = segmentsOf(render({ gap: 4 }))
    expect(segments[0]).toMatchObject({ x: 0, width: 198 })
    expect(segments[1]).toMatchObject({ x: 202, width: 116 })
    const last = segments[3] as { x: number; width: number }
    expect(last.x + last.width).toBe(400)
  })

  test("order: 'size' puts the largest first and keeps the colors of the data", () => {
    const shuffled = [data[3], data[1], data[0], data[2]] as typeof data
    const node = render({ data: shuffled, order: 'size', gap: 0 })
    expect(findByClass(node, 'tc-series').map((g) => g.attrs['data-series'])).toEqual([
      'Paid',
      'Open',
      'Draft',
      'Overdue',
    ])
    expect(findByClass(node, 'tc-series').map((g) => g.attrs.class)).toEqual([
      'tc-series tc-series-3',
      'tc-series tc-series-2',
      'tc-series tc-series-4',
      'tc-series tc-series-1',
    ])
    expect(segmentsOf(node).map((s) => s.width)).toEqual([200, 120, 60, 20])
  })

  test('hidden segments leave the bar to the others', () => {
    const hidden = data.map((d, i) => (i === 0 ? { ...d, hidden: true } : d))
    const segments = segmentsOf(render({ data: hidden, gap: 0 }))
    expect(segments.map((s) => s.width)).toEqual([240, 120, 40])
  })

  test('zero and negative values draw no segment; no data draws the track', () => {
    const some = [
      { name: 'A', value: 5 },
      { name: 'B', value: 0 },
      { name: 'C', value: -3 },
    ]
    expect(segmentsOf(render({ data: some })).map((s) => s.width)).toEqual([400])
    const empty = render({ data: [] })
    expect(segmentsOf(empty)).toEqual([])
    expect(findByClass(empty, 'tc-percentage-bar-track').length).toBe(1)
    expect(findByClass(render(), 'tc-percentage-bar-track').length).toBe(0)
  })

  test('hit testing finds the segment under the pointer, with its value and share', () => {
    const interaction = interactionOf()
    expect(interaction.count).toBe(4)
    const hit = interaction.hitTest(250, 8)
    expect(hit?.label).toBe('Open')
    expect(hit?.seriesIndex).toBe(1)
    expect(hit?.items[0]).toMatchObject({
      name: 'Open',
      value: 30,
      text: '30 (30%)',
      color: '#2fb344',
    })
    expect(interaction.hitTest(250, 40)).toBeNull()
    expect(interaction.hitIndex(3)?.label).toBe('Overdue')
    expect(interaction.hitIndex(4)).toBeNull()
  })

  test('the table lists every segment with its value and share', () => {
    const format = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const
    expect(percentageBar.table?.({ data, format }, ctx(), 100)).toEqual({
      columns: ['', 'Value', 'Share'],
      rows: [
        ['Paid', '$50', '50%'],
        ['Open', '$30', '30%'],
        ['Draft', '$15', '15%'],
        ['Overdue', '$5', '5%'],
      ],
    })
  })

  test('is a strip 16 pixels tall unless a height or an aspect ratio is set', () => {
    const cleaned = (config: object) =>
      percentageBar.clean?.({ data, ...config } as PercentageBarOptions) as { height?: number }
    expect(resolveSize(cleaned({}), { width: 400 })).toEqual({ width: 400, height: 16 })
    expect(resolveSize(cleaned({ height: 40 }), { width: 400 }).height).toBe(40)
    expect(resolveSize(cleaned({ aspectRatio: 10 }), { width: 400 }).height).toBe(40)
  })

  test('cleans data that is not what the types say', () => {
    const junk = [{ name: 7, value: '12' }, null, { name: 'A', value: Number.NaN }] as never
    const cleaned = percentageBar.clean?.({ data: junk }) as PercentageBarOptions
    expect(cleaned.data).toMatchObject([
      { name: '7', value: 0 },
      { name: 'A', value: 0 },
    ])
  })
})
