import { describe, expect, test } from 'vitest'
import { barPath } from './bar.ts'

describe('barPath()', () => {
  test('draws a square bar without radius', () => {
    expect(barPath(10, 20, 100, 40)).toBe('M10,100V40H30V100Z')
  })

  test('rounds only the top of bars growing up', () => {
    expect(barPath(10, 20, 100, 40, 4)).toBe('M10,100V44A4,4,0,0,1,14,40H26A4,4,0,0,1,30,44V100Z')
  })

  test('rounds only the bottom of bars growing down', () => {
    expect(barPath(10, 20, 100, 160, 4)).toBe(
      'M10,100V156A4,4,0,0,0,14,160H26A4,4,0,0,0,30,156V100Z',
    )
  })

  test('clamps the radius to half the width and to the height', () => {
    expect(barPath(0, 6, 100, 50, 10)).toContain('A3,3')
    expect(barPath(0, 20, 100, 98, 10)).toBe('M0,100V100A2,2,0,0,1,2,98H18A2,2,0,0,1,20,100V100Z')
  })

  test('renders zero-height and zero-width bars as degenerate squares', () => {
    expect(barPath(0, 20, 100, 100, 4)).toBe('M0,100V100H20V100Z')
    expect(barPath(5, -3, 100, 50, 4)).toBe('M5,100V50H5V100Z')
  })

  test('rounds coordinates to two decimals', () => {
    expect(barPath(1 / 3, 10, 100.004, 40.126)).toBe('M0.33,100V40.13H10.33V100Z')
  })
})
