import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass, findByTag } from '../test-utils.ts'
import { type ParliamentOptions, parliament } from './parliament.ts'

const size = { width: 400, height: 200 }
const data = [
  { name: 'Fidesz', seats: 135 },
  { name: 'Együtt', seats: 57, color: '#2fb344' },
  { name: 'Mi Hazánk', seats: 6 },
  { name: 'German minority', seats: 1 },
]
const base: ChartConfig<ParliamentOptions> = { type: parliament, data, id: 'p', locale: 'en-US' }

const render = (config: Partial<ChartConfig<ParliamentOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'p')

function interactionOf(config: Partial<ChartConfig<ParliamentOptions>> = {}): Interaction {
  let found: Interaction | undefined
  buildChart({ ...base, ...config }, size, 'p', (i) => {
    found = i
  })
  if (!found) throw new Error('no interaction')
  return found
}

const texts = (node: ReturnType<typeof render>) =>
  findByTag(node, 'text').map((t) => t.children.join(''))

/** Position of a seat from its translate. */
const positionOf = (seat: { attrs: Record<string, unknown> }) =>
  (String(seat.attrs.style)
    .match(/translate\(([\d.-]+)px,([\d.-]+)px\)/)
    ?.slice(1)
    .map(Number) ?? []) as [number, number]

const ctx = () => ({
  width: 400,
  height: 200,
  fontSize: 12,
  locale: 'en-US',
  id: 'p',
  onHitTest() {},
  hidden: new Set<string>(),
})

describe('parliament', () => {
  test('draws one seat per party seat, in palette slots, with the total in the middle', () => {
    const node = render()
    expect(node.attrs.class).toBe('tc-chart tc-chart-parliament')
    const groups = findByClass(node, 'tc-series')
    expect(groups.map((g) => g.attrs.class)).toEqual([
      'tc-series tc-series-1',
      'tc-series tc-series-2',
      'tc-series tc-series-3',
      'tc-series tc-series-4',
    ])
    expect(groups.map((g) => findByClass(g, 'tc-seat').length)).toEqual([135, 57, 6, 1])
    expect(groups[1]?.attrs.style).toBe('--tc-series-color:#2fb344')
    expect(findByClass(node, 'tc-seat-vacant')).toHaveLength(0)
    expect(texts(node)).toEqual(['199'])
  })

  test('seats sit on a hemicycle: all above the center, parties from the left', () => {
    const node = render({ center: false })
    const seats = findByClass(node, 'tc-seat')
    const [cx, cy] = positionOf(findByClass(node, 'tc-parliament')[0] as never)
    expect(cx).toBe(200)
    // The benches fill the width; the open side is at the bottom of the chart.
    expect(cy).toBeGreaterThan(150)
    for (const seat of seats) expect(positionOf(seat)[1]).toBeLessThanOrEqual(0.5)
    const radius = Number(seats[0]?.attrs.r)
    expect(radius).toBeGreaterThan(2)
    for (const seat of seats) expect(seat.attrs.r).toBe(radius)
    // The first party sits on the left, the last on the right.
    const groups = findByClass(node, 'tc-series')
    const meanX = (i: number) => {
      const xs = findByClass(groups[i] as never, 'tc-seat').map((s) => positionOf(s)[0])
      return xs.reduce((a, b) => a + b, 0) / xs.length
    }
    expect(meanX(0)).toBeLessThan(0)
    expect(meanX(1)).toBeGreaterThan(meanX(0))
    expect(meanX(3)).toBeGreaterThan(meanX(1))
    // No two seats overlap.
    const positions = seats.map(positionOf)
    for (let i = 0; i < positions.length; i++)
      for (let j = i + 1; j < positions.length; j++) {
        const [a, b] = [positions[i] as number[], positions[j] as number[]]
        expect(
          Math.hypot((a[0] as number) - (b[0] as number), (a[1] as number) - (b[1] as number)),
        ).toBeGreaterThan(radius * 2 - 0.01)
      }
  })

  test('takes the rows it is given, else the fewest that fit', () => {
    const rowsOf = (config: Partial<ChartConfig<ParliamentOptions>>) =>
      new Set(
        findByClass(render(config), 'tc-seat').map((s) => Math.round(Math.hypot(...positionOf(s)))),
      ).size
    expect(rowsOf({ rows: 4 })).toBe(4)
    expect(rowsOf({ rows: 9 })).toBe(9)
    // 199 seats on a hemicycle: eight rows, like the Hungarian one.
    expect(rowsOf({})).toBe(8)
    // A few seats need fewer rows than asked for.
    expect(rowsOf({ data: [{ name: 'A', seats: 3 }], rows: 10 })).toBe(3)
  })

  test('vacant seats fill the house up to total, after the parties', () => {
    const node = render({ total: 230 })
    const vacant = findByClass(node, 'tc-seat-vacant')
    expect(vacant).toHaveLength(31)
    expect(findByClass(node, 'tc-seat')).toHaveLength(230)
    expect(texts(node)).toEqual(['230'])
    // They sit on the right, past the last party's seat (by angle: rows differ in x).
    const angleOf = (seat: (typeof vacant)[number]) => {
      const [x, y] = positionOf(seat)
      return Math.atan2(x, -y)
    }
    const last = findByClass(findByClass(node, 'tc-series')[3] as never, 'tc-seat')[0] as never
    for (const seat of vacant) expect(angleOf(seat)).toBeGreaterThanOrEqual(angleOf(last) - 1e-9)
    // A total below the parties' sum changes nothing.
    expect(findByClass(render({ total: 10 }), 'tc-seat-vacant')).toHaveLength(0)
  })

  test('custom center text, a label above the number, and no center', () => {
    expect(texts(render({ center: { label: 'seats' } }))).toEqual(['seats', '199'])
    expect(texts(render({ center: { value: '199 / 199', label: 'all seats' } }))).toEqual([
      'all seats',
      '199 / 199',
    ])
    expect(texts(render({ center: false }))).toEqual([])
    // Inside the open side of the hemicycle: the value's baseline is above the center.
    const value = findByClass(render(), 'tc-parliament-value')[0]
    expect(value?.attrs.dy).toBe('-0.4em')
    // A full circle puts the number in the middle.
    expect(findByClass(render({ angle: 360 }), 'tc-parliament-value')[0]?.attrs.dy).toBe('0.35em')
  })

  test('legend, hidden parties and the table', () => {
    expect(parliament.legend?.({ data })).toEqual([
      { key: 'Fidesz', name: 'Fidesz', index: 0 },
      { key: 'Együtt', name: 'Együtt', index: 1, color: '#2fb344' },
      { key: 'Mi Hazánk', name: 'Mi Hazánk', index: 2 },
      { key: 'German minority', name: 'German minority', index: 3 },
    ])
    expect(parliament.table?.({ data }, ctx(), 1000)).toEqual({
      columns: ['', 'Seats', 'Share'],
      rows: [
        ['Fidesz', '135', '67.8%'],
        ['Együtt', '57', '28.6%'],
        ['Mi Hazánk', '6', '3%'],
        ['German minority', '1', '0.5%'],
      ],
    })
    const hidden = render({ data: data.map((p, i) => (i === 0 ? { ...p, hidden: true } : p)) })
    expect(findByClass(hidden, 'tc-seat')).toHaveLength(64)
    expect(findByClass(hidden, 'tc-series').map((g) => g.attrs.class)).toEqual([
      'tc-series tc-series-2',
      'tc-series tc-series-3',
      'tc-series tc-series-4',
    ])
    expect(texts(hidden)).toEqual(['64'])
  })

  test('hit testing finds the party of the seat under the pointer', () => {
    const interaction = interactionOf()
    expect(interaction.count).toBe(4)
    const node = render()
    const [cx, cy] = positionOf(findByClass(node, 'tc-parliament')[0] as never)
    const groups = findByClass(node, 'tc-series')
    const seat = positionOf(findByClass(groups[1] as never, 'tc-seat')[3] as never)
    const hit = interaction.hitTest(cx + seat[0], cy + seat[1])
    expect(hit?.items[0]?.name).toBe('Együtt')
    expect(hit?.items[0]?.text).toBe('57 (28.6%)')
    expect(hit?.items[0]?.color).toBe('#2fb344')
    expect(hit?.index).toBe(1)
    expect(hit?.seriesIndex).toBe(1)
    // The halo marks every seat of the party.
    expect(hit?.mark?.d.split('M')).toHaveLength(58)
    // Nothing in the hollow, nothing beyond the benches.
    expect(interaction.hitTest(cx, cy)).toBeNull()
    expect(interaction.hitTest(0, 0)).toBeNull()
    // By index: anchored among the party's seats.
    const byIndex = interaction.hitIndex(0)
    expect(byIndex?.items[0]?.name).toBe('Fidesz')
    expect(byIndex?.items[0]?.x).toBeLessThan(cx)
    expect(interaction.hitIndex(4)).toBeNull()
  })

  test('parties without seats are skipped by the keyboard, and negatives count as zero', () => {
    const interaction = interactionOf({
      data: [
        { name: 'A', seats: 3 },
        { name: 'B', seats: 0 },
        { name: 'C', seats: -2 },
        { name: 'D', seats: 2.4 },
      ],
    })
    expect(interaction.count).toBe(2)
    expect(interaction.hitIndex(1)?.items[0]?.name).toBe('D')
    expect(interaction.hitIndex(1)?.items[0]?.value).toBe(2)
  })

  test('an empty house draws nothing and does not throw', () => {
    for (const config of [{ data: [] }, { data: [{ name: 'A', seats: 0 }] }]) {
      const node = render(config)
      expect(findByClass(node, 'tc-seat')).toHaveLength(0)
      expect(texts(node)).toEqual(['0'])
      expect(chartToString({ ...base, ...config }, size)).not.toContain('NaN')
    }
  })

  test('other angles: a full circle and a wider arc still fit the chart', () => {
    for (const angle of [360, 220, 90]) {
      const node = render({ angle, center: false })
      const [cx, cy] = positionOf(findByClass(node, 'tc-parliament')[0] as never)
      // No two seats share a place: on a full circle the ring closes without a double seat.
      const places = new Set(findByClass(node, 'tc-seat').map((s) => String(s.attrs.style)))
      expect(places.size).toBe(199)
      for (const seat of findByClass(node, 'tc-seat')) {
        const [x, y] = positionOf(seat)
        const r = Number(seat.attrs.r)
        expect(cx + x - r).toBeGreaterThanOrEqual(-0.02)
        expect(cx + x + r).toBeLessThanOrEqual(400.02)
        expect(cy + y - r).toBeGreaterThanOrEqual(-0.02)
        expect(cy + y + r).toBeLessThanOrEqual(200.02)
      }
    }
  })

  test('cleans data from outside', () => {
    const node = render({
      data: [
        { name: 'A', seats: '5' },
        { name: 3, seats: 2, color: 7 },
        null,
        { name: 'B', seats: Number.NaN },
      ] as never,
    })
    expect(findByClass(node, 'tc-seat')).toHaveLength(2)
    expect(
      parliament.legend?.(parliament.clean?.({ data: [{ name: 3, seats: 2 }] } as never) as never),
    ).toEqual([{ key: '3', name: '3', index: 0 }])
  })

  test('renders to a string without a DOM', () => {
    const svg = chartToString(base, size)
    expect(svg).toContain('class="tc-seat"')
    expect(svg).toContain('>199<')
  })
})
