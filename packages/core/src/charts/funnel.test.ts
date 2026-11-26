import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig } from '../chart.ts'
import { chartToString } from '../core.ts'
import type { Interaction } from '../interaction.ts'
import { chartInteraction, findByClass, findByTag, tableOf } from '../test-utils.ts'
import { type FunnelOptions, funnel } from './funnel.ts'

const size = { width: 400, height: 200 }
const data = [
  { name: 'Visits', value: 1000 },
  { name: 'Signups', value: 400 },
  { name: 'Trials', value: 200 },
  { name: 'Paid', value: 50 },
]
const base: ChartConfig<FunnelOptions> = { type: funnel, data, id: 't', locale: 'en-US' }

const render = (config: Partial<ChartConfig<FunnelOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 't')

const interactionOf = (config: Partial<ChartConfig<FunnelOptions>> = {}): Interaction =>
  chartInteraction({ ...base, ...config }, size, 't')

/** The points of a stage's path: its commands' coordinates, in order. */
const pointsOf = (stage: { attrs: Record<string, unknown> }) =>
  [...String(stage.attrs.d).matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }))
const texts = (node: ReturnType<typeof render>, cls: string) =>
  findByClass(node, cls).map((t) => t.children.join(''))

describe('funnel', () => {
  test('draws a column per stage, each stepping down to the height of the next', () => {
    const node = render({ labels: false, radius: 0 })
    expect(node.attrs.class).toBe('tc-chart tc-chart-funnel')
    const stages = findByClass(node, 'tc-funnel-stage')
    expect(stages).toHaveLength(4)
    // Without corners: start, start again (the corner), its end, the far corner twice, and the floor.
    const tops = stages.map((stage) => {
      const p = pointsOf(stage)
      return { x0: p[0]?.x, y0: p[0]?.y, x1: p[4]?.x, y1: p[4]?.y, floor: p[6]?.y }
    })
    expect(tops).toEqual([
      { x0: 0, y0: 0, x1: 100, y1: 120, floor: 200 },
      { x0: 100, y0: 120, x1: 200, y1: 160, floor: 200 },
      { x0: 200, y0: 160, x1: 300, y1: 190, floor: 200 },
      // The last stage stays level.
      { x0: 300, y0: 190, x1: 400, y1: 190, floor: 200 },
    ])
  })

  test('keeps the order of the data: a stage may outgrow the one before', () => {
    const node = render({
      labels: false,
      radius: 0,
      data: [
        { name: 'A', value: 50 },
        { name: 'B', value: 100 },
      ],
    })
    const [a, b] = findByClass(node, 'tc-funnel-stage').map(pointsOf)
    expect(a?.[0]).toEqual({ x: 0, y: 100 })
    expect(a?.[4]).toEqual({ x: 200, y: 0 })
    expect(b?.[0]).toEqual({ x: 200, y: 0 })
  })

  test('shades the stages from pale to the full color, and keeps custom colors', () => {
    const node = render({
      data: [data[0], { ...data[1], color: '#f76707' }, data[2], data[3]] as never,
    })
    expect(findByClass(node, 'tc-funnel-stage').map((s) => s.attrs.style)).toEqual([
      '--tc-funnel-shade:30%',
      '--tc-funnel-color:#f76707;--tc-funnel-shade:100%',
      '--tc-funnel-shade:76.67%',
      '--tc-funnel-shade:100%',
    ])
    const single = render({ data: [data[0]] as never })
    expect(findByClass(single, 'tc-funnel-stage')[0]?.attrs.style).toBe('--tc-funnel-shade:100%')
  })

  test('rounds the top corners, by at most half of a low stage', () => {
    const node = render({ labels: false, radius: 8 })
    const [first, , , last] = findByClass(node, 'tc-funnel-stage').map(pointsOf)
    // The path starts below the corner, by the radius.
    expect(first?.[0]).toEqual({ x: 0, y: 8 })
    expect(first?.[1]).toEqual({ x: 0, y: 0 })
    // The last stage is 10 pixels high: its corners take 5.
    expect(last?.[0]).toEqual({ x: 300, y: 195 })
  })

  test('writes the name, the value and the share of the first stage above each stage', () => {
    const node = render()
    expect(texts(node, 'tc-funnel-name')).toEqual(['Visits', 'Signups', 'Trials', 'Paid'])
    expect(texts(node, 'tc-funnel-value')).toEqual(['1,000', '400', '200', '50'])
    // Nothing to convert from at the top of the funnel.
    expect(texts(node, 'tc-funnel-share')).toEqual(['40%', '20%', '5%'])
    // The shapes start below the three lines of text.
    const top = pointsOf(findByClass(node, 'tc-funnel-stage')[0] as never)[1]?.y as number
    expect(top).toBeGreaterThan(12 * 1.3 * 3)
    // Text of the first column starts at the edge, of the others inside their divider.
    const xs = findByClass(node, 'tc-funnel-name').map((t) => t.attrs.x)
    expect(xs).toEqual([0, 110, 210, 310])
    expect(findByClass(node, 'tc-funnel-divider').map((l) => l.attrs.x1)).toEqual([100, 200, 300])
  })

  test('labels: false leaves only the shapes; long names are cut', () => {
    expect(findByTag(render({ labels: false }), 'text')).toHaveLength(0)
    const node = render({
      data: [
        { name: 'A very long name of a stage', value: 10 },
        { name: 'B', value: 5 },
        { name: 'C', value: 5 },
        { name: 'D', value: 5 },
      ],
    })
    const [name] = texts(node, 'tc-funnel-name')
    expect(name).toMatch(/^A very.*…$/)
  })

  test('a value too wide for its column is written in compact notation', () => {
    const data = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((name, i) => ({
      name,
      value: 1234567 - i * 100000,
    }))
    expect(texts(render({ data }), 'tc-funnel-value')[1]).toBe('1.1M')
    // A function is the caller's own wording: it is left out, not rewritten.
    const own = render({ data, format: (v: number) => `${v} visits` })
    expect(texts(own, 'tc-funnel-value')).toEqual([])
  })

  test('formats the values', () => {
    const node = render({ format: { notation: 'compact' }, data: [{ name: 'A', value: 12400 }] })
    expect(texts(node, 'tc-funnel-value')).toEqual(['12K'])
  })

  test('the whole column is the hit area, with the conversion rates in the tooltip', () => {
    const interaction = interactionOf()
    expect(interaction.count).toBe(4)
    expect(interaction.hitTest(-1, 10)).toBeNull()
    // Far above the low shape of the last stage.
    const hit = interaction.hitTest(350, 5)
    expect(hit?.index).toBe(3)
    expect(hit?.highlight).toEqual({ kind: 'band', x: 300, y: 0, width: 100, height: 200 })
    expect(hit?.items.map((item) => [item.name, item.text])).toEqual([
      ['Paid', '50'],
      ['of Visits', '5%'],
      ['of Trials', '25%'],
    ])
    // The rates are notes: no swatch, and no value label.
    expect(hit?.items.map((item) => item.y === null)).toEqual([false, true, true])
    expect(hit?.items[1]?.color).toBe('transparent')
    // The first stage has nothing before it, and the second one's previous stage is the first.
    expect(interaction.hitIndex(0)?.items).toHaveLength(1)
    expect(interaction.hitIndex(1)?.items.map((item) => item.name)).toEqual([
      'Signups',
      'of Visits',
    ])
    expect(interaction.hitIndex(4)).toBeNull()
  })

  test('stages without a count are left out, and zeros are drawn flat', () => {
    const node = render({
      labels: false,
      radius: 0,
      data: [
        { name: 'A', value: 10 },
        { name: 'B', value: Number.NaN },
        { name: 'C', value: -3 },
        { name: 'D', value: null },
        { name: 'E', value: 0 },
      ] as never,
    })
    const stages = findByClass(node, 'tc-funnel-stage')
    expect(stages.map((s) => s.attrs['data-series'])).toEqual(['A', 'E'])
    expect(pointsOf(stages[1] as never)[0]).toEqual({ x: 200, y: 200 })
    // Nothing but zeros, or nothing at all, still renders.
    expect(
      findByClass(render({ data: [{ name: 'A', value: 0 }] }), 'tc-funnel-stage'),
    ).toHaveLength(1)
    expect(findByClass(render({ data: [] }), 'tc-funnel-stage')).toHaveLength(0)
    expect(findByClass(render({ data: 'junk' as never }), 'tc-funnel-stage')).toHaveLength(0)
  })

  test('has no legend, and a table with both rates', () => {
    expect(funnel.legend).toBeUndefined()
    expect(tableOf({ ...(funnel.clean?.(base) as FunnelOptions), type: funnel }, 3)).toEqual({
      columns: ['', 'Value', 'Of first', 'Of previous'],
      rows: [
        ['Visits', '1,000', '100%', '100%'],
        ['Signups', '400', '40%', '40%'],
        ['Trials', '200', '20%', '50%'],
      ],
      total: 4,
    })
  })

  test('renders to a string on the server', () => {
    const html = chartToString(base, size)
    expect(html).toContain('tc-chart-funnel')
    expect(html).toContain('tc-funnel-stage')
  })
})
