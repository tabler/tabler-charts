import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString, renderContext } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass } from '../test-utils.ts'
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

function interactionOf(config: Partial<ChartConfig<PieOptions>> = {}): Interaction {
  let found: Interaction | undefined
  buildChart({ ...base, ...config }, size, 'p', (i) => {
    found = i
  })
  if (!found) throw new Error('no interaction')
  return found
}

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
    expect(hit?.mark?.d).toMatch(/^M/)
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
    expect(findByClass(node, 'tc-slice')).toHaveLength(0)
    expect(findByClass(node, 'tc-pie-track')).toHaveLength(1)
    expect(() => chartToString({ ...base, data: [] }, size)).not.toThrow()
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
    const d = findByClass(render({ data: [{ name: 'Only', value: 5 }] }), 'tc-slice')[0]?.attrs.d
    expect(String(d).match(/A/g)).toHaveLength(2)
  })

  test('describes the data as a table with shares', () => {
    const table = pie.table?.(
      base,
      renderContext(base, size, 'p', () => {}, new Set()),
      100,
    )
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
