import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass, findByTag, gridLineOffset } from '../test-utils.ts'
import type { VNode } from '../vnode.ts'
import { type AreaOptions, area } from './area.ts'
import { line } from './line.ts'

const size = { width: 400, height: 200 }

const base: ChartConfig<AreaOptions> = {
  type: area,
  id: 'a',
  locale: 'en-US',
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [
      { name: 'North', values: [40, 55, 50, 70] },
      { name: 'South', values: [20, 25, 35, 30] },
    ],
  },
}

const render = (config: Partial<ChartConfig<AreaOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'a')

describe('area', () => {
  test('is a filled line chart with its own root class', () => {
    const node = render()
    expect(node.attrs.class).toBe('tc-chart tc-chart-area')
    expect(findByClass(node, 'tc-area')).toHaveLength(2)
    expect(findByClass(node, 'tc-line')).toHaveLength(2)
  })

  test('includes zero in the y domain by default', () => {
    const labels = (config: Partial<ChartConfig<AreaOptions>>) =>
      findByClass(render(config), 'tc-axis-y')[0]?.children.map((tick) =>
        typeof tick === 'string' ? tick : (tick.children[0] as VNode).children[0],
      )
    expect(labels({})?.[0]).toBe('0')
    expect(labels({ y: { zero: false } })?.[0]).not.toBe('0')
  })

  test('draws every area below every line', () => {
    const list = findByClass(render(), 'tc-series-list')[0] as VNode
    const [areas, ...lines] = list.children as VNode[]
    expect(areas?.attrs.class).toBe('tc-areas')
    expect(lines.map((g) => g.attrs.class)).toEqual([
      'tc-series tc-series-1',
      'tc-series tc-series-2',
    ])
    expect(findByClass(areas as VNode, 'tc-series').map((g) => g.key)).toEqual(['North', 'South'])
  })

  test('fades areas with one shared mask by default', () => {
    const node = render()
    const masks = findByTag(node, 'mask')
    expect(masks).toHaveLength(1)
    expect(masks[0]?.attrs.id).toBe('a-fade')
    for (const path of findByClass(node, 'tc-area')) {
      expect(path.attrs.mask).toBe('url(#a-fade)')
      expect(path.attrs.class).toBe('tc-area tc-area-gradient')
    }
    const svg = chartToString({ ...base, id: 'x' }, size)
    expect(svg).toContain('<stop class="tc-fade-start" offset="0"/>')
    expect(svg).toContain('fill="url(#x-fade-gradient)"')
  })

  test('uses a flat wash with fill: solid', () => {
    const node = render({ fill: 'solid' })
    expect(findByTag(node, 'mask')).toHaveLength(0)
    for (const path of findByClass(node, 'tc-area')) {
      expect(path.attrs.mask).toBeUndefined()
      expect(path.attrs.class).toBe('tc-area')
    }
  })

  test('closes areas against the zero baseline', () => {
    const d = findByClass(render({ curve: 'linear' }), 'tc-area')[0]?.attrs.d as string
    const zeroY = gridLineOffset(findByClass(render(), 'tc-grid-line-zero')[0])
    expect(d).toMatch(new RegExp(`L[\\d.]+,${zeroY}L[\\d.]+,${zeroY}Z$`))
  })

  test('line charts can opt into the same fill', () => {
    const node = buildChart({ ...base, type: line, area: true }, size, 'l')
    expect(node.attrs.class).toBe('tc-chart tc-chart-line')
    expect(findByClass(node, 'tc-area')).toHaveLength(2)
  })

  describe('stacked', () => {
    const points = (d: unknown) =>
      (String(d).match(/-?[\d.]+,-?[\d.]+/g) ?? []).map(
        (p) => p.split(',').map(Number) as [number, number],
      )

    test('stacks each area on the one below and lines on the totals', () => {
      const node = render({ stacked: true, curve: 'linear' })
      const [north, south] = findByClass(node, 'tc-area').map((a) => points(a.attrs.d))
      const [northLine, southLine] = findByClass(node, 'tc-line').map((l) => points(l.attrs.d))
      if (!north || !south || !northLine || !southLine) throw new Error('missing paths')
      // South's bottom edge (second half, reversed) is North's top edge.
      const southBottom = south.slice(4).reverse()
      expect(southBottom).toEqual(north.slice(0, 4))
      expect(southLine).toEqual(south.slice(0, 4))
      // The stack total (70 + 30 = 100 in Q4) sets the domain.
      const labels = findByClass(node, 'tc-tick-label').map((t) => t.children[0])
      expect(labels).toContain('100')
      expect(northLine[3]?.[1]).toBeGreaterThan(southLine[3]?.[1] ?? 0)
    })

    test('percent mode fills every category to 100%', () => {
      const node = render({ stacked: 'percent', curve: 'linear' })
      const top = findByClass(node, 'tc-line').map((l) => points(l.attrs.d))[1] ?? []
      expect(new Set(top.map(([, y]) => y)).size).toBe(1)
      const labels = findByClass(node, 'tc-tick-label').map((t) => t.children[0])
      expect(labels).toContain('100%')
    })

    test('anchors hits at the running total but reports raw values', () => {
      let interaction: Interaction | undefined
      buildChart({ ...base, stacked: true }, size, 's', (i) => {
        interaction = i
      })
      const hit = interaction?.hitIndex(3)
      expect(hit?.items.map((i) => i.value)).toEqual([70, 30])
      expect(hit?.items[1]?.y).toBeLessThan(hit?.items[0]?.y ?? 0)
    })
  })

  test('matches the snapshot', () => {
    expect(chartToString(base, size)).toMatchSnapshot()
  })
})
