import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass, findByTag } from '../test-utils.ts'
import { type TreemapOptions, treemap } from './treemap.ts'

const size = { width: 400, height: 200 }
const flat = [
  { name: 'Chrome', value: 60 },
  { name: 'Safari', value: 25, color: '#2fb344' },
  { name: 'Edge', value: 10 },
  { name: 'Firefox', value: 5 },
]
const nested = [
  {
    name: 'Engineering',
    children: [
      { name: 'Salaries', value: 50 },
      { name: 'Cloud', value: 20, color: '#f76707' },
    ],
  },
  { name: 'Marketing', children: [{ name: 'Ads', value: 20 }] },
  { name: 'Office', value: 10 },
]
const base: ChartConfig<TreemapOptions> = { type: treemap, data: flat, id: 't', locale: 'en-US' }

const render = (config: Partial<ChartConfig<TreemapOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 't')

function interactionOf(config: Partial<ChartConfig<TreemapOptions>> = {}): Interaction {
  let found: Interaction | undefined
  buildChart({ ...base, ...config }, size, 't', (i) => {
    found = i
  })
  if (!found) throw new Error('no interaction')
  return found
}

const rectOf = (tile: { attrs: Record<string, unknown> }) => ({
  x: Number(tile.attrs.x),
  y: Number(tile.attrs.y),
  width: Number(tile.attrs.width),
  height: Number(tile.attrs.height),
})
const tilesOf = (node: ReturnType<typeof render>) => findByClass(node, 'tc-tile').map(rectOf)
const texts = (node: ReturnType<typeof render>) =>
  findByTag(node, 'text').map((t) => t.children.join(''))

const ctx = () => ({
  width: 400,
  height: 200,
  fontSize: 12,
  locale: 'en-US',
  id: 't',
  onHitTest() {},
  hidden: new Set<string>(),
})

describe('treemap', () => {
  test('draws one tile per entry, in palette slots, as large as its value', () => {
    const node = render({ gap: 0 })
    expect(node.attrs.class).toBe('tc-chart tc-chart-treemap')
    const groups = findByClass(node, 'tc-series')
    expect(groups.map((g) => g.attrs.class)).toEqual([
      'tc-series tc-series-1',
      'tc-series tc-series-2',
      'tc-series tc-series-3',
      'tc-series tc-series-4',
    ])
    expect(groups[1]?.attrs.style).toBe('--tc-series-color:#2fb344')
    const areas = groups.map((g) => {
      const { width, height } = rectOf(findByClass(g, 'tc-tile')[0] as never)
      return width * height
    })
    const total = 400 * 200
    expect(areas[0]).toBeCloseTo(total * 0.6, -1)
    expect(areas[1]).toBeCloseTo(total * 0.25, -1)
    expect(areas[2]).toBeCloseTo(total * 0.1, -1)
    expect(areas[3]).toBeCloseTo(total * 0.05, -1)
  })

  test('tiles fill the chart without overlapping, the largest in the top left corner', () => {
    const tiles = tilesOf(render({ gap: 0 }))
    expect(tiles[0]).toMatchObject({ x: 0, y: 0 })
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(0)
      expect(t.y).toBeGreaterThanOrEqual(0)
      expect(t.x + t.width).toBeLessThanOrEqual(400.01)
      expect(t.y + t.height).toBeLessThanOrEqual(200.01)
    }
    tiles.forEach((a, i) => {
      for (const b of tiles.slice(i + 1)) {
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
        expect(overlapX > 0.01 && overlapY > 0.01).toBe(false)
      }
    })
    const area = tiles.reduce((sum, t) => sum + t.width * t.height, 0)
    expect(area).toBeCloseTo(400 * 200, -1)
  })

  test('squarifies: no tile of similar values is a sliver', () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ name: `n${i}`, value: 10 + i }))
    for (const t of tilesOf(render({ data, gap: 0 }))) {
      expect(Math.max(t.width / t.height, t.height / t.width)).toBeLessThan(3)
    }
  })

  test('the gap separates neighbors and the outer tiles reach the edges', () => {
    const tiles = tilesOf(render({ gap: 4 }))
    expect(Math.min(...tiles.map((t) => t.x))).toBe(0)
    expect(Math.min(...tiles.map((t) => t.y))).toBe(0)
    expect(Math.max(...tiles.map((t) => t.x + t.width))).toBeCloseTo(400, 1)
    expect(Math.max(...tiles.map((t) => t.y + t.height))).toBeCloseTo(200, 1)
    const [first, second] = tiles as [ReturnType<typeof rectOf>, ReturnType<typeof rectOf>]
    expect(second.x - (first.x + first.width)).toBeCloseTo(4, 1)
  })

  test('the gap does not change the arrangement, and is the same between any two tiles', () => {
    const without = tilesOf(render({ data: nested, gap: 0 }))
    const wide = tilesOf(render({ data: nested, gap: 10 }))
    expect(wide.length).toBe(without.length)
    wide.forEach((t, i) => {
      const full = without[i] as ReturnType<typeof rectOf>
      expect(t.x).toBeGreaterThanOrEqual(full.x)
      expect(t.y).toBeGreaterThanOrEqual(full.y)
      expect(t.x + t.width).toBeLessThanOrEqual(full.x + full.width + 0.01)
      expect(t.y + t.height).toBeLessThanOrEqual(full.y + full.height + 0.01)
    })
    // Salaries and Cloud share a group; Marketing starts a group further on.
    const [salaries, cloud] = wide as [ReturnType<typeof rectOf>, ReturnType<typeof rectOf>]
    const inside =
      cloud.x > salaries.x
        ? cloud.x - (salaries.x + salaries.width)
        : cloud.y - (salaries.y + salaries.height)
    expect(inside).toBeCloseTo(10, 1)
    const right = Math.max(salaries.x + salaries.width, cloud.x + cloud.width)
    for (const t of wide.slice(2)) expect(t.x - right).toBeCloseTo(10, 1)
  })

  test('groups keep their tiles together in one color; a tile may have its own', () => {
    const node = render({ data: nested })
    const groups = findByClass(node, 'tc-series')
    expect(groups.map((g) => findByClass(g, 'tc-tile').length)).toEqual([2, 1, 1])
    expect(groups.map((g) => g.attrs['data-series'])).toEqual([
      'Engineering',
      'Marketing',
      'Office',
    ])
    const cloud = findByClass(groups[0] as never, 'tc-tile')[1]
    expect(cloud?.attrs.style).toBe('--tc-series-color:#f76707')
    // The two tiles of Engineering cover 70% of the chart between them.
    const engineering = findByClass(groups[0] as never, 'tc-tile').map(rectOf)
    const right = Math.max(...engineering.map((t) => t.x + t.width))
    const others = [
      ...findByClass(groups[1] as never, 'tc-tile'),
      ...findByClass(groups[2] as never, 'tc-tile'),
    ].map(rectOf)
    for (const t of others) expect(t.x).toBeGreaterThanOrEqual(right)
  })

  test('writes names and values where they fit, cut with an ellipsis, not in small tiles', () => {
    expect(texts(render())).toContain('Chrome')
    expect(texts(render())).toContain('60')
    expect(texts(render({ labels: false }))).toEqual([])
    const data = [
      { name: 'A very long name that cannot fit in its tile at all', value: 10 },
      { name: 'Tiny', value: 0.01 },
    ]
    const found = texts(buildChart({ ...base, data }, { width: 120, height: 60 }, 't'))
    expect(found.some((t) => t.endsWith('…'))).toBe(true)
    expect(found).not.toContain('Tiny')
  })

  test('formats values with `format` and the locale', () => {
    const node = render({ format: { style: 'currency', currency: 'USD' } })
    expect(texts(node)).toContain('$60.00')
  })

  test('zero, negative and missing values draw no tile', () => {
    const data = [
      { name: 'A', value: 5 },
      { name: 'B', value: 0 },
      { name: 'C', value: -3 },
      { name: 'D' },
    ]
    expect(tilesOf(render({ data })).length).toBe(1)
    expect(tilesOf(render({ data: [] }))).toEqual([])
  })

  test('hidden entries leave their room to the others', () => {
    const data = flat.map((d, i) => (i === 0 ? { ...d, hidden: true } : d))
    const node = render({ data, gap: 0 })
    expect(findByClass(node, 'tc-series').map((g) => g.attrs.class)).toEqual([
      'tc-series tc-series-2',
      'tc-series tc-series-3',
      'tc-series tc-series-4',
    ])
    const area = tilesOf(node).reduce((sum, t) => sum + t.width * t.height, 0)
    expect(area).toBeCloseTo(400 * 200, -1)
  })

  test('hit testing finds the tile under the pointer, with its value and share', () => {
    const interaction = interactionOf({ data: nested })
    expect(interaction.count).toBe(4)
    const hit = interaction.hitTest(10, 10)
    expect(hit?.label).toBe('Engineering › Salaries')
    expect(hit?.title).toBe('Engineering')
    expect(hit?.seriesIndex).toBe(0)
    expect(hit?.items[0]).toMatchObject({ name: 'Salaries', value: 50, text: '50 (50%)' })
    expect(hit?.mark?.d).toMatch(/^M/)
    expect(interaction.hitTest(-5, 10)).toBeNull()
    const cloud = interaction.hitIndex(1)
    expect(cloud?.items[0]).toMatchObject({ name: 'Cloud', color: '#f76707' })
    expect(interaction.hitIndex(9)).toBeNull()
  })

  test('the table lists every tile with its path, value and share', () => {
    const table = treemap.table?.({ data: nested }, ctx(), 100)
    expect(table).toEqual({
      columns: ['', 'Value', 'Share'],
      rows: [
        ['Engineering › Salaries', '50', '50%'],
        ['Engineering › Cloud', '20', '20%'],
        ['Marketing › Ads', '20', '20%'],
        ['Office', '10', '10%'],
      ],
    })
    const cut = treemap.table?.({ data: nested }, ctx(), 2)
    expect(cut?.rows.length).toBe(2)
    expect(cut?.total).toBe(4)
  })

  test('the legend has the top-level entries', () => {
    expect(treemap.legend?.({ data: nested })).toEqual([
      { key: 'Engineering', name: 'Engineering', index: 0 },
      { key: 'Marketing', name: 'Marketing', index: 1 },
      { key: 'Office', name: 'Office', index: 2 },
    ])
  })

  test('cleans data that is not what the types say', () => {
    const data = [
      { name: 7, value: '12', children: 'no' },
      null,
      { name: 'A', value: Number.NaN, children: [{ name: 'B', value: 3 }, 'junk'] },
    ] as never
    const cleaned = treemap.clean?.({ data }) as TreemapOptions
    expect(cleaned.data).toMatchObject([
      { name: '7', value: 0, children: undefined },
      { name: 'A', value: 0, children: [{ name: 'B', value: 3 }] },
    ])
    // A cycle ends at the depth limit instead of recursing forever.
    const loop: Record<string, unknown> = { name: 'loop', value: 1 }
    loop.children = [loop]
    expect(() => treemap.clean?.({ data: [loop] as never })).not.toThrow()
    expect(tilesOf(render({ data: [loop] as never })).length).toBe(1)
  })
})
