import { describe, expect, test } from 'vitest'
import { niceDomain, tickStep, ticks } from './ticks.ts'

describe('ticks()', () => {
  test('produces exact decimal ticks', () => {
    expect(ticks(0, 1, 10)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1])
  })

  test('uses 1, 2 and 5 multiples', () => {
    expect(ticks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10])
    expect(ticks(0, 100, 3)).toEqual([0, 50, 100])
    expect(ticks(0, 1000, 10)).toEqual([0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000])
  })

  test('only returns ticks inside the domain', () => {
    expect(ticks(0.5, 9.5, 5)).toEqual([2, 4, 6, 8])
    expect(ticks(-12, 27, 4)).toEqual([-10, 0, 10, 20])
  })

  test('handles reversed domains', () => {
    expect(ticks(10, 0, 5)).toEqual([10, 8, 6, 4, 2, 0])
  })

  test('handles degenerate input', () => {
    expect(ticks(3, 3, 5)).toEqual([3])
    expect(ticks(0, 1, 0)).toEqual([])
    expect(ticks(0, Number.NaN, 5)).toEqual([])
    expect(ticks(0, Number.POSITIVE_INFINITY, 5)).toEqual([])
  })

  test('handles very small and large ranges', () => {
    expect(ticks(0, 0.001, 2)).toEqual([0, 0.0005, 0.001])
    expect(ticks(0, 5e9, 5)).toEqual([0, 1e9, 2e9, 3e9, 4e9, 5e9])
  })
})

describe('tickStep()', () => {
  test('returns the distance between ticks', () => {
    expect(tickStep(0, 1, 10)).toBe(0.1)
    expect(tickStep(0, 10, 5)).toBe(2)
    expect(tickStep(10, 0, 5)).toBe(-2)
  })
})

describe('niceDomain()', () => {
  test('extends the domain to round values', () => {
    expect(niceDomain(0.2, 9.7, 10)).toEqual([0, 10])
    expect(niceDomain(1.1, 10.9, 10)).toEqual([1, 11])
    expect(niceDomain(0.12, 0.95, 10)).toEqual([0.1, 1])
    expect(niceDomain(-3.4, 87, 5)).toEqual([-20, 100])
  })

  test('keeps the direction of reversed domains', () => {
    expect(niceDomain(9.7, 0.2, 10)).toEqual([10, 0])
  })

  test('gives up instead of growing the domain when the step never settles', () => {
    expect(niceDomain(-0.006, 47.7, 1)).toEqual([-0.006, 47.7])
  })

  test('leaves degenerate domains untouched', () => {
    expect(niceDomain(5, 5)).toEqual([5, 5])
    expect(niceDomain(0, Number.NaN)).toEqual([0, Number.NaN])
  })
})
