import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { findByClass, findByTag } from '../test-utils.ts'
import { type GaugeOptions, gauge } from './gauge.ts'

const size = { width: 200, height: 200 }
const base: ChartConfig<GaugeOptions> = { type: gauge, data: 58, id: 'g', locale: 'en-US' }

const render = (config: Partial<ChartConfig<GaugeOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'g')

function interactionOf(config: Partial<ChartConfig<GaugeOptions>> = {}): Interaction {
  let found: Interaction | undefined
  buildChart({ ...base, ...config }, size, 'g', (i) => {
    found = i
  })
  if (!found) throw new Error('no interaction')
  return found
}

const texts = (node: ReturnType<typeof render>) =>
  findByTag(node, 'text').map((t) => t.children.join(''))

const signature = (d: unknown) => String(d).replace(/[^MLAZ]/g, '')

describe('gauge', () => {
  test('draws a track and a value arc for a plain number', () => {
    const node = render()
    expect(node.attrs.class).toBe('tc-chart tc-chart-gauge')
    expect(findByClass(node, 'tc-gauge-track')).toHaveLength(1)
    const arc = findByClass(node, 'tc-gauge-arc')[0]
    expect(signature(arc?.attrs.d)).toBe('MAAAALAAAAZ')
    // The value in the middle is the share of max; no label for a bare number.
    expect(texts(node)).toEqual(['58%'])
  })

  test('animates the rings, not the translated group', () => {
    // The entrance keyframe sets transform; on the translated group it would
    // replace the translate and fly the gauge in from the top-left corner.
    const node = render()
    const group = findByClass(node, 'tc-gauge')[0]
    expect(String(group?.attrs.style)).toMatch(/^transform:translate\(/)
    expect(findByClass(group ?? node, 'tc-gauge-rings')).toHaveLength(1)
  })

  test('names the ring in the center and in the table', () => {
    const node = render({ data: { name: 'completed', value: 1392, max: 2400 } })
    expect(texts(node)).toEqual(['58%', 'completed'])
    expect(
      gauge.table?.({ data: { name: 'completed', value: 1392, max: 2400 } }, ctx(), 1000),
    ).toEqual({
      columns: ['', 'Value', 'Share'],
      rows: [['completed', '1,392', '58%']],
    })
  })

  test('custom center text and no center', () => {
    expect(texts(render({ center: { value: '1.4K', label: 'of 2.4K' } }))).toEqual([
      '1.4K',
      'of 2.4K',
    ])
    expect(texts(render({ center: false }))).toEqual([])
  })

  test('clamps values to the ring and keeps the stable path structure', () => {
    const full = findByClass(render({ data: 250 }), 'tc-gauge-arc')[0]?.attrs.d
    const track = findByClass(render({ data: 250 }), 'tc-gauge-track')[0]?.attrs.d
    expect(full).toBe(track)
    const empty = findByClass(render({ data: -3 }), 'tc-gauge-arc')[0]?.attrs.d
    expect(signature(empty)).toBe('MAAAALAAAAZ')
    expect(String(empty)).not.toContain('NaN')
    expect(texts(render({ data: -3 }))).toEqual(['0%'])
  })

  test('nests several rings from the outside in, in palette slots', () => {
    const data = [
      { name: 'Email', value: 96 },
      { name: 'Storage', value: 82, color: '#f59f00' },
      { name: 'Onboarding', value: 58, hidden: true },
    ]
    const node = render({ data })
    // The hidden ring starts out of the picture; the others keep their slots.
    const groups = findByClass(node, 'tc-series')
    expect(groups.map((g) => g.key)).toEqual(['Email', 'Storage'])
    expect(groups.map((g) => g.attrs.class)).toEqual([
      'tc-series tc-series-1',
      'tc-series tc-series-2',
    ])
    expect(groups[1]?.attrs.style).toBe('--tc-series-color:#f59f00')
    // Outer radius of each ring: the first ring is the largest.
    const outerOf = (i: number) =>
      Number(String(findByClass(node, 'tc-gauge-track')[i]?.attrs.d).match(/A([\d.]+)/)?.[1])
    expect(outerOf(0)).toBeGreaterThan(outerOf(1))
    expect(gauge.legend?.({ data })).toEqual([
      { key: 'Email', name: 'Email', index: 0 },
      { key: 'Storage', name: 'Storage', index: 1, color: '#f59f00' },
      { key: 'Onboarding', name: 'Onboarding', index: 2, hidden: true },
    ])
  })

  test('hidden rings are skipped and the next ring moves out', () => {
    const outer = (hidden: boolean) =>
      String(
        findByClass(
          render({
            data: [
              { name: 'A', value: 10, hidden },
              { name: 'B', value: 20 },
            ],
          }),
          'tc-gauge-track',
        )[hidden ? 0 : 1]?.attrs.d,
      ).match(/A([\d.]+)/)?.[1]
    expect(Number(outer(true))).toBeGreaterThan(Number(outer(false)))
    expect(outer(true)).toBe(
      String(findByClass(render(), 'tc-gauge-track')[0]?.attrs.d).match(/A([\d.]+)/)?.[1],
    )
  })

  test('a dial spans the given angle from startAngle', () => {
    const d = String(
      findByClass(render({ data: 100, startAngle: -135, angle: 270 }), 'tc-gauge-arc')[0]?.attrs.d,
    )
    // Starts bottom-left (x < 0, y > 0) rather than at 12 o'clock.
    const [x, y] = d
      .slice(1)
      .split(/[,A-Z]/)
      .map(Number)
    expect(x).toBeLessThan(0)
    expect(y).toBeGreaterThan(0)
  })

  test('fits a dial or half ring by its outline, not the full circle', () => {
    const translate = (config: Partial<ChartConfig<GaugeOptions>>) => {
      const style = String(findByClass(render(config), 'tc-gauge')[0]?.attrs.style)
      return (
        style
          .match(/translate\(([\d.-]+)px,([\d.-]+)px\)/)
          ?.slice(1)
          .map(Number) ?? []
      )
    }
    // Largest arc radius in the track: the outer edge (corners are smaller).
    const outerOf = (config: Partial<ChartConfig<GaugeOptions>>) =>
      Math.max(
        ...String(findByClass(render(config), 'tc-gauge-track')[0]?.attrs.d)
          .split('A')
          .slice(1)
          .map((arc) => Number(arc.split(',')[0])),
      )
    // A full ring is centered with the halo margin all around.
    expect(translate({ center: false })).toEqual([100, 100])
    expect(outerOf({ center: false })).toBe(92)
    // A half ring (top) grows to the full width; its own outline is centered.
    const half = { center: false as const, startAngle: -90, angle: 180 }
    expect(outerOf(half)).toBe(92)
    expect(translate(half)).toEqual([100, 146])
    // With text below the ring it moves up to make room.
    expect(translate({ startAngle: -90, angle: 180 })[1]).toBeLessThan(146)
    // A dial keeps the width and shifts down into the open bottom.
    const dial = { center: false as const, startAngle: -135, angle: 270 }
    expect(outerOf(dial)).toBe(92)
    expect(translate(dial)[1]).toBeGreaterThan(100)
  })

  test('hit testing finds the ring under the pointer', () => {
    const interaction = interactionOf({
      data: [
        { name: 'Outer', value: 50 },
        { name: 'Inner', value: 25 },
      ],
      thickness: 10,
      gap: 4,
    })
    expect(interaction.count).toBe(2)
    // Outer ring: radius 92 - 8 = 84 (outer) down to 74.
    expect(interaction.hitTest(100 + 80, 100)?.items[0]?.name).toBe('Outer')
    expect(interaction.hitTest(100 + 66, 100)?.items[0]?.name).toBe('Inner')
    expect(interaction.hitTest(100, 100)).toBeNull()
    const hit = interaction.hitIndex(1)
    expect(hit?.items[0]?.text).toBe('25 (25%)')
    expect(hit?.mark?.d).toContain('A')
  })

  test('renders to a string without a DOM', () => {
    const svg = chartToString({ ...base, data: { name: 'used', value: 82 } }, size)
    expect(svg).toContain('class="tc-gauge-arc"')
    expect(svg).toContain('>82%<')
  })
})

function ctx() {
  return {
    width: 200,
    height: 200,
    fontSize: 12,
    locale: 'en-US',
    id: 'g',
    onHitTest() {},
    hidden: new Set<string>(),
  }
}
