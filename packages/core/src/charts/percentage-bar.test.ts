import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, resolveSize } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { chartInteraction, findByClass, tableOf } from '../test-utils.ts'
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

const interactionOf = (config: Partial<ChartConfig<PercentageBarOptions>> = {}): Interaction =>
  chartInteraction({ ...base, ...config }, size, 'b')

const segmentsOf = (node: ReturnType<typeof render>) =>
  findByClass(node, 'tc-segment').map((s) => ({
    x: Number(s.attrs.x),
    width: Number(s.attrs.width),
    height: Number(s.attrs.height),
  }))

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

  test('rtl: the bar starts from the right, the mirror image of the left-to-right one', () => {
    const xs = (rtl: boolean) =>
      findByClass(render({ rtl, padding: { left: 20 } }), 'tc-segment').map((rect) => ({
        x: Number(rect.attrs.x),
        width: Number(rect.attrs.width),
      }))
    const ltr = xs(false)
    const rtl = xs(true)
    // Padding is physical: 20 px stay free on the left, the bar spans 20…400.
    rtl.forEach((box, i) => {
      const twin = ltr[i] as (typeof ltr)[number]
      expect(box.width).toBeCloseTo(twin.width, 1)
      expect(box.x).toBeCloseTo(420 - twin.x - twin.width, 1)
    })
    expect(rtl[0]?.x).toBeGreaterThan(rtl[1]?.x as number)
    expect((rtl[0]?.x as number) + (rtl[0]?.width as number)).toBeCloseTo(400, 1)

    const interaction = interactionOf({ rtl: true })
    expect(interaction.reversed).toBe(true)
    expect(interaction.hitTest(390, 8)?.label).toBe('Paid')
    expect(interaction.hitTest(5, 8)?.label).toBe('Overdue')
    expect(interactionOf().reversed).toBe(false)
  })

  describe('maxSlices', () => {
    const many = [5, 30, 10, 20, 8, 15, 12].map((value, i) => ({ name: `n${i}`, value }))

    test('groups the smallest entries into one last segment in the color of the rest', () => {
      const node = render({ data: many, maxSlices: 4, gap: 0 })
      const groups = findByClass(node, 'tc-series')
      // The three largest keep their place and their slot; 5 + 10 + 8 + 12 = 35 are the rest.
      expect(groups.map((g) => g.attrs['data-series'])).toEqual(['n1', 'n3', 'n5', 'Others'])
      expect(groups.map((g) => g.attrs.class)).toEqual([
        'tc-series tc-series-2',
        'tc-series tc-series-4',
        'tc-series tc-series-6',
        'tc-series tc-series-9',
      ])
      expect(segmentsOf(node).map((s) => s.width)).toEqual([120, 80, 60, 140])
    })

    test('no more entries than the limit: no segment for the rest', () => {
      const node = render({ data: many, maxSlices: 7 })
      expect(findByClass(node, 'tc-series').length).toBe(7)
      expect(findByClass(render({ data: many }), 'tc-series').length).toBe(7)
      const ten = Array.from({ length: 12 }, (_, i) => ({ name: `n${i}`, value: i + 1 }))
      // Nine by default: eight entries and the rest.
      expect(findByClass(render({ data: ten }), 'tc-series').length).toBe(9)
      expect(findByClass(render({ data: ten, maxSlices: 0 }), 'tc-series').length).toBe(12)
    })

    test("the rest stays last with order: 'size', under its own label", () => {
      const node = render({ data: many, maxSlices: 4, order: 'size', othersLabel: 'Inne', gap: 0 })
      expect(findByClass(node, 'tc-series').map((g) => g.attrs['data-series'])).toEqual([
        'n1',
        'n3',
        'n5',
        'Inne',
      ])
    })

    test('the legend, the tooltip and the table have the rest as one entry', () => {
      const options = { data: many, maxSlices: 4 }
      expect(percentageBar.legend?.(options)).toEqual([
        { key: 'n1', name: 'n1', index: 1 },
        { key: 'n3', name: 'n3', index: 3 },
        { key: 'n5', name: 'n5', index: 5 },
        { key: '__others__', name: 'Others', index: 8 },
      ])
      const hit = interactionOf(options).hitTest(390, 8)
      expect(hit?.items[0]).toMatchObject({ name: 'Others', value: 35, text: '35 (35%)' })
      expect(tableOf({ type: percentageBar, ...options }, 100)?.rows).toEqual([
        ['n1', '30', '30%'],
        ['n3', '20', '20%'],
        ['n5', '15', '15%'],
        ['Others', '35', '35%'],
      ])
    })

    test('hiding an entry does not pull another out of the rest', () => {
      const hidden = many.map((d, i) => (i === 1 ? { ...d, hidden: true } : d))
      const node = render({ data: hidden, maxSlices: 4, gap: 0 })
      expect(findByClass(node, 'tc-series').map((g) => g.attrs['data-series'])).toEqual([
        'n3',
        'n5',
        'Others',
      ])
    })
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
    expect(tableOf({ type: percentageBar, data, format }, 100)).toEqual({
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
