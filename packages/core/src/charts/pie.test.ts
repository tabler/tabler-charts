import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { chartInteraction, findByClass, highlightOf, tableOf } from '../test-utils.ts'
import { donut, type PieOptions, pie } from './pie.ts'

const size = { width: 300, height: 200 }
const data = [
  { name: 'Direct', value: 50 },
  { name: 'Search', value: 30 },
  { name: 'Social', value: 20, color: '#f00' },
]
const base: ChartConfig<PieOptions> = { type: pie, data, id: 'p', locale: 'en-US' }

const render = (config: Partial<ChartConfig<PieOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'p')

const interactionOf = (config: Partial<ChartConfig<PieOptions>> = {}): Interaction =>
  chartInteraction({ ...base, ...config }, size, 'p')

describe('pie', () => {
  test('renders one keyed slice group per entry in palette slots', () => {
    const node = render()
    const groups = findByClass(node, 'tc-series')
    expect(groups.map((g) => g.key)).toEqual(['Direct', 'Search', 'Social'])
    expect(groups.map((g) => g.attrs.class)).toEqual([
      'tc-series tc-series-1',
      'tc-series tc-series-2',
      'tc-series tc-series-3',
    ])
    expect(groups[2]?.attrs.style).toBe('--tc-series-color:#f00')
    expect(findByClass(node, 'tc-slice')).toHaveLength(3)
    expect(node.attrs.class).toBe('tc-chart tc-chart-pie')
  })

  test('centers the pie in the chart', () => {
    const [group] = findByClass(render(), 'tc-pie')
    expect(group?.attrs.style).toBe('transform:translate(150px,100px)')
  })

  test('starts the first slice at 12 o’clock and goes clockwise', () => {
    const hit = interactionOf()
    // Just right of 12 o'clock is the first slice, just left of it the last.
    expect(hit.hitTest(155, 30)?.label).toBe('Direct')
    expect(hit.hitTest(145, 30)?.label).toBe('Social')
    // The bottom (6 o'clock) is where Direct (50%) ends and Search begins.
    expect(hit.hitTest(149, 170)?.label).toBe('Search')
  })

  test('honours startAngle', () => {
    const hit = interactionOf({ startAngle: 90 })
    expect(hit.hitTest(220, 105)?.label).toBe('Direct')
  })

  test('reports value and share for the slice under the pointer', () => {
    const hit = interactionOf().hitTest(155, 30)
    expect(hit?.title).toBe('')
    expect(hit?.items).toHaveLength(1)
    expect(hit?.items[0]?.text).toBe('50 (50%)')
    expect(hit?.seriesIndex).toBe(0)
    expect(highlightOf(hit, 'halo')?.d).toMatch(/^M/)
  })

  test('ignores the center of a donut and points outside', () => {
    const hit = interactionOf({ type: donut })
    expect(hit.hitTest(150, 100)).toBeNull()
    expect(hit.hitTest(5, 5)).toBeNull()
  })

  test('walks slices by index for the keyboard', () => {
    const hit = interactionOf()
    expect(hit.count).toBe(3)
    expect([0, 1, 2].map((i) => hit.hitIndex(i)?.label)).toEqual(['Direct', 'Search', 'Social'])
    expect(hit.hitIndex(3)).toBeNull()
  })

  test('hidden slices leave the whole but keep their color slots', () => {
    const node = render({
      data: [data[0], { ...data[1], hidden: true }, data[2]] as PieOptions['data'],
    })
    const groups = findByClass(node, 'tc-series').map((g) => g.attrs.class)
    expect(groups).toEqual(['tc-series tc-series-1', 'tc-series tc-series-3'])
    const hit = interactionOf({
      data: [data[0], { ...data[1], hidden: true }, data[2]] as PieOptions['data'],
    })
    expect(hit.hitIndex(0)?.items[0]?.text).toBe('50 (71.4%)')
  })

  test('draws a track instead of slices when everything is zero', () => {
    const node = render({ data: [{ name: 'A', value: 0 }] })
    // The empty slice keeps a path without area, to grow from when data comes.
    expect(findByClass(node, 'tc-slice').map((s) => s.arc)).toEqual([[0, 92, 0, 0, 0, 0]])
    expect(findByClass(node, 'tc-pie-track')).toHaveLength(1)
    expect(() => chartToString({ ...base, data: [] }, size)).not.toThrow()
  })

  test('an empty slice between others is a line in their gap', () => {
    const node = render({
      type: donut,
      data: [
        { name: 'A', value: 1 },
        { name: 'B', value: 0 },
        { name: 'C', value: 1 },
      ],
    })
    const [, empty] = findByClass(node, 'tc-slice')
    expect(empty?.arc?.[2]).toBeCloseTo(Math.PI)
    expect(empty?.arc?.[3]).toBeCloseTo(Math.PI)
    // The arc stays out of the markup.
    expect(Object.keys(empty?.attrs ?? {})).toEqual(['class', 'd'])
    // Every point of it lies on the radius where A ends and C starts.
    const points = [...String(empty?.attrs.d).matchAll(/(-?[\d.]+),(-?[\d.]+)(?=[A-Z]|$)/g)]
    expect(points.length).toBeGreaterThan(0)
    for (const [, x] of points) expect(Math.abs(Number(x))).toBeLessThan(0.01)
    expect(interactionOf({ type: donut, data: [{ name: 'B', value: 0 }, ...data] }).count).toBe(3)
  })

  test('draws pie gaps as a parallel stroke and donut gaps as a pad angle', () => {
    const pieNode = render()
    expect(findByClass(pieNode, 'tc-pie-slices')[0]?.attrs.style).toBe('--tc-pie-gap:2px')
    // No pad angle on the pie: the first slice starts exactly at 12 o'clock.
    expect(findByClass(pieNode, 'tc-slice')[0]?.attrs.d).toMatch(/^M0,-/)
    const donutNode = render({ type: donut })
    expect(findByClass(donutNode, 'tc-pie-slices')[0]?.attrs.style).toBeUndefined()
    expect(findByClass(donutNode, 'tc-slice')[0]?.attrs.d).not.toMatch(/^M0,-/)
    expect(findByClass(render({ gap: 0 }), 'tc-pie-slices')[0]?.attrs.style).toBeUndefined()
  })

  test('gives a single slice a full ring without a gap', () => {
    const d = String(
      findByClass(render({ data: [{ name: 'Only', value: 5 }] }), 'tc-slice')[0]?.attrs.d,
    )
    // Starts at 12 o'clock with the fixed slice structure (no pad angle applied).
    expect(d).toMatch(/^M0,-/)
    expect(d.replace(/[^MLAZ]/g, '')).toBe('MAAAALAAAAZ')
  })

  test('describes the data as a table with shares', () => {
    const table = tableOf(base, 100)
    expect(table).toEqual({
      columns: ['', 'Value', 'Share'],
      rows: [
        ['Direct', '50', '50%'],
        ['Search', '30', '30%'],
        ['Social', '20', '20%'],
      ],
    })
  })

  test('lists slices in the legend', () => {
    expect(pie.legend?.(base)?.map((i) => [i.key, i.index])).toEqual([
      ['Direct', 0],
      ['Search', 1],
      ['Social', 2],
    ])
  })
})

describe('donut', () => {
  test('shows the formatted total in the hole', () => {
    const svg = chartToString(
      { ...base, type: donut, format: { style: 'currency', currency: 'USD' } },
      size,
    )
    expect(svg).toContain('class="tc-chart tc-chart-donut"')
    expect(svg).toMatch(/<text class="tc-pie-value"[^>]*>\$100\.00<\/text>/)
  })

  test('accepts a custom center or none', () => {
    const custom = chartToString(
      { ...base, type: donut, center: { value: '42%', label: 'Direct' } },
      size,
    )
    expect(custom).toContain('>42%</text>')
    expect(custom).toContain('<text class="tc-pie-label"')
    expect(chartToString({ ...base, type: donut, center: false }, size)).not.toContain(
      'tc-pie-value',
    )
    expect(chartToString(base, size)).not.toContain('tc-pie-value')
  })

  test('keeps slices inside the chart', () => {
    const node = buildChart({ ...base, type: donut }, size, 'd')
    for (const slice of findByClass(node, 'tc-slice')) {
      for (const n of String(slice.attrs.d).match(/-?[\d.]+,-?[\d.]+/g) ?? []) {
        const [x, y] = n.split(',').map(Number)
        expect(Math.abs(x ?? 0)).toBeLessThanOrEqual(100)
        expect(Math.abs(y ?? 0)).toBeLessThanOrEqual(100)
      }
    }
  })

  test('matches the snapshot', () => {
    expect(chartToString({ ...base, type: donut }, size)).toMatchSnapshot()
  })
})

describe('maxSlices', () => {
  const many = [5, 30, 10, 20, 8, 15, 12].map((value, i) => ({ name: `n${i}`, value }))
  const options = { data: many, maxSlices: 4 }

  test('nine slices at most by default, the rest included; zero never groups', () => {
    expect(findByClass(render({ data: many }), 'tc-series').length).toBe(7)
    expect(findByClass(render({ data: many, maxSlices: 7 }), 'tc-series').length).toBe(7)
    const twelve = Array.from({ length: 12 }, (_, i) => ({ name: `n${i}`, value: i + 1 }))
    expect(findByClass(render({ data: twelve }), 'tc-series').length).toBe(9)
    expect(findByClass(render({ data: twelve, maxSlices: 0 }), 'tc-series').length).toBe(12)
  })

  test('groups the smallest entries into one last slice in the color of the rest', () => {
    const groups = findByClass(render(options), 'tc-series')
    expect(groups.map((g) => g.attrs['data-series'])).toEqual(['n1', 'n3', 'n5', 'Others'])
    expect(groups.map((g) => g.attrs.class)).toEqual([
      'tc-series tc-series-2',
      'tc-series tc-series-4',
      'tc-series tc-series-6',
      'tc-series tc-series-9',
    ])
    const named = findByClass(render({ ...options, othersLabel: 'Inne' }), 'tc-series')
    expect(named[3]?.attrs['data-series']).toBe('Inne')
  })

  test('the legend and the table have the rest as one entry', () => {
    expect(donut.legend?.(options)).toEqual([
      { key: 'n1', name: 'n1', index: 1 },
      { key: 'n3', name: 'n3', index: 3 },
      { key: 'n5', name: 'n5', index: 5 },
      { key: '__others__', name: 'Others', index: 8 },
    ])
    const table = tableOf({ ...base, ...options }, 100)
    expect(table?.rows).toEqual([
      ['n1', '30', '30%'],
      ['n3', '20', '20%'],
      ['n5', '15', '15%'],
      ['Others', '35', '35%'],
    ])
  })
})
