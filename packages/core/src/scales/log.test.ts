import { describe, expect, test } from 'vitest'
import { log } from './log.ts'

describe('log()', () => {
  test('maps powers of the base evenly', () => {
    const y = log([1, 10000], [400, 0])
    expect(y(1)).toBe(400)
    expect(y(100)).toBe(200)
    expect(y(10000)).toBe(0)
    expect(y.invert(200)).toBeCloseTo(100)
  })

  test('ticks at powers over many decades', () => {
    expect(log([1, 1e6], [0, 1]).ticks(6)).toEqual([1, 10, 100, 1000, 10000, 100000, 1000000])
    expect(log([1, 1e12], [0, 1]).ticks(4)).toEqual([1, 1e3, 1e6, 1e9, 1e12])
  })

  test('adds multiples within few decades and thins them when crowded', () => {
    expect(log([1, 10], [0, 1]).ticks(10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(log([1, 100], [0, 1]).ticks(5)).toEqual([1, 2, 5, 10, 20, 50, 100])
    expect(log([1, 1000], [0, 1]).ticks(3)).toEqual([1, 10, 100, 1000])
  })

  test('only returns ticks inside the domain', () => {
    expect(log([3, 300], [0, 1]).ticks(5)).toEqual([5, 10, 20, 50, 100, 200])
  })

  test('nice() rounds the domain to powers', () => {
    expect(log([3, 300], [0, 1]).nice().domain).toEqual([1, 1000])
    expect(log([0.02, 7], [0, 1]).nice().domain).toEqual([0.01, 10])
  })

  test('supports other bases and negative domains', () => {
    const y = log([1, 8], [0, 3], { base: 2 })
    expect(y(2)).toBe(1)
    expect(y(4)).toBe(2)
    expect(y.ticks(3)).toEqual([1, 2, 4, 8])
    const neg = log([-1, -1000], [0, 3])
    expect(neg(-10)).toBe(1)
    expect(neg.ticks(3)).toEqual([-1, -10, -100, -1000])
  })

  test('clamps when asked and never returns NaN for zero', () => {
    const y = log([1, 100], [0, 100], { clamp: true })
    expect(y(1000)).toBe(100)
    expect(Number.isFinite(log([1, 100], [0, 100])(0))).toBe(true)
  })

  test('handles reversed domains', () => {
    expect(log([100, 1], [0, 1]).ticks(2)).toEqual([100, 10, 1])
  })
})
