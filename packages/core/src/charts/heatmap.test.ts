import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass } from '../test-utils.ts'
import { type HeatmapOptions, heatmap } from './heatmap.ts'

const size = { width: 300, height: 120 }
const base: ChartConfig<HeatmapOptions> = {
  type: heatmap,
  id: 'h',
  locale: 'en-US',
  data: {
    labels: ['W1', 'W2', 'W3'],
    series: [
      { name: 'Mon', values: [0, 5, 10] },
      { name: 'Tue', values: [2, null, 8] },
    ],
  },
}

const render = (config: Partial<ChartConfig<HeatmapOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'h')

function interactionOf(config: Partial<ChartConfig<HeatmapOptions>> = {}): Interaction {
  let found: Interaction | undefined
  buildChart({ ...base, ...config }, size, 'h', (i) => {
    found = i
  })
  if (!found) throw new Error('no interaction')
  return found
}

const heat = (node: ReturnType<typeof render>) =>
  findByClass(node, 'tc-cell').map((c) => c.attrs.style ?? null)

describe('heatmap', () => {
  test('draws one keyed row per series and one cell per label', () => {
    const node = render()
    expect(node.attrs.class).toBe('tc-chart tc-chart-heatmap')
    const rows = findByClass(node, 'tc-heatmap-row')
    expect(rows.map((r) => r.key)).toEqual(['Mon', 'Tue'])
    expect(findByClass(rows[0] ?? node, 'tc-cell').map((c) => c.key)).toEqual(['W1', 'W2', 'W3'])
    expect(findByClass(node, 'tc-cell-empty')).toHaveLength(1)
  })

  test('shades cells by value from a floor to the full color', () => {
    // 0 → floor (8%), 5 → halfway, 10 → full; the missing cell has no shade.
    expect(heat(render())).toEqual([
      '--tc-heat:8%',
      '--tc-heat:54%',
      '--tc-heat:100%',
      '--tc-heat:26.4%',
      null,
      '--tc-heat:81.6%',
    ])
    // A fixed max makes the same values lighter.
    expect(heat(render({ max: 20 }))[2]).toBe('--tc-heat:54%')
  })

  test('labels rows on the left and columns along the bottom', () => {
    const node = render()
    const labels = (cls: string) =>
      findByClass(findByClass(node, cls)[0] ?? node, 'tc-tick-label').map((t) =>
        t.children.join(''),
      )
    expect(labels('tc-axis-left')).toEqual(['Mon', 'Tue'])
    expect(labels('tc-axis-bottom')).toEqual(['W1', 'W2', 'W3'])
    expect(findByClass(render({ x: { show: false }, y: { show: false } }), 'tc-axis')).toEqual([])
  })

  test('keeps a gap between cells and rounds the corners', () => {
    const cells = findByClass(render({ gap: 4, radius: 2 }), 'tc-cell')
    const [a, b] = cells.map((c) => ({ x: Number(c.attrs.x), w: Number(c.attrs.width) }))
    expect((b?.x ?? 0) - ((a?.x ?? 0) + (a?.w ?? 0))).toBeCloseTo(4, 1)
    expect(cells[0]?.attrs.rx).toBe(2)
  })

  test('hit testing finds the cell under the pointer', () => {
    const interaction = interactionOf()
    expect(interaction.count).toBe(3)
    const cells = findByClass(render(), 'tc-cell')
    const center = (i: number) => {
      const c = cells[i]
      return [
        Number(c?.attrs.x) + Number(c?.attrs.width) / 2,
        Number(c?.attrs.y) + Number(c?.attrs.height) / 2,
      ] as const
    }
    // Tuesday, W3.
    const hit = interaction.hitTest(...center(5))
    expect(hit?.index).toBe(2)
    expect(hit?.seriesIndex).toBe(1)
    expect(hit?.title).toBe('W3')
    expect(hit?.items.map((i) => i.text)).toEqual(['10', '8'])
    expect(hit?.mark?.d).toMatch(/^M.*Z$/)
    // Keyboard: a column with a row picked.
    expect(interaction.hitIndex(1, 1)?.items[1]?.text).toBe('–')
    expect(interaction.hitTest(0, 0)).toBeNull()
  })

  test('lists the values as a table', () => {
    const table = heatmap.table?.(base, { ...ctx(), hidden: new Set() }, 100)
    expect(table?.columns).toEqual(['', 'Mon', 'Tue'])
    expect(table?.rows[0]).toEqual(['W1', '0', '2'])
  })

  test('renders empty and flat data without NaN', () => {
    for (const data of [
      { series: [] },
      { labels: [], series: [{ name: 'A', values: [] }] },
      { labels: ['a', 'b'], series: [{ name: 'A', values: [3, 3] }] },
    ]) {
      const svg = chartToString({ ...base, data }, size)
      expect(svg).not.toContain('NaN')
    }
  })
})

function ctx() {
  return { width: 300, height: 120, fontSize: 12, locale: 'en-US', id: 'h', onHitTest() {} }
}
