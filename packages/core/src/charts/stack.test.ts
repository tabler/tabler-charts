import { describe, expect, test } from 'vitest'
import { stackBounds, stackSeries } from './stack.ts'

const series = [
  { name: 'A', values: [10, -5, null, 4] },
  { name: 'B', values: [20, 15, 3, -6] },
  { name: 'C', values: [-4, -10, 2, 0] },
]

describe('stackSeries()', () => {
  test('stacks positive values up and negative values down from zero', () => {
    const [a, b, c] = stackSeries(series, 4)
    expect(a?.[0]).toEqual({ y0: 0, y1: 10 })
    expect(b?.[0]).toEqual({ y0: 10, y1: 30 })
    expect(c?.[0]).toEqual({ y0: 0, y1: -4 })
    // Category 1: A is negative, B positive, C negative below A.
    expect([a?.[1], b?.[1], c?.[1]]).toEqual([
      { y0: 0, y1: -5 },
      { y0: 0, y1: 15 },
      { y0: -5, y1: -15 },
    ])
  })

  test('skips missing values, or counts them as zero', () => {
    const [a, b] = stackSeries(series, 4)
    expect(a?.[2]).toBeNull()
    expect(b?.[2]).toEqual({ y0: 0, y1: 3 })
    const [za, zb] = stackSeries(series, 4, { nullAsZero: true })
    expect(za?.[2]).toEqual({ y0: 0, y1: 0 })
    expect(zb?.[2]).toEqual({ y0: 0, y1: 3 })
  })

  test('normalizes by the sum of absolute values in percent mode', () => {
    const [a, b, c] = stackSeries(series, 4, { percent: true })
    // Category 0: |10| + |20| + |-4| = 34
    expect(a?.[0]?.y1).toBeCloseTo(10 / 34)
    expect(b?.[0]?.y1).toBeCloseTo(30 / 34)
    expect(c?.[0]?.y1).toBeCloseTo(-4 / 34)
    const [ea] = stackSeries([{ name: 'z', values: [0] }], 1, { percent: true })
    expect(ea?.[0]).toEqual({ y0: 0, y1: 0 })
  })

  test('percent shares sum to exactly one', () => {
    const [, , c] = stackSeries(
      [
        { name: 'a', values: [0.1] },
        { name: 'b', values: [0.2] },
        { name: 'c', values: [0.7] },
      ],
      1,
      { percent: true },
    )
    expect(c?.[0]?.y1).toBe(1)
  })

  test('leaves hidden series out of the stack', () => {
    const [a, b] = stackSeries(series, 4, { hidden: new Set(['A']) })
    expect(a?.every((segment) => segment === null)).toBe(true)
    expect(b?.[0]).toEqual({ y0: 0, y1: 20 })
  })

  test('stackBounds() lists every segment boundary', () => {
    const bounds = stackBounds(stackSeries(series, 4))
    expect(Math.max(...bounds)).toBe(30)
    expect(Math.min(...bounds)).toBe(-15)
  })
})
