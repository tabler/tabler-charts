import { describe, expect, test } from 'vitest'
import { estimateTextWidth, innerRect, insets } from './layout.ts'

describe('insets()', () => {
  test('expands a number to all sides', () => {
    expect(insets(4)).toEqual({ top: 4, right: 4, bottom: 4, left: 4 })
  })

  test('fills missing sides with the fallback', () => {
    expect(insets({ left: 10 }, 2)).toEqual({ top: 2, right: 2, bottom: 2, left: 10 })
    expect(insets(undefined)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })
})

describe('innerRect()', () => {
  test('subtracts margins', () => {
    expect(innerRect(400, 300, { top: 10, right: 20, bottom: 30, left: 40 })).toEqual({
      x: 40,
      y: 10,
      width: 340,
      height: 260,
    })
  })

  test('never returns a negative size', () => {
    expect(innerRect(10, 10, insets(20))).toEqual({ x: 20, y: 20, width: 0, height: 0 })
  })
})

describe('estimateTextWidth()', () => {
  test('scales with font size and length', () => {
    expect(estimateTextWidth('', 12)).toBe(0)
    expect(estimateTextWidth('1000', 24)).toBeCloseTo(estimateTextWidth('1000', 12) * 2)
    expect(estimateTextWidth('10000', 12)).toBeGreaterThan(estimateTextWidth('1000', 12))
  })

  test('treats narrow and wide characters differently', () => {
    expect(estimateTextWidth('iiii', 12)).toBeLessThan(estimateTextWidth('aaaa', 12))
    expect(estimateTextWidth('MMMM', 12)).toBeGreaterThan(estimateTextWidth('AAAA', 12))
  })

  test('is in a realistic range for UI fonts', () => {
    // "Revenue" in a 12px system font renders at roughly 45–50px.
    const width = estimateTextWidth('Revenue', 12)
    expect(width).toBeGreaterThan(40)
    expect(width).toBeLessThan(55)
  })
})
