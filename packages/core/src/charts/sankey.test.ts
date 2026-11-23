import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig } from '../chart.ts'
import { hoverOverlay, hoverUnderlay } from '../components/hover.ts'
import type { Interaction } from '../interaction.ts'
import { estimateTextWidth } from '../layout.ts'
import { chartInteraction, findByClass } from '../test-utils.ts'
import type { VNode } from '../vnode.ts'
import { type SankeyData, type SankeyOptions, sankey } from './sankey.ts'

const size = { width: 600, height: 300 }
const data: SankeyData = {
  links: [
    { from: 'Wages', to: 'Income', value: 60 },
    { from: 'Dividends', to: 'Income', value: 20 },
    { from: 'Income', to: 'Rent', value: 30 },
    { from: 'Income', to: 'Savings', value: 50 },
  ],
}
const base: ChartConfig<SankeyOptions> = { type: sankey, data, id: 's', locale: 'en-US' }

const render = (config: Partial<ChartConfig<SankeyOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 's')

const interactionOf = (config: Partial<ChartConfig<SankeyOptions>> = {}): Interaction =>
  chartInteraction({ ...base, ...config }, size, 's')

const num = (v: unknown) => Number(v)
/** Node rects by name, in render order. */
const nodesOf = (node: VNode) =>
  findByClass(node, 'tc-sankey-nodes')[0]?.children.map((g) => {
    const group = g as VNode
    const rect = findByClass(group, 'tc-sankey-node')[0] as VNode
    return {
      name: String(group.attrs['data-series']),
      slot: String(group.attrs.class),
      x: num(rect.attrs.x),
      y: num(rect.attrs.y),
      width: num(rect.attrs.width),
      height: num(rect.attrs.height),
    }
  }) ?? []
const texts = (node: VNode, cls: string) => findByClass(node, cls).map((t) => t.children.join(''))

describe('sankey', () => {
  test('draws a rect per node and a ribbon per link', () => {
    const node = render()
    expect(node.attrs.class).toBe('tc-chart tc-chart-sankey')
    expect(findByClass(node, 'tc-sankey-node')).toHaveLength(5)
    const links = findByClass(node, 'tc-sankey-link')
    expect(links).toHaveLength(4)
    // Two cubic Béziers joined by the node slices.
    expect(String(links[0]?.attrs.d).replace(/[^MCLZ]/g, '')).toBe('MCLCZ')
  })

  test('columns follow the longest path, with sinks in the last column', () => {
    const nodes = nodesOf(render())
    const x = Object.fromEntries(nodes.map((n) => [n.name, n.x]))
    expect(x.Wages).toBe(x.Dividends)
    expect(x.Income).toBeGreaterThan(x.Wages as number)
    expect(x.Rent).toBeGreaterThan(x.Income as number)
    expect(x.Rent).toBe(x.Savings)
    // A short path to a sink still ends in the last column (justify), not with 'left'.
    const extra = { links: [...data.links, { from: 'Tips', to: 'Savings', value: 5 }] }
    expect(nodesOf(render({ data: extra })).find((n) => n.name === 'Tips')?.x).toBe(x.Wages)
    const left = nodesOf(
      render({ data: { links: [...data.links, { from: 'Wages', to: 'Tax', value: 10 }] } }),
    )
    expect(left.find((n) => n.name === 'Tax')?.x).toBe(x.Rent)
    const leftAligned = nodesOf(
      render({
        data: { links: [...data.links, { from: 'Wages', to: 'Tax', value: 10 }] },
        align: 'left',
      }),
    )
    expect(leftAligned.find((n) => n.name === 'Tax')?.x).toBe(x.Income)
  })

  test('node heights follow max(in, out) on one scale, stacked without overlap', () => {
    const nodes = nodesOf(render({ nodePadding: 10, nodeWidth: 20 }))
    const by = Object.fromEntries(nodes.map((n) => [n.name, n]))
    expect(by.Income?.height).toBeCloseTo((by.Wages?.height ?? 0) + (by.Dividends?.height ?? 0), 1)
    expect(by.Wages?.height).toBeCloseTo((by.Dividends?.height ?? 0) * 3, 1)
    expect(by.Wages?.width).toBe(20)
    // Stacked from the top in data order, with the padding between.
    expect(by.Dividends?.y).toBeCloseTo((by.Wages?.y ?? 0) + (by.Wages?.height ?? 0) + 10, 1)
    // Centered: the column's block sits in the middle of the height.
    const top = by.Wages?.y ?? 0
    const bottom = (by.Dividends?.y ?? 0) + (by.Dividends?.height ?? 0)
    expect((top + bottom) / 2).toBeCloseTo(size.height / 2, 0)
    for (const n of nodes) {
      expect(n.y).toBeGreaterThanOrEqual(0)
      expect(n.y + n.height).toBeLessThanOrEqual(size.height)
    }
  })

  test('declared nodes set the stacking order and colors', () => {
    const node = render({
      data: {
        nodes: [{ name: 'Dividends', color: '#f00' }, { name: 'Income' }],
        links: data.links,
      },
    })
    const nodes = nodesOf(node)
    expect(nodes.map((n) => n.name)).toEqual(['Dividends', 'Wages', 'Income', 'Rent', 'Savings'])
    const group = findByClass(node, 'tc-sankey-nodes')[0]?.children[0] as VNode
    expect(group.attrs.style).toBe('--tc-series-color:#f00')
    // The palette slot is the position in the column; ribbons wear their source's.
    expect(nodes.map((n) => n.slot)).toEqual([
      'tc-series tc-series-1',
      'tc-series tc-series-2',
      'tc-series tc-series-1',
      'tc-series tc-series-1',
      'tc-series tc-series-2',
    ])
    const link = findByClass(node, 'tc-sankey-link').find((l) =>
      String(l.attrs.key ?? '').startsWith('Dividends'),
    )
    expect(findByClass(node, 'tc-sankey-link')[1]?.attrs.class).toBe(
      'tc-series tc-series-1 tc-sankey-link',
    )
    expect(findByClass(node, 'tc-sankey-link')[1]?.attrs.style).toBe('--tc-series-color:#f00')
    expect(link).toBeUndefined()
  })

  test('labels: name and value, left of the first column, right of the others', () => {
    const node = render({ format: { style: 'currency', currency: 'USD' } })
    expect(texts(node, 'tc-sankey-name')).toEqual([
      'Wages',
      'Dividends',
      'Income',
      'Rent',
      'Savings',
    ])
    expect(texts(node, 'tc-sankey-value')).toEqual([
      '$60.00',
      '$20.00',
      '$80.00',
      '$30.00',
      '$50.00',
    ])
    const names = findByClass(node, 'tc-sankey-name')
    const nodes = nodesOf(node)
    expect(names[0]?.attrs['text-anchor']).toBe('end')
    expect(num(names[0]?.attrs.x)).toBeLessThan(nodes[0]?.x as number)
    expect(names[2]?.attrs['text-anchor']).toBe('start')
    expect(num(names[2]?.attrs.x)).toBeGreaterThan((nodes[2]?.x ?? 0) + (nodes[2]?.width ?? 0))
    expect(names[4]?.attrs['text-anchor']).toBe('start')
    // The columns leave room for the labels on both sides.
    const w = estimateTextWidth('Dividends', 12)
    expect(num(names[1]?.attrs.x) - w).toBeGreaterThanOrEqual(0)
    expect(num(names[4]?.attrs.x) + estimateTextWidth('$50.00', 12)).toBeLessThanOrEqual(size.width)
  })

  test('long labels are cut short instead of squeezing the columns away', () => {
    const long = `Wages from a very long and descriptive source name that goes on`
    const node = render({
      data: { links: data.links.map((l) => (l.from === 'Wages' ? { ...l, from: long } : l)) },
    })
    const name = findByClass(node, 'tc-sankey-name')[0]
    expect(name?.children.join('')).toMatch(/…$/)
    expect(num(name?.attrs.x)).toBeLessThanOrEqual(size.width * 0.3)
    const nodes = nodesOf(node)
    expect((nodes[4]?.x ?? 0) - (nodes[0]?.x ?? 0)).toBeGreaterThan(size.width * 0.3)
    // Tooltips keep the whole name.
    expect(
      interactionOf({
        data: { links: data.links.map((l) => (l.from === 'Wages' ? { ...l, from: long } : l)) },
      }).hitIndex(0)?.items[0]?.name,
    ).toBe(long)
  })

  test('crowded columns keep only the names', () => {
    const links = Array.from({ length: 12 }, (_, i) => ({ from: `S${i}`, to: 'All', value: 1 }))
    const node = buildChart({ ...base, data: { links } }, { width: 400, height: 160 }, 's')
    expect(texts(node, 'tc-sankey-name')).toHaveLength(13)
    expect(texts(node, 'tc-sankey-value')).toEqual(['12'])
  })

  test('hovering a node lists its flows, hovering a ribbon gives its value and both ends', () => {
    const interaction = interactionOf()
    const nodes = nodesOf(render())
    const income = nodes[2] as { x: number; y: number; width: number; height: number }
    expect(interaction.count).toBe(5)
    const hit = interaction.hitTest(income.x + 2, income.y + income.height / 2)
    expect(hit?.index).toBe(2)
    expect(hit?.items.map((i) => [i.name, i.text])).toEqual([
      ['Income', '80'],
      ['Wages → Income', '60'],
      ['Dividends → Income', '20'],
      ['Income → Rent', '30'],
      ['Income → Savings', '50'],
    ])
    expect(hit?.items[0]?.color).toBe('var(--tc-color-1)')
    expect(hit?.mark).toEqual({
      d: 'M0,0h12v80h-12Z'.replace('80', String(income.height)),
      x: income.x,
      y: income.y,
      under: true,
    })
    // Between the first and second column, in the upper ribbon: Wages → Income.
    const wages = nodes[0] as { x: number; y: number; height: number }
    const link = interaction.hitTest((wages.x + income.x) / 2 + 6, wages.y + wages.height / 2)
    expect(link?.items).toHaveLength(1)
    expect(link?.items[0]?.name).toBe('Wages → Income')
    expect(link?.items[0]?.text).toBe('60')
    expect(link?.index).toBe(0)
    expect(link?.seriesIndex).toBe(0)
    expect(link?.mark?.d).toMatch(/^M.*C.*L.*C.*Z$/)
    // Drawn under the chart, so the ribbon never covers the labels lying on it.
    expect(link && findByClass(hoverOverlay(link), 'tc-hover-mark')).toHaveLength(0)
    expect(link && findByClass(hoverUnderlay(link), 'tc-hover-mark')).toHaveLength(1)
    // The gap between the columns above every ribbon: nothing.
    expect(interaction.hitTest((wages.x + income.x) / 2, 2)).toBeNull()
  })

  test('keyboard walks the nodes, and a focused flow highlights its ribbon', () => {
    const interaction = interactionOf()
    const node = interaction.hitIndex(2)
    expect(node?.index).toBe(2)
    expect(node?.seriesIndex).toBe(4 + 2)
    const flow = interaction.hitIndex(2, 1)
    expect(flow?.seriesIndex).toBe(1)
    expect(flow?.mark?.d).toMatch(/^M.*C.*L.*C.*Z$/)
    expect(interaction.hitIndex(9)).toBeNull()
  })

  test('legend: one entry per color, which hides every node wearing it', () => {
    const colored: SankeyData = {
      nodes: [
        { name: 'Wages', color: '#f00' },
        { name: 'Dividends', color: '#f00' },
        { name: 'Rent', color: '#00f' },
        { name: 'Savings' },
      ],
      links: data.links,
    }
    expect(sankey.legend?.({ ...base, data: colored })).toEqual([
      { key: 'Wages', name: 'Wages', index: 0, color: '#f00' },
      { key: 'Rent', name: 'Rent', index: 1, color: '#00f' },
    ])
    expect(sankey.legend?.(base)).toEqual([])
    const off = {
      ...colored,
      nodes: [{ name: 'Wages', color: '#f00', hidden: true }, ...(colored.nodes ?? []).slice(1)],
    }
    expect(sankey.legend?.({ ...base, data: off })[0]?.hidden).toBe(true)
    const node = render({ data: off })
    expect(nodesOf(node).map((n) => n.name)).toEqual(['Income', 'Rent', 'Savings'])
    expect(findByClass(node, 'tc-sankey-link')).toHaveLength(2)
  })

  test('data table: one row per link', () => {
    const ctx = { hidden: new Set<string>(), locale: 'en-US' } as never
    const table = sankey.table?.(
      { ...base, format: { style: 'percent' } },
      ctx,
      Number.POSITIVE_INFINITY,
    )
    expect(table?.columns).toEqual(['From', 'To', 'Value'])
    expect(table?.rows[0]).toEqual(['Wages', 'Income', '6,000%'])
    expect(table?.rows).toHaveLength(4)
  })

  test('bad data: missing nodes, odd values, loops and empty input', () => {
    const cleaned = sankey.clean?.({
      data: {
        nodes: [{ name: 7, color: 3 }, 'x', null],
        links: [
          { from: 'A', to: 'B', value: '5' },
          { from: 'A', to: 'B', value: -3 },
          { from: 'A', to: 'A', value: 2 },
          { from: 'A', to: 'C', value: Number.NaN },
          { from: 'C', to: 'D', value: 4 },
          42,
        ],
      },
    } as never) as SankeyOptions
    expect(cleaned.data.nodes).toEqual([{ name: '7', id: undefined, color: undefined }])
    expect(cleaned.data.links).toEqual([
      { from: 'A', to: 'B', value: 0 },
      { from: 'A', to: 'B', value: 0 },
      { from: 'A', to: 'A', value: 2 },
      { from: 'A', to: 'C', value: 0 },
      { from: 'C', to: 'D', value: 4 },
    ])
    const node = render(cleaned)
    // Loops are dropped; zero flows make no ribbon but still name their nodes (as sinks).
    expect(findByClass(node, 'tc-sankey-link')).toHaveLength(1)
    expect(nodesOf(node).map((n) => n.name)).toEqual(['C', 'A', 'B', 'D'])
    const empty = render({ data: { links: [] } })
    expect(findByClass(empty, 'tc-sankey-node')).toHaveLength(0)
    expect(interactionOf({ data: { links: [] } }).hitTest(300, 150)).toBeNull()
    expect(sankey.clean?.({ data: null } as never)).toEqual({
      data: { nodes: undefined, links: [] },
    })
    // A cycle still ends in a layout.
    const cycle = render({
      data: {
        links: [
          { from: 'A', to: 'B', value: 1 },
          { from: 'B', to: 'A', value: 1 },
        ],
      },
    })
    expect(findByClass(cycle, 'tc-sankey-node')).toHaveLength(2)
  })
})
