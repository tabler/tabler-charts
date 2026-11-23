import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, renderChart } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { estimateTextWidth } from '../layout.ts'
import { chartInteraction, findByClass } from '../test-utils.ts'
import type { VNode } from '../vnode.ts'
import { type RadarOptions, radar } from './radar.ts'

const size = { width: 400, height: 300 }
const data = {
  labels: ['Speed', 'Range', 'Comfort', 'Price', 'Safety'],
  series: [
    { name: 'A', values: [80, 60, 70, 40, 90] },
    { name: 'B', values: [50, 90, 40, 70, 60] },
  ],
}
const base: ChartConfig<RadarOptions> = { type: radar, data, id: 'r', locale: 'en-US' }

const render = (config: Partial<ChartConfig<RadarOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'r')

const interactionOf = (config: Partial<ChartConfig<RadarOptions>> = {}): Interaction =>
  chartInteraction({ ...base, ...config }, size, 'r')

/** Vertices of a closed polygon path. */
const vertices = (d: unknown) =>
  [...String(d).matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])
const signature = (d: unknown) => String(d).replace(/[^MLAZ]/g, '')
const center = (node: VNode) => {
  const spoke = findByClass(node, 'tc-radar-spoke')[0]
  return [Number(spoke?.attrs.x1), Number(spoke?.attrs.y1)] as const
}

describe('radar', () => {
  test('draws one spoke per label and a closed polygon per series', () => {
    const node = render()
    expect(node.attrs.class).toBe('tc-chart tc-chart-radar')
    expect(findByClass(node, 'tc-radar-spoke')).toHaveLength(5)
    const lines = findByClass(node, 'tc-line')
    expect(lines).toHaveLength(2)
    expect(signature(lines[0]?.attrs.d)).toBe('MLLLLZ')
    // Filled by default, with the same outline.
    const areas = findByClass(node, 'tc-area')
    expect(areas[0]?.attrs.d).toBe(lines[0]?.attrs.d)
    expect(findByClass(render({ fill: false }), 'tc-area')).toHaveLength(0)
  })

  test('the first spoke points up and values grow outwards', () => {
    const node = render()
    const [cx, cy] = center(node)
    const [first] = vertices(findByClass(node, 'tc-line')[0]?.attrs.d)
    expect(first?.[0]).toBeCloseTo(cx, 1)
    expect(first?.[1]).toBeLessThan(cy)
    const spoke = findByClass(node, 'tc-radar-spoke')[0]
    const outer = cy - Number(spoke?.attrs.y2)
    // 80 of a 0…100 axis.
    expect((cy - (first?.[1] ?? 0)) / outer).toBeCloseTo(0.8, 1)
  })

  test('missing values sit at the center, so the path keeps its commands', () => {
    const node = render({
      data: { labels: data.labels, series: [{ name: 'A', values: [80, null, 70] }] },
      points: true,
    })
    const d = findByClass(node, 'tc-line')[0]?.attrs.d
    expect(signature(d)).toBe('MLLLLZ')
    const [cx, cy] = center(node)
    const points = vertices(d)
    for (const i of [1, 3, 4]) {
      expect(points[i]?.[0]).toBeCloseTo(cx, 1)
      expect(points[i]?.[1]).toBeCloseTo(cy, 1)
    }
    // Dots only where there are values.
    expect(findByClass(node, 'tc-point')).toHaveLength(2)
  })

  test('rings at the ticks, as polygons or circles, with value labels', () => {
    const node = render()
    const rings = findByClass(node, 'tc-radar-ring')
    expect(rings.length).toBeGreaterThanOrEqual(2)
    expect(signature(rings[0]?.attrs.d)).toBe('MLLLLZ')
    const values = findByClass(node, 'tc-radar-value').map((t) => t.children.join(''))
    expect(values.at(-1)).toBe('100')
    expect(values).not.toContain('0')
    const circles = findByClass(render({ grid: 'circle' }), 'tc-radar-ring')
    expect(signature(circles[0]?.attrs.d)).toBe('MAAZ')
    expect(findByClass(render({ r: { show: false } }), 'tc-radar-value')).toHaveLength(0)
  })

  test('honours the axis range and format', () => {
    const node = render({ r: { min: 0, max: 200, format: { style: 'percent' } } })
    const values = findByClass(node, 'tc-radar-value').map((t) => t.children.join(''))
    expect(values.at(-1)).toBe('20,000%')
  })

  test('spoke labels sit on the side their spoke points to, inside the chart', () => {
    const node = render()
    const labels = findByClass(node, 'tc-radar-label')
    expect(labels.map((l) => l.children.join(''))).toEqual(data.labels)
    expect(labels.map((l) => l.attrs['text-anchor'])).toEqual([
      'middle',
      'start',
      'start',
      'end',
      'end',
    ])
    for (const label of labels) {
      const x = Number(label.attrs.x)
      const w = estimateTextWidth(label.children.join(''), 12)
      const anchor = label.attrs['text-anchor']
      const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2
      expect(left).toBeGreaterThanOrEqual(0)
      expect(left + w).toBeLessThanOrEqual(size.width)
      expect(Number(label.attrs.y)).toBeGreaterThan(0)
      expect(Number(label.attrs.y)).toBeLessThan(size.height)
    }
  })

  /** The lines of a spoke label: its text, then every tspan. */
  const linesOf = (label: VNode | undefined) =>
    (label?.children ?? []).map((child) =>
      typeof child === 'string' ? child : (child as VNode).children.join(''),
    )

  test('long labels wrap at their spaces, so the radius stays large', () => {
    const short = render()
    const labels = data.labels.map((l) => `${l} and a much longer name`)
    const long = render({ data: { ...data, labels } })
    const radius = (node: VNode) => {
      const spoke = findByClass(node, 'tc-radar-spoke')[0]
      return Number(spoke?.attrs.y1) - Number(spoke?.attrs.y2)
    }
    expect(radius(long)).toBeGreaterThan(radius(short) * 0.6)
    const nodes = findByClass(long, 'tc-radar-label')
    for (const [i, label] of nodes.entries()) {
      const lines = linesOf(label)
      // Whole, on a few lines no wider than a quarter of the chart.
      expect(lines.length).toBeGreaterThan(1)
      expect(lines.length).toBeLessThanOrEqual(3)
      expect(lines.join(' ')).toBe(labels[i])
      for (const line of lines) expect(estimateTextWidth(line, 12)).toBeLessThanOrEqual(100)
      // Every line on the same x, one line height apart.
      const spans = label.children.slice(1) as VNode[]
      for (const span of spans) {
        expect(span.tag).toBe('tspan')
        expect(span.attrs.x).toBe(label.attrs.x)
        expect(span.attrs.dy).toBe('1.25em')
      }
    }
    // The top label moves up for its other lines, side labels center the block.
    const top = nodes[0]
    expect(top?.attrs.dy).toBe(`${-(linesOf(top).length - 1) * 1.25}em`)
    const side = nodes[1]
    expect(Number.parseFloat(String(side?.attrs.dy))).toBeLessThan(0.35)
    // Short labels are untouched.
    expect(findByClass(short, 'tc-radar-label').map(linesOf)).toEqual(data.labels.map((l) => [l]))
  })

  test('labelWidth sets where labels wrap', () => {
    const labels = data.labels.map((l) => `${l} and a much longer name`)
    const wide = render({ data: { ...data, labels }, labelWidth: 1000 })
    const lines = findByClass(wide, 'tc-radar-label').map(linesOf)
    expect(lines.every((l) => l.length === 1)).toBe(true)
    const narrow = render({ data: { ...data, labels }, labelWidth: 10 })
    for (const label of findByClass(narrow, 'tc-radar-label')) {
      // One word per line, the rest joined into the third.
      expect(linesOf(label)).toHaveLength(3)
    }
  })

  test('a word that still does not fit is cut short, inside the chart', () => {
    const labels = data.labels.map((l) => `${l}${'x'.repeat(40)}`)
    const long = render({ data: { ...data, labels } })
    const radius = (node: VNode) => {
      const spoke = findByClass(node, 'tc-radar-spoke')[0]
      return Number(spoke?.attrs.y1) - Number(spoke?.attrs.y2)
    }
    expect(radius(long)).toBeLessThan(radius(render()))
    expect(radius(long)).toBeGreaterThan(50)
    const side = findByClass(long, 'tc-radar-label')[1]
    expect(side?.children.join('')).toMatch(/…$/)
    const w = estimateTextWidth(side?.children.join('') ?? '', 12)
    expect(Number(side?.attrs.x) + w).toBeLessThanOrEqual(size.width)
    // Tooltips keep the name.
    const hit = renderChart({ ...base, data: { ...data, labels } }, size, 'r').interaction
    expect(hit?.hitIndex(1)?.title).toBe(labels[1])
  })

  test('hidden series are left out of the polygons and the domain', () => {
    const node = render({
      data: { ...data, series: [data.series[0], { ...data.series[1], hidden: true }] },
    } as never)
    expect(findByClass(node, 'tc-line')).toHaveLength(1)
    expect(findByClass(node, 'tc-series')[0]?.attrs['data-series']).toBe('A')
  })

  test('hovering picks the nearest spoke, with every value and the spoke as guide', () => {
    const interaction = interactionOf()
    const node = render()
    const [cx, cy] = center(node)
    expect(interaction.count).toBe(5)
    // Straight up: the first spoke; to the lower left: the fourth.
    const up = interaction.hitTest(cx, cy - 40)
    expect(up?.index).toBe(0)
    expect(up?.title).toBe('Speed')
    expect(up?.items.map((i) => i.text)).toEqual(['80', '50'])
    expect(up?.guide?.x1).toBeCloseTo(cx)
    expect(up?.guide?.y2).toBeLessThan(cy)
    expect(interaction.hitTest(cx - 30, cy + 40)?.index).toBe(3)
    // Outside the outer ring: nothing.
    expect(interaction.hitTest(2, 2)).toBeNull()
  })

  test('keyboard hits focus a series', () => {
    const hit = interactionOf().hitIndex(2, 1)
    expect(hit?.seriesIndex).toBe(1)
    expect(interactionOf().hitIndex(9)).toBeNull()
  })

  test('legend and data table', () => {
    expect(radar.legend?.(base).map((i) => i.name)).toEqual(['A', 'B'])
    const ctx = { hidden: new Set<string>(), locale: 'en-US' } as never
    const table = radar.table?.(
      { ...base, r: { format: { style: 'percent' } } },
      ctx,
      Number.POSITIVE_INFINITY,
    )
    expect(table?.columns).toEqual(['', 'A', 'B'])
    expect(table?.rows[0]).toEqual(['Speed', '8,000%', '5,000%'])
  })

  test('renders an empty chart without labels', () => {
    const node = render({ data: { labels: [], series: [] } })
    expect(findByClass(node, 'tc-radar-spoke')).toHaveLength(0)
    expect(interactionOf({ data: { labels: [], series: [] } }).hitTest(200, 150)).toBeNull()
  })
})
