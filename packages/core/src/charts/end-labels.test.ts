import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig } from '../chart.ts'
import '../end-labels.ts'
import { features } from '../features.ts'
import { findByClass } from '../test-utils.ts'
import type { VNode } from '../vnode.ts'
import { type LineOptions, line } from './line.ts'

const size = { width: 400, height: 200 }
const base: ChartConfig<LineOptions> = {
  type: line,
  id: 'e',
  locale: 'en-US',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    series: [
      { name: 'Sales', values: [10, 30, 20, 40] },
      { name: 'Costs', values: [5, 15, 25, 39] },
      { name: 'Empty', values: [null, null, null, null] },
    ],
  },
}
const render = (config: Partial<ChartConfig<LineOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'e')

const textOf = (node: VNode): string =>
  node.children.map((c) => (typeof c === 'string' ? c : textOf(c))).join(' ')
const texts = (node: VNode) => findByClass(node, 'tc-end-label-text')
const offset = (node: VNode) =>
  (String(node.attrs.style).match(/translate\((-?[\d.]+)px,(-?[\d.]+)px/) ?? [])
    .slice(1)
    .map(Number) as [number, number]
const plotEnd = (node: VNode) => {
  const rect = findByClass(node, 'tc-series-list')[0] as VNode
  const d = String(findByClass(rect, 'tc-line')[0]?.attrs.d)
  return Math.max(...[...d.matchAll(/(-?[\d.]+),/g)].map((m) => Number(m[1])))
}

describe('endLabels', () => {
  test('off by default', () => {
    expect(texts(render())).toEqual([])
  })

  test('names every series that has a value, with its last value', () => {
    const labels = texts(render({ endLabels: true })).map(textOf)
    expect(labels.sort()).toEqual(['Costs 39', 'Sales 40'])
  })

  test('formats the values, or leaves them out', () => {
    const format = (v: number) => `${v}%`
    expect(texts(render({ endLabels: { format } })).map(textOf)).toContain('Sales 40%')
    expect(texts(render({ endLabels: { value: false } })).map(textOf)).toContain('Sales')
  })

  test('the plot leaves room: labels start past the end of the lines and stay in the chart', () => {
    const without = plotEnd(render())
    const node = render({ endLabels: true })
    const end = plotEnd(node)
    expect(end).toBeLessThan(without - 40)
    for (const label of texts(node)) expect(offset(label)[0]).toBeGreaterThan(end)
  })

  test('labels of lines that end together are a line apart, and joined to their points', () => {
    const node = render({ endLabels: true })
    const [a, b] = texts(node).map((t) => offset(t)[1]) as [number, number]
    expect(Math.abs(a - b)).toBeGreaterThanOrEqual(15)
    expect(findByClass(node, 'tc-end-label-line').length).toBeGreaterThan(0)
  })

  test('hidden series get no label', () => {
    const [sales, costs] = base.data.series
    const series = [sales, { ...costs, hidden: true }] as LineOptions['data']['series']
    const node = render({ endLabels: true, data: { ...base.data, series } })
    expect(texts(node).map(textOf)).toEqual(['Sales 40'])
  })

  test('right to left: labels stand on the left, anchored at their end', () => {
    const node = render({ endLabels: true, rtl: true })
    const label = texts(node)[0] as VNode
    expect(label.attrs['text-anchor']).toBe('end')
    expect(offset(label)[0]).toBeLessThan(200)
  })

  test('without the module the option names the import', () => {
    const kept = features['end-labels']
    delete features['end-labels']
    try {
      expect(() => render({ endLabels: true })).toThrow('@tabler/charts/end-labels')
    } finally {
      features['end-labels'] = kept
    }
  })
})
