import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig } from '../chart.ts'
import '../annotations.ts'
import '../time.ts'
import { findByClass, gridLineOffset } from '../test-utils.ts'
import type { VNode } from '../vnode.ts'
import type { Annotation } from './annotations.ts'
import { bar } from './bar.ts'
import { candlestick } from './candlestick.ts'
import { line } from './line.ts'

const size = { width: 400, height: 200 }
const data = {
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [{ name: 'A', values: [10, 30, 20, 40] }],
}

const render = (config: Partial<ChartConfig<object>> & { annotations: Annotation[] }) =>
  buildChart(
    { type: line, data, id: 'a', locale: 'en-US', ...config } as ChartConfig<object>,
    size,
    'a',
  )

const num = (v: unknown) => Number(v)
const lines = (node: VNode) => findByClass(node, 'tc-annotation-line')
const labels = (node: VNode) =>
  findByClass(node, 'tc-annotation-label').map((t) => t.children.join(''))
/** The value of the topmost y axis tick. */
const topTick = (node: VNode) =>
  Math.max(
    ...findByClass(findByClass(node, 'tc-axis-y')[0] ?? node, 'tc-tick-label')
      .map((t) => Number(t.children.join('')))
      .filter(Number.isFinite),
  )

describe('annotations', () => {
  test('a value line spans the plot area, with its label', () => {
    const node = render({ annotations: [{ y: 25, label: 'Target' }] })
    const [l] = lines(node)
    expect(l?.attrs.y1).toBe(l?.attrs.y2)
    expect(num(l?.attrs.x2)).toBeGreaterThan(num(l?.attrs.x1))
    expect(labels(node)).toEqual(['Target'])
    // 25 sits exactly halfway between the 20 and 30 grid lines.
    const grid = (v: number) =>
      gridLineOffset(findByClass(node, 'tc-grid-line').find((g) => g.key === v))
    expect(num(l?.attrs.y1)).toBeCloseTo((grid(20) + grid(30)) / 2, 1)
  })

  test('the value axis grows to include a target above the data', () => {
    expect(topTick(render({ annotations: [] }))).toBe(40)
    expect(topTick(render({ annotations: [{ y: 70, label: 'Goal' }] }))).toBeGreaterThanOrEqual(70)
    expect(topTick(render({ annotations: [{ y: [50, 80] }] }))).toBeGreaterThanOrEqual(80)
  })

  test('bands go under the series, lines and labels above them and under the axes', () => {
    const node = render({
      annotations: [{ y: [15, 25], label: 'Normal' }, { y: 35 }],
    })
    // The layers are direct children of the svg, in drawing order.
    const top = node.children
      .filter((c): c is VNode => typeof c !== 'string')
      .map((c) => String(c.attrs.class).split(' ')[0])
    const notes = top.flatMap((cls, i) => (cls === 'tc-annotations' ? [i] : []))
    const series = top.indexOf('tc-series-list')
    const firstAxis = top.indexOf('tc-axis')
    expect(notes).toHaveLength(2)
    expect(notes[0]).toBeLessThan(series)
    expect(notes[1]).toBeGreaterThan(series)
    expect(notes[1]).toBeLessThan(firstAxis)
    expect(findByClass(node, 'tc-annotation-band')).toHaveLength(1)
    expect(labels(node)).toEqual(['Normal'])
  })

  test('a category line marks the band center on bars, the point on lines', () => {
    const onBar = render({ type: bar, annotations: [{ x: 'Q2', label: 'Launch' }] } as never)
    const bars = findByClass(onBar, 'tc-bar')
    expect(bars).toHaveLength(4)
    const [l] = lines(onBar)
    expect(l?.attrs.x1).toBe(l?.attrs.x2)
    const onLine = render({ annotations: [{ x: 'Q1' }, { x: 'Q4' }] })
    const [first, last] = lines(onLine)
    expect(num(first?.attrs.x1)).toBeLessThan(num(last?.attrs.x1))
    // Unknown categories are skipped.
    expect(lines(render({ annotations: [{ x: 'Q9' }] }))).toHaveLength(0)
  })

  test('a category band covers whole bands, from the first to the last', () => {
    const node = render({ type: bar, annotations: [{ x: ['Q2', 'Q3'], label: 'Promo' }] } as never)
    const d = String(findByClass(node, 'tc-annotation-band')[0]?.attrs.d)
    const [x0, , x1] = d.match(/[\d.]+/g)?.map(Number) ?? []
    const bars = findByClass(node, 'tc-bar')
    const left = (i: number) => Number(String(bars[i]?.attrs.d).match(/^M([\d.]+)/)?.[1])
    expect(x0).toBeLessThanOrEqual(left(1))
    expect(x1).toBeGreaterThan(left(2))
    expect(labels(node)).toEqual(['Promo'])
  })

  test('dates on a time axis, between the labels', () => {
    const days = [Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 3), Date.UTC(2026, 0, 5)]
    const node = render({
      data: { labels: days, series: [{ name: 'A', values: [1, 2, 3] }] },
      x: { type: 'time', utc: true },
      annotations: [
        { x: new Date(Date.UTC(2026, 0, 2)), label: 'Deploy' },
        { x: days[0] as number },
      ],
    } as never)
    const [deploy, first] = lines(node)
    expect(num(deploy?.attrs.x1)).toBeGreaterThan(num(first?.attrs.x1))
  })

  test('skips annotations outside a fixed axis range', () => {
    const node = render({
      y: { max: 50 },
      annotations: [{ y: 90, label: 'Off the chart' }],
    } as never)
    expect(topTick(node)).toBe(50)
    expect(lines(node)).toHaveLength(0)
    expect(labels(node)).toEqual([])
  })

  test('colors, classes and keys', () => {
    const node = render({
      annotations: [{ y: 20, color: '#d63939', class: 'is-limit', id: 'limit' }],
    })
    const group = findByClass(node, 'tc-annotation')[0]
    expect(group?.key).toBe('limit')
    expect(group?.attrs.class).toBe('tc-annotation tc-annotation-y is-limit')
    expect(group?.attrs.style).toBe('--tc-annotation-color:#d63939')
  })

  test('horizontal bars turn a value line vertical', () => {
    const node = render({
      type: bar,
      orientation: 'horizontal',
      annotations: [{ y: 25, label: 'Target' }, { x: 'Q2' }],
    } as never)
    const [value, category] = lines(node)
    expect(value?.attrs.x1).toBe(value?.attrs.x2)
    expect(category?.attrs.y1).toBe(category?.attrs.y2)
  })

  test('candlesticks take annotations too', () => {
    const node = buildChart(
      {
        type: candlestick,
        data: [
          { x: 'a', open: 1, high: 3, low: 0.5, close: 2 },
          { x: 'b', open: 2, high: 4, low: 1, close: 3 },
        ],
        annotations: [{ y: 5, label: 'Target' }],
        id: 'c',
        locale: 'en-US',
      } as ChartConfig<object>,
      size,
      'c',
    )
    expect(lines(node)).toHaveLength(1)
    expect(topTick(node)).toBeGreaterThanOrEqual(5)
  })
})
