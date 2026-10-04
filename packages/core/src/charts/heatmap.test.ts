import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString, renderContext } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass } from '../test-utils.ts'
import { h } from '../vnode.ts'
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

  describe('ranges', () => {
    const ranges = [
      { to: 3, color: '#d63939', name: 'Low' },
      { from: 3, to: 8, color: '#f59f00', name: 'Mid' },
      { from: 8, color: '#2fb344', name: 'High' },
    ]

    test('paints each cell in the color of its range', () => {
      // Values: 0, 5, 10 / 2, –, 8 → Low, Mid, High / Low, empty, High.
      expect(heat(render({ ranges }))).toEqual([
        '--tc-cell-fill:#d63939',
        '--tc-cell-fill:#f59f00',
        '--tc-cell-fill:#2fb344',
        '--tc-cell-fill:#d63939',
        null,
        '--tc-cell-fill:#2fb344',
      ])
    })

    test('lists the ranges in the legend, and a hidden range draws empty cells', () => {
      expect(heatmap.legend?.({ ...base, ranges })).toEqual([
        { key: 'Low', name: 'Low', index: 0, color: '#d63939' },
        { key: 'Mid', name: 'Mid', index: 1, color: '#f59f00' },
        { key: 'High', name: 'High', index: 2, color: '#2fb344' },
      ])
      const unnamed = heatmap.legend?.({ ...base, ranges: ranges.map(({ name: _, ...r }) => r) })
      expect(unnamed?.map((i) => i.name)).toEqual(['< 3', '3–8', '≥ 8'])
      expect(findByClass(render({ ranges }), 'tc-cell-empty')).toHaveLength(1)
      // Hiding "High" from the legend empties its two cells (plus the missing one).
      const content = heatmap.render(
        { ...base, ranges },
        { ...ctx(), hidden: new Set(['High']) },
      ) as never
      const cells = findByClass(h('g', null, content), 'tc-cell')
      expect(cells.filter((c) => String(c.attrs.class).includes('tc-cell-empty'))).toHaveLength(3)
    })

    test('the legend names follow the locale, the table the value format', () => {
      const config = {
        ...base,
        locale: 'de-DE',
        format: { minimumFractionDigits: 2 },
        ranges: [
          { from: 0, to: 1234.5, color: 'red' },
          { from: 1234.5, color: 'blue' },
        ],
      }
      expect(heatmap.legend?.(config).map((item) => item.name)).toEqual([
        '0,00–1.234,50',
        '≥ 1.234,50',
      ])
      const ctx = renderContext(config, size, 'h', () => {}, new Set())
      expect(heatmap.table?.(config, ctx, 10).rows[0]).toEqual(['W1', '0,00', '2,00'])
    })

    test('the tooltip names the range of each value', () => {
      const hit = interactionOf({ ranges }).hitIndex(2, 0)
      expect(hit?.items.map((i) => i.text)).toEqual(['10 · High', '8 · High'])
      expect(hit?.items[0]?.color).toBe('#2fb344')
    })
  })

  describe('colors', () => {
    test('interpolates through the stops in oklab, from min to max', () => {
      const styles = heat(render({ colors: ['#0000ff', '#ffffff', '#ff0000'] }))
      // 0 → first stop, 5 → middle stop, 10 → last stop; 2 is 40% into the first segment.
      expect(styles[0]).toBe('--tc-cell-fill:#0000ff')
      expect(styles[1]).toBe('--tc-cell-fill:#ffffff')
      expect(styles[2]).toBe('--tc-cell-fill:#ff0000')
      expect(styles[3]).toBe('--tc-cell-fill:color-mix(in oklab,#ffffff 40%,#0000ff)')
      expect(heatmap.legend?.({ ...base, colors: ['#000', '#fff'] })).toEqual([])
    })

    test('mid places the middle color on a value, for diverging data', () => {
      const data = {
        labels: ['a', 'b', 'c', 'd'],
        series: [{ name: 'Δ', values: [-2, 0, 1, 8] }],
      }
      const styles = heat(render({ data, colors: ['blue', 'gray', 'red'], mid: 0 }))
      expect(styles[0]).toBe('--tc-cell-fill:blue')
      expect(styles[1]).toBe('--tc-cell-fill:gray')
      // 1 is an eighth of the way from 0 to 8: 12.5% into the upper half.
      expect(styles[2]).toBe('--tc-cell-fill:color-mix(in oklab,red 12.5%,gray)')
      expect(styles[3]).toBe('--tc-cell-fill:red')
    })
  })

  describe('colorBy: series', () => {
    test('gives every row its palette slot and lists the rows in the legend', () => {
      const node = render({ colorBy: 'series' })
      const rows = findByClass(node, 'tc-heatmap-row')
      expect(rows.map((r) => r.attrs.class)).toEqual([
        'tc-heatmap-row tc-series tc-series-1',
        'tc-heatmap-row tc-series tc-series-2',
      ])
      // Still one shade per value, now towards each row's color.
      expect(heat(node)[2]).toBe('--tc-heat:100%')
      expect(heatmap.legend?.({ ...base, colorBy: 'series' })?.map((i) => i.key)).toEqual([
        'Mon',
        'Tue',
      ])
      const hit = interactionOf({ colorBy: 'series' }).hitIndex(2, 1)
      expect(hit?.items[1]?.color).toContain('var(--tc-color-2) 81.6%')
    })

    test('a row hidden from the legend leaves the grid, keeping the others in their slot', () => {
      const node = buildChart(
        {
          ...base,
          colorBy: 'series',
          data: {
            ...base.data,
            series: base.data.series.map((s, i) => (i === 0 ? { ...s, hidden: true } : s)),
          },
        },
        size,
        'h',
      )
      const rows = findByClass(node, 'tc-heatmap-row')
      expect(rows.map((r) => r.key)).toEqual(['Tue'])
      expect(rows[0]?.attrs.class).toContain('tc-series-2')
    })
  })
})

function ctx() {
  return { width: 300, height: 120, fontSize: 12, locale: 'en-US', id: 'h', onHitTest() {} }
}
