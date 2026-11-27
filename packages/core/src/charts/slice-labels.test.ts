import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig } from '../chart.ts'
import { features } from '../features.ts'
import { findByClass } from '../test-utils.ts'
import '../slice-labels.ts'
import { donut, type PieOptions, pie } from './pie.ts'

const size = { width: 600, height: 300 }
const data = [
  { name: 'Direct', value: 50 },
  { name: 'Search', value: 30 },
  { name: 'Social', value: 15 },
  { name: 'Email', value: 5 },
]
const base: ChartConfig<PieOptions> = { type: pie, data, id: 'p', locale: 'en-US' }
const render = (config: Partial<ChartConfig<PieOptions>> = {}, at = size) =>
  buildChart({ ...base, ...config }, at, 'p')
const texts = (node: ReturnType<typeof render>) =>
  findByClass(node, 'tc-slice-label-text').map((text) =>
    text.children.map((c) => (typeof c === 'string' ? c : c?.children[0])).join(''),
  )
/** `translate(x, y)` of a label's text. */
const at = (text: { attrs: Record<string, unknown> }) =>
  (/translate\((-?[\d.]+)px,(-?[\d.]+)px\)/.exec(String(text.attrs.style)) ?? [])
    .slice(1)
    .map(Number) as [number, number]

describe('pie labels', () => {
  test('are off by default', () => {
    expect(findByClass(render(), 'tc-slice-labels')).toHaveLength(0)
  })

  test('name every slice with its share, in the color slot of its slice', () => {
    const node = render({ labels: true })
    expect(texts(node).sort()).toEqual(
      ['Direct — 50%', 'Search — 30%', 'Social — 15%', 'Email — 5%'].sort(),
    )
    const groups = findByClass(node, 'tc-slice-label')
    expect(groups.map((g) => g.key).sort()).toEqual(['Direct', 'Email', 'Search', 'Social'])
    expect(groups.find((g) => g.key === 'Search')?.attrs.class).toBe(
      'tc-slice-label tc-series tc-series-2',
    )
    expect(findByClass(node, 'tc-slice-label-line')).toHaveLength(4)
  })

  test('write the values, or the names alone', () => {
    expect(texts(render({ labels: { value: 'value' } }))).toContain('Direct — 50')
    expect(texts(render({ labels: { value: false } })).sort()).toEqual([
      'Direct',
      'Email',
      'Search',
      'Social',
    ])
  })

  test('stand on the side of their slice: right of the pie, or left of it', () => {
    const labels = findByClass(render({ labels: true }), 'tc-slice-label')
    const text = (key: string) =>
      findByClass(labels.find((g) => g.key === key) as never, 'tc-slice-label-text')[0] as never
    // Direct covers the right half; Email ends the circle, on the left.
    expect((text('Direct') as { attrs: Record<string, unknown> }).attrs['text-anchor']).toBe(
      'start',
    )
    expect((text('Email') as { attrs: Record<string, unknown> }).attrs['text-anchor']).toBe('end')
    expect(at(text('Direct'))[0]).toBeGreaterThan(300)
    expect(at(text('Email'))[0]).toBeLessThan(300)
  })

  test('make the pie smaller to leave them room', () => {
    const width = (node: ReturnType<typeof render>) =>
      String(findByClass(node, 'tc-slice')[0]?.attrs.d).length > 0
        ? Number(/A([\d.]+)/.exec(String(findByClass(node, 'tc-slice')[0]?.attrs.d))?.[1])
        : 0
    expect(width(render({ labels: true }))).toBeLessThan(width(render()))
  })

  test('never overlap: labels of small neighboring slices are moved apart', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ name: `Small ${i}`, value: 1 }))
    const node = render({
      data: [{ name: 'Big', value: 200 }, ...many],
      labels: true,
      maxSlices: 9,
    })
    const left = findByClass(node, 'tc-slice-label-text')
      .filter((text) => text.attrs['text-anchor'] === 'end')
      .map((text) => at(text)[1])
      .sort((a, b) => a - b)
    expect(left.length).toBeGreaterThan(3)
    for (let i = 1; i < left.length; i++) {
      expect((left[i] as number) - (left[i - 1] as number)).toBeGreaterThanOrEqual(14.9)
    }
  })

  test('are left out when the chart is too small for them', () => {
    const node = render({ labels: true }, { width: 160, height: 120 })
    expect(findByClass(node, 'tc-slice-labels')).toHaveLength(0)
    expect(findByClass(node, 'tc-slice')).toHaveLength(4)
  })

  test('skip hidden slices, and work in a donut', () => {
    const node = buildChart(
      {
        ...base,
        type: donut,
        labels: true,
        data: [...data.slice(0, 3), { ...data[3], hidden: true }],
      } as never,
      size,
      'p',
    )
    expect(texts(node)).toHaveLength(3)
  })

  test('need the feature on the core', () => {
    const saved = features['slice-labels']
    delete features['slice-labels']
    try {
      expect(() => render({ labels: true })).toThrow('@tabler/charts/slice-labels')
    } finally {
      features['slice-labels'] = saved
    }
  })
})
