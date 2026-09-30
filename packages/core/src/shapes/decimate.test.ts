import '../decimate.ts'
import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig } from '../chart.ts'
import { area } from '../charts/area.ts'
import { type LineOptions, line } from '../charts/line.ts'
import { findByClass } from '../test-utils.ts'
import { lttb, lttbIndices } from './decimate.ts'
import type { Point } from './path.ts'

const wave = (n: number): Point[] =>
  Array.from({ length: n }, (_, i) => [i, Math.sin(i / 7) * 50 + (i % 50 === 25 ? 200 : 0)])

describe('lttbIndices()', () => {
  test('keeps everything at or under the threshold', () => {
    expect(lttbIndices(wave(10), 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(lttbIndices(wave(10), 2)).toHaveLength(10)
  })

  test('returns about threshold points, in order, with both ends', () => {
    const kept = lttbIndices(wave(1000), 100)
    expect(kept.length).toBe(100)
    expect(kept[0]).toBe(0)
    expect(kept[kept.length - 1]).toBe(999)
    expect(kept.every((v, i) => i === 0 || v > (kept[i - 1] as number))).toBe(true)
  })

  test('keeps the spikes', () => {
    const points = wave(1000)
    const kept = new Set(lttbIndices(points, 100))
    const spikes = points.map((_, i) => i).filter((i) => i % 50 === 25)
    const found = spikes.filter((i) => kept.has(i)).length
    expect(found).toBeGreaterThanOrEqual(spikes.length - 1)
  })

  test('preserves gaps and samples each run separately', () => {
    const points: Point[] = [...wave(300), null, null, ...wave(700)]
    const kept = lttbIndices(points, 50)
    const gaps = kept.filter((i) => points[i] === null)
    expect(gaps).toEqual([300])
    const sampled = lttb(points, 50)
    expect(sampled.filter((p) => p === null)).toHaveLength(1)
    expect(sampled.length).toBeLessThanOrEqual(53)
    expect(sampled[0]).toEqual(points[0])
    expect(sampled[sampled.length - 1]).toEqual(points[points.length - 1])
  })

  test('handles leading and trailing gaps', () => {
    const points: Point[] = [null, ...wave(100), null]
    const kept = lttbIndices(points, 10)
    expect(kept[0]).toBe(0)
    expect(kept[kept.length - 1]).toBe(101)
  })
})

describe('decimate option', () => {
  const values = Array.from({ length: 5000 }, (_, i) => Math.round(50 + Math.sin(i / 40) * 40))
  const base: ChartConfig<LineOptions> = {
    type: line,
    id: 'd',
    locale: 'en-US',
    data: {
      series: [
        { name: 'A', values },
        { name: 'B', values: values.map((v) => v / 2) },
      ],
    },
    curve: 'linear',
    points: 'all',
  }
  const segments = (d: unknown) => (String(d).match(/[LM]/g) ?? []).length

  test('draws long series with fewer points but keeps every value for hovering', () => {
    const full = buildChart(base, { width: 600, height: 300 }, 'd')
    const thin = buildChart({ ...base, decimate: 200 }, { width: 600, height: 300 }, 'd')
    expect(segments(findByClass(full, 'tc-line')[0]?.attrs.d)).toBe(5000)
    expect(segments(findByClass(thin, 'tc-line')[0]?.attrs.d)).toBe(200)
    expect(findByClass(thin, 'tc-point')).toHaveLength(400)
    let count = 0
    buildChart({ ...base, decimate: 200 }, { width: 600, height: 300 }, 'd', (i) => {
      count = i.count
    })
    expect(count).toBe(5000)
  })

  test('keeps stacked areas aligned with their baselines', () => {
    const node = buildChart(
      { ...base, type: area, stacked: true, decimate: 100 },
      { width: 600, height: 300 },
      'd',
    )
    const [a, b] = findByClass(node, 'tc-area').map((p) => String(p.attrs.d))
    if (!a || !b) throw new Error('missing areas')
    // B's bottom edge (second half, reversed) equals A's top edge, point for point.
    const pts = (d: string) => d.match(/-?[\d.]+,-?[\d.]+/g) ?? []
    const aTop = pts(a).slice(0, 100)
    const bBottom = pts(b).slice(100).reverse()
    expect(bBottom).toEqual(aTop)
  })

  test('does nothing for short series', () => {
    const node = buildChart({ ...base, decimate: 10000 }, { width: 600, height: 300 }, 'd')
    expect(segments(findByClass(node, 'tc-line')[0]?.attrs.d)).toBe(5000)
  })
})
