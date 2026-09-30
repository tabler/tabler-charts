import { describe, expect, test } from 'vitest'
import { band, point } from './band.ts'
import { extent } from './extent.ts'

describe('band()', () => {
  test('splits the range into equal bands', () => {
    const x = band(['a', 'b', 'c', 'd'], [0, 400])
    expect(x.step).toBe(100)
    expect(x.bandwidth).toBe(100)
    expect(['a', 'b', 'c', 'd'].map((k) => x(k))).toEqual([0, 100, 200, 300])
  })

  test('applies inner and outer padding', () => {
    const x = band(['a', 'b'], [0, 120], { paddingInner: 0.5, paddingOuter: 0.25 })
    // step = 120 / (2 - 0.5 + 0.5) = 60, bandwidth = 30, start = (120 - 60 * 1.5) / 2 = 15
    expect(x.step).toBe(60)
    expect(x.bandwidth).toBe(30)
    expect(x('a')).toBe(15)
    expect(x('b')).toBe(75)
    expect(x.center('b')).toBe(90)
  })

  test('aligns leftover space', () => {
    const opts = { paddingOuter: 1 } as const
    expect(band(['a'], [0, 30], { ...opts, align: 0 })('a')).toBe(0)
    expect(band(['a'], [0, 30], { ...opts, align: 1 })('a')).toBe(20)
  })

  test('returns undefined for unknown keys', () => {
    const x = band(['a'], [0, 10])
    expect(x('z')).toBeUndefined()
    expect(x.center('z')).toBeUndefined()
  })

  test('distinguishes number and string keys', () => {
    const x = band([2024, '2024'], [0, 20])
    expect(x(2024)).toBe(0)
    expect(x('2024')).toBe(10)
  })

  test('supports reversed ranges', () => {
    const y = band(['a', 'b', 'c'], [300, 0])
    expect(y('a')).toBe(200)
    expect(y('c')).toBe(0)
    expect(y.indexAt(250)).toBe(0)
    expect(y.indexAt(10)).toBe(2)
  })

  test('finds the nearest band for a pixel', () => {
    const x = band(['a', 'b', 'c'], [0, 300], { paddingInner: 0.2 })
    expect(x.indexAt(-50)).toBe(0)
    expect(x.indexAt(150)).toBe(1)
    expect(x.indexAt(999)).toBe(2)
    expect(band([], [0, 100]).indexAt(10)).toBe(-1)
  })

  test('copies the domain', () => {
    const keys = ['a', 'b']
    const x = band(keys, [0, 10])
    keys.push('c')
    expect(x.domain).toEqual(['a', 'b'])
  })
})

describe('point()', () => {
  test('places points at the edges without padding', () => {
    const x = point(['a', 'b', 'c'], [0, 200])
    expect(x.bandwidth).toBe(0)
    expect(['a', 'b', 'c'].map((k) => x(k))).toEqual([0, 100, 200])
    expect(x.center('b')).toBe(100)
  })

  test('adds outer padding in steps', () => {
    const x = point(['a', 'b', 'c'], [0, 300], { padding: 0.5 })
    expect(x.step).toBe(100)
    expect(x('a')).toBe(50)
    expect(x('c')).toBe(250)
  })

  test('centers a single point', () => {
    expect(point(['a'], [0, 100])('a')).toBe(50)
  })
})

describe('extent()', () => {
  test('returns min and max, skipping empty values', () => {
    expect(extent([3, null, 1, Number.NaN, 7, undefined])).toEqual([1, 7])
  })

  test('returns undefined for empty input', () => {
    expect(extent([])).toBeUndefined()
    expect(extent([null, Number.NaN])).toBeUndefined()
  })
})
