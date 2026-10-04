import { describe, expect, test } from 'vitest'
import '../annotations.ts'
import { chartToString } from '../chart.ts'
import { bar } from './bar.ts'
import { toMs } from './cartesian.ts'
import { cleanSeries, finite, numbers } from './clean.ts'
import { gauge } from './gauge.ts'
import { line } from './line.ts'
import { pie } from './pie.ts'
import { scatter } from './scatter.ts'

describe('clean data', () => {
  test('numbers the chart cannot draw become gaps; tiny ones zero', () => {
    expect([1, -0, Number.NaN, Number.POSITIVE_INFINITY, 1e301, '4', null, {}].map(finite)).toEqual(
      [1, 0, null, null, null, null, null, null],
    )
    expect(finite(5e-324)).toBe(0)
    expect(finite(1e300)).toBe(1e300)
  })

  test('clean values keep their array, so large data is not copied', () => {
    const values = [1, null, undefined, 3]
    expect(numbers(values)).toBe(values)
    expect(numbers([1, '2', Number.NaN])).toEqual([1, null, null])
    expect(numbers('abc')).toEqual([])
  })

  test('series: names become text, colors must be strings, junk items are left out', () => {
    expect(
      cleanSeries({
        labels: ['a', null, 3, new Date(Number.NaN)],
        series: [{ name: 5, values: [1, 'x'], color: 3, dash: Number.NaN }, null, 'abc'],
      }),
    ).toEqual({
      labels: ['a', '', 3, ''],
      series: [
        {
          name: '5',
          id: undefined,
          values: [1, null],
          color: undefined,
          dash: undefined,
        },
      ],
    })
    expect(cleanSeries(null)).toEqual({ labels: undefined, series: [] })
  })

  test('every type renders junk data without NaN', () => {
    const size = { width: 300, height: 150 }
    const svg = [
      chartToString({ type: bar, data: { labels: 'x', series: true } } as never, size),
      chartToString(
        { type: line, data: { series: [{ name: 'A', values: [1e308, -1e308] }] } } as never,
        size,
      ),
      chartToString(
        {
          type: pie,
          data: [{ name: 'A', value: Number.NaN }, 'x', { name: 'B', value: 2 }],
        } as never,
        size,
      ),
      chartToString(
        { type: gauge, data: { name: 'A', value: '50', max: Number.NaN } } as never,
        size,
      ),
      chartToString(
        {
          type: scatter,
          data: {
            series: [
              {
                name: 'A',
                points: [
                  { x: 1, y: 'a' },
                  { x: 2, y: 3 },
                ],
              },
            ],
          },
        } as never,
        size,
      ),
    ].join('')
    expect(svg).not.toMatch(/NaN|Infinity|undefined/)
  })

  test('axis bounds and annotations from outside are cleaned too', () => {
    const svg = chartToString(
      {
        type: line,
        data: { labels: ['a', 'b'], series: [{ name: 'A', values: [1, 2] }] },
        y: { min: 'abc', max: Number.NaN, ticks: 1e308 },
        annotations: [{ y: 1.5, label: 7 }, { y: [{}, 2] }, 'x', { y: [0, 1], color: 5 }],
      } as never,
      { width: 300, height: 150 },
    )
    expect(svg).not.toMatch(/NaN|Infinity|undefined/)
    // The label became text; the broken band and the string were left out.
    expect(svg.match(/class="tc-annotation /g)).toHaveLength(2)
    expect(svg).toContain('>7</text>')
  })

  test('timestamps out of the Date range are not dates', () => {
    expect(toMs(1e300)).toBeNaN()
    expect(toMs(0)).toBe(0)
    expect(toMs('2026-01-01')).toBe(Date.UTC(2026, 0, 1))
  })
})
