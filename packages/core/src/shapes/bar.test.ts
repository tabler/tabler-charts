import { describe, expect, test } from 'vitest'
import { barPath, hbarPath } from './bar.ts'

describe('barPath()', () => {
  test('draws a square bar with zero-radius corners', () => {
    expect(barPath(10, 20, 100, 40)).toBe('M10,100V40A0,0,0,0,1,10,40H30A0,0,0,0,1,30,40V100Z')
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
    expect(barPath(0, 20, 100, 100, 4)).toBe('M0,100V100A0,0,0,0,1,0,100H20A0,0,0,0,1,20,100V100Z')
    expect(barPath(5, -3, 100, 50, 4)).toBe('M5,100V50A0,0,0,0,1,5,50H5A0,0,0,0,1,5,50V100Z')
  })

  test('rounds coordinates to two decimals', () => {
    expect(barPath(1 / 3, 10, 100.004, 40.126)).toBe(
      'M0.33,100V40.13A0,0,0,0,1,0.33,40.13H10.33A0,0,0,0,1,10.33,40.13V100Z',
    )
  })
})

describe('hbarPath()', () => {
  test('draws a square bar with zero-radius corners', () => {
    expect(hbarPath(10, 20, 0, 60)).toBe('M0,10H60A0,0,0,0,1,60,10V30A0,0,0,0,1,60,30H0Z')
  })

  test('rounds only the right end of bars growing right', () => {
    expect(hbarPath(10, 20, 0, 60, 4)).toBe('M0,10H56A4,4,0,0,1,60,14V26A4,4,0,0,1,56,30H0Z')
  })

  test('rounds only the left end of bars growing left', () => {
    expect(hbarPath(10, 20, 100, 40, 4)).toBe('M100,10H44A4,4,0,0,0,40,14V26A4,4,0,0,0,44,30H100Z')
  })

  test('clamps the radius to half the height and to the length', () => {
    expect(hbarPath(0, 6, 0, 50, 10)).toContain('A3,3')
    expect(hbarPath(0, 20, 0, 2, 10)).toContain('A2,2')
  })
})
