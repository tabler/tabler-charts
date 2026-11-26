import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString, renderChart } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { world } from '../maps/world.ts'
import { chartInteraction, findByClass, highlightOf, tableOf } from '../test-utils.ts'
import { addMap, type MapData, type MapOptions, map } from './map.ts'

/** Two squares (B with a hole), a country too small for a shape, and the equator through the middle. */
const tiny: MapData = {
  width: 100,
  height: 50,
  projection: { type: 'miller', scale: 100 / (2 * Math.PI), translate: [50, 25] },
  regions: {
    A: { name: 'Aland', path: 'M10 10l20 0 0 20-20 0z' },
    B: { name: 'Bland', path: 'M60 10h20v20h-20zM65 15h10v10h-10z' },
    C: { name: 'Cland', path: 'M50 40h0', point: true },
  },
}

// Twice the map, so one unit of the map is two pixels.
const size = { width: 200, height: 100 }
const base: ChartConfig<MapOptions> = {
  type: map,
  id: 'm',
  locale: 'en-US',
  map: tiny,
  scale: false,
  data: { A: 0, B: 10 },
}

const render = (config: Partial<ChartConfig<MapOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'm')

function interactionOf(config: Partial<ChartConfig<MapOptions>> = {}): Interaction {
  return chartInteraction({ ...base, ...config }, size, 'm')
}

const styles = (node: ReturnType<typeof render>) =>
  findByClass(node, 'tc-region').map((r) => r.attrs.style ?? null)

describe('map', () => {
  test('draws one keyed shape per region, scaled to fit', () => {
    const node = render({ data: { A: 1 } })
    expect(node.attrs.class).toBe('tc-chart tc-chart-map')
    const group = findByClass(node, 'tc-map-regions')[0]
    expect(group?.attrs.transform).toBe('translate(0 0) scale(2)')
    const regions = findByClass(node, 'tc-region')
    expect(regions.map((r) => r.key)).toEqual(['A', 'B'])
    expect(regions.map((r) => r.attrs['data-region'])).toEqual(['A', 'B'])
    expect(regions[0]?.attrs.d).toBe(tiny.regions.A?.path)
    expect(regions.map((r) => r.attrs.class)).toEqual([
      'tc-region tc-cell',
      'tc-region tc-region-empty',
    ])
  })

  test('centers the map in a chart of other proportions', () => {
    const node = buildChart({ ...base }, { width: 200, height: 200 }, 'm')
    expect(findByClass(node, 'tc-map-regions')[0]?.attrs.transform).toBe('translate(0 50) scale(2)')
  })

  test('shades regions by value from a floor to the full color', () => {
    expect(styles(render())).toEqual(['--tc-heat:10%', '--tc-heat:100%'])
    expect(styles(render({ data: { A: 5, B: 10 } }))[0]).toBe('--tc-heat:55%')
    // A fixed range makes the same values lighter.
    expect(styles(render({ max: 20 }))[1]).toBe('--tc-heat:55%')
    expect(styles(render({ min: 10, max: 20, data: { A: 5 } }))[0]).toBe('--tc-heat:10%')
    // A region without a value has no shade.
    expect(styles(render({ data: { B: 3 } }))).toEqual([null, '--tc-heat:100%'])
  })

  test('mixes a scale of colors, through mid', () => {
    const colors = ['red', 'white', 'green']
    expect(styles(render({ colors, data: { A: 0, B: 10 } }))).toEqual([
      '--tc-cell-fill:red',
      '--tc-cell-fill:green',
    ])
    expect(styles(render({ colors, min: 0, max: 10, data: { A: 2.5, B: 5 } }))).toEqual([
      '--tc-cell-fill:color-mix(in oklab,white 50%,red)',
      '--tc-cell-fill:white',
    ])
    // With the middle at 2, 2 is white and 6 is halfway to green.
    expect(styles(render({ colors, mid: 2, min: 0, max: 10, data: { A: 2, B: 6 } }))).toEqual([
      '--tc-cell-fill:white',
      '--tc-cell-fill:color-mix(in oklab,green 50%,white)',
    ])
    // One color is not a scale.
    expect(styles(render({ colors: ['red'] }))[1]).toBe('--tc-heat:100%')
  })

  test('draws a country too small for a shape as a dot, only with a value', () => {
    expect(findByClass(render(), 'tc-region-point')).toHaveLength(0)
    const [point] = findByClass(render({ data: { C: 4 } }), 'tc-region-point')
    expect(point?.tag).toBe('circle')
    expect(point?.attrs).toMatchObject({ cx: 100, cy: 80, r: 4, 'data-region': 'C' })
    expect(point?.attrs.style).toBe('--tc-heat:100%')
  })

  test('places markers by their coordinates and joins them with lines', () => {
    const node = render({
      markerRadius: 5,
      markers: [
        { name: 'Null Island', lat: 0, lng: 0 },
        { name: 'East', lat: 0, lng: 90 },
        { lat: 0, lng: -90 },
      ],
      lines: [
        { from: 'Null Island', to: 'East' },
        { from: 'Null Island', to: 'Nowhere' },
      ],
    })
    const markers = findByClass(node, 'tc-map-marker')
    expect(markers.map((m) => [m.attrs.cx, m.attrs.cy, m.attrs.r])).toEqual([
      [100, 50, 5],
      [150, 50, 5],
      [50, 50, 5],
    ])
    expect(markers.map((m) => m.attrs['data-marker'])).toEqual(['Null Island', 'East', ''])
    // A line to a marker that does not exist is left out.
    const lines = findByClass(node, 'tc-map-line')
    expect(lines.map((l) => l.attrs.d)).toEqual(['M100 50Q125 40 150 50'])
  })

  test('draws no markers on a map without a projection', () => {
    const { projection: _, ...flat } = tiny
    const node = render({ map: flat, markers: [{ lat: 0, lng: 0 }] })
    expect(findByClass(node, 'tc-map-marker')).toHaveLength(0)
    expect(findByClass(node, 'tc-region')).toHaveLength(2)
  })

  test('hits the shape under the pointer, not its hole', () => {
    const { hitTest } = interactionOf()
    const a = hitTest(40, 40)
    expect(a).toMatchObject({ index: 0, label: 'A', title: '' })
    expect(a?.items).toMatchObject([{ name: 'Aland', value: 0, text: '0' }])
    expect(highlightOf(a, 'halo')?.d).toBe('M20 20L60 20L60 60L20 60Z')
    expect(hitTest(124, 24)?.label).toBe('B')
    // The hole of B, the sea and a point outside the chart.
    expect(hitTest(140, 40)).toBeNull()
    expect(hitTest(100, 20)).toBeNull()
    expect(hitTest(-5, 500)).toBeNull()
  })

  test('names a region without a value on hover, but the keyboard skips it', () => {
    const interaction = interactionOf({ data: { B: 3 } })
    expect(interaction.count).toBe(1)
    const a = interaction.hitTest(40, 40)
    expect(a).toMatchObject({ index: 1, label: 'A', title: '' })
    expect(a?.items).toMatchObject([{ name: 'Aland', value: null, text: '' }])
    expect(interaction.hitIndex(0)?.label).toBe('B')
  })

  test('walks regions in the order of the data, then the markers', () => {
    const interaction = interactionOf({
      data: { B: 3, C: 1, A: 2, ZZ: 9 },
      markers: [{ name: 'Null Island', lat: 0, lng: 0 }],
    })
    expect(interaction.count).toBe(4)
    expect([0, 1, 2, 3].map((i) => interaction.hitIndex(i)?.label)).toEqual([
      'B',
      'C',
      'A',
      'Null Island',
    ])
    expect(interaction.hitIndex(4)?.label).toBeUndefined()
    // Dots are hit within a few pixels, and before the shapes under them.
    expect(interaction.hitTest(102, 82)?.label).toBe('C')
    const marker = interaction.hitTest(101, 51)
    expect(marker).toMatchObject({ label: 'Null Island', title: '' })
    expect(marker?.items).toMatchObject([{ name: 'Null Island', value: null, text: '' }])
    expect(highlightOf(marker, 'halo')?.d).toContain('a7 7 0 1 0 14 0')
  })

  test('shows the scale with the ends of the range', () => {
    const scale = (config: Partial<ChartConfig<MapOptions>>) => {
      const [group] = findByClass(render({ scale: true, ...config }), 'tc-map-scale')
      return group ? findByClass(group, 'tc-tick-label').map((t) => t.children.join('')) : null
    }
    expect(scale({ data: { A: 2, B: 1500 } })).toEqual(['0', '1,500'])
    expect(scale({ min: 1, max: 5, format: { style: 'percent' } })).toEqual(['100%', '500%'])
    expect(scale({ scale: { low: 'Few', high: 'Many' } })).toEqual(['Few', 'Many'])
    // Nothing to explain without values.
    expect(scale({ data: {} })).toBeNull()
    const [group] = findByClass(render({ scale: true }), 'tc-map-scale')
    const steps = findByClass(group ?? render(), 'tc-cell')
    expect(steps).toHaveLength(24)
    expect(steps[0]?.attrs.style).toBe('--tc-heat:10%')
    expect(steps[23]?.attrs.style).toBe('--tc-heat:100%')
    // The map makes room for it.
    expect(findByClass(render({ scale: true }), 'tc-map-regions')[0]?.attrs.transform).toBe(
      'translate(23 0) scale(1.54)',
    )
  })

  test('lists the regions with a value in the table', () => {
    const config = { ...base, data: { B: 1500, A: 2, ZZ: 1 } }
    expect(tableOf(config, 10)).toEqual({
      columns: ['', 'Value'],
      total: 2,
      rows: [
        ['Bland', '1,500'],
        ['Aland', '2'],
      ],
    })
    expect(tableOf(config, 1)?.rows).toHaveLength(1)
  })

  test('finds a map by the name it was added with', () => {
    expect(() => render({ map: 'tiny-test' })).toThrow(/"tiny-test" is not registered/)
    addMap('tiny-test', tiny)
    expect(findByClass(render({ map: 'tiny-test' }), 'tc-region')).toHaveLength(2)
  })

  test('follows the proportions of the map unless a ratio is set', () => {
    const clean = (config: Partial<ChartConfig<MapOptions>> = {}) =>
      map.clean?.({ ...base, ...config } as never) as { aspectRatio?: number }
    expect(clean().aspectRatio).toBe(2)
    expect(clean({ scale: true }).aspectRatio).toBeCloseTo(1.86, 2)
    expect(clean({ aspectRatio: 3 }).aspectRatio).toBe(3)
    // Cleaning again keeps following the map.
    expect(clean({ ...clean(), map: { ...tiny, height: 100 } }).aspectRatio).toBe(1)
  })

  test('draws nothing from junk', () => {
    for (const junk of [undefined, null, 42, [], {}, { width: 10, height: 10 }, { regions: {} }]) {
      const html = chartToString({ ...base, map: junk as never }, size)
      expect(html).not.toContain('tc-region')
    }
    const node = render({
      map: { width: 100, height: 50, regions: { A: tiny.regions.A, X: null, Y: { path: 5 } } },
      data: { A: Number.NaN, B: 'x', C: null } as never,
      markers: [{ lat: 'a', lng: 1 }, null, { lat: 1, lng: Number.POSITIVE_INFINITY }] as never,
      lines: [null, { from: 1 }] as never,
      colors: [1, 'red'] as never,
    } as never)
    expect(findByClass(node, 'tc-region').map((r) => r.attrs.class)).toEqual([
      'tc-region tc-region-empty',
    ])
  })

  test('shows the part of the map in the view, cut at the edges of its room', () => {
    const node = render({ view: { x: 25, y: 12.5, scale: 2 } })
    const group = findByClass(node, 'tc-map-regions')[0]
    expect(group?.attrs.transform).toBe('translate(-100 -50) scale(4)')
    expect(findByClass(node, 'tc-map')[0]?.attrs['clip-path']).toBe('url(#m-map)')
    // A view past the map or the zoom range is brought back.
    const far = render({ view: { x: 900, y: -5, scale: 100 }, zoom: { max: 4 } })
    expect(findByClass(far, 'tc-map-regions')[0]?.attrs.transform).toBe(
      'translate(-600 0) scale(8)',
    )
    for (const view of [{ scale: Number.NaN }, { x: 'a' }, 'junk', { scale: 0.2 }])
      expect(
        findByClass(render({ view: view as never }), 'tc-map-regions')[0]?.attrs.transform,
      ).toBe('translate(0 0) scale(2)')
    // What is out of sight is not hit.
    const { hitTest } = interactionOf({ view: { x: 25, y: 12.5, scale: 2 } })
    expect(hitTest(10, 40)?.label).toBe('A')
    expect(hitTest(-10, 40)).toBeNull()
  })

  test('marks the selected regions and draws them last', () => {
    const regions = (config: Partial<ChartConfig<MapOptions>>) =>
      findByClass(render(config), 'tc-region').map((r) => [
        r.key,
        String(r.attrs.class).includes('tc-region-selected'),
      ])
    expect(regions({ select: 'multiple', selected: ['A', 'ZZ'] })).toEqual([
      ['B', false],
      ['A', true],
    ])
    expect(regions({ select: 'single', selected: ['B', 'A'] })).toEqual([
      ['A', false],
      ['B', true],
    ])
    expect(regions({ selected: ['A'] })).toEqual([
      ['A', false],
      ['B', false],
    ])
    expect(regions({ select: 'junk' as never, selected: 'A' as never })).toEqual([
      ['A', false],
      ['B', false],
    ])
  })

  test('says what a hit is on', () => {
    const interaction = interactionOf({ markers: [{ name: 'Null Island', lat: 0, lng: 0 }] })
    expect(interaction.hitTest(40, 40)).toMatchObject({ region: 'A' })
    expect(interaction.hitTest(100, 50)).toMatchObject({ marker: 'Null Island' })
    expect(interaction.hitTest(100, 50)).not.toHaveProperty('region')
  })

  test('draws the world and finds a country by its coordinates', () => {
    const big = { width: 1000, height: 489 }
    const { svg: node, interaction } = renderChart(
      { ...base, map: world, data: { PL: 80, DE: 45, SG: 10 } },
      big,
      'm',
    )
    expect(findByClass(node, 'tc-region').length).toBeGreaterThan(170)
    expect(findByClass(node, 'tc-region-point').map((r) => r.key)).toEqual(['SG'])
    // Warsaw: 52.2° N, 21° E, through the projection of the map file.
    const { scale, translate } = world.projection as NonNullable<MapData['projection']>
    const x = ((21 * Math.PI) / 180) * scale + (translate[0] as number)
    const y =
      (translate[1] as number) -
      1.25 * Math.log(Math.tan(Math.PI / 4 + (0.4 * 52.2 * Math.PI) / 180)) * scale
    expect(interaction?.hitTest(x, y)).toMatchObject({
      label: 'PL',
      items: [{ name: 'Poland', value: 80 }],
    })
    // The middle of the Atlantic.
    expect(interaction?.hitTest(380, 250)).toBeNull()
  })
})
