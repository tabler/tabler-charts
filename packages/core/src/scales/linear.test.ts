import { describe, expect, test } from 'vitest'
import { linear } from './linear.ts'

describe('linear()', () => {
  test('maps domain to range', () => {
    const x = linear([0, 100], [0, 500])
    expect(x(0)).toBe(0)
    expect(x(50)).toBe(250)
    expect(x(100)).toBe(500)
    expect(x(120)).toBe(600)
  })

  test('supports inverted ranges (y axis)', () => {
    const y = linear([0, 10], [300, 0])
    expect(y(0)).toBe(300)
    expect(y(10)).toBe(0)
    expect(y(2.5)).toBe(225)
  })

  test('inverts pixels back to values', () => {
    const y = linear([-50, 50], [200, 0])
    expect(y.invert(100)).toBe(0)
    expect(y.invert(y(37))).toBeCloseTo(37)
  })

  test('clamps when requested', () => {
    const x = linear([0, 10], [0, 100], { clamp: true })
    expect(x(-5)).toBe(0)
    expect(x(15)).toBe(100)
    expect(x.invert(150)).toBe(10)
  })

  test('maps a zero-width domain to the middle of the range', () => {
    const y = linear([5, 5], [300, 0])
    expect(y(5)).toBe(150)
    expect(y(100)).toBe(150)
    expect(y.invert(10)).toBe(5)
  })

  test('exposes domain, range and ticks', () => {
    const y = linear([0, 10], [100, 0])
    expect(y.domain).toEqual([0, 10])
    expect(y.range).toEqual([100, 0])
    expect(y.ticks(5)).toEqual([0, 2, 4, 6, 8, 10])
  })

  test('nice() returns a new scale with a rounded domain', () => {
    const y = linear([0.2, 9.7], [100, 0], { clamp: true })
    const nice = y.nice(10)
    expect(nice).not.toBe(y)
    expect(y.domain).toEqual([0.2, 9.7])
    expect(nice.domain).toEqual([0, 10])
    expect(nice.range).toEqual([100, 0])
    expect(nice(20)).toBe(0)
  })
})
