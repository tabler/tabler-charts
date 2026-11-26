import { describe, expect, test } from 'vitest'
import { estimateTextWidth, type FrameInsets, innerRect, insets, plotFrame } from './layout.ts'

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
    // Full-width characters take a whole em: CJK, Hangul, emoji.
    expect(estimateTextWidth('十二月', 12)).toBe(36)
    expect(estimateTextWidth('한국', 10)).toBe(20)
    expect(estimateTextWidth('🍎', 12)).toBe(12)
  })

  test('counts a character once, whatever it takes to encode', () => {
    // Accented letters are average ones; an emoji (two code units) is one em, not two.
    expect(estimateTextWidth('é', 100)).toBeCloseTo(57)
    expect(estimateTextWidth('a🍎a', 100)).toBeCloseTo(214)
    // Half of a pair on its own is still one character.
    expect(estimateTextWidth('\ud83d', 100)).toBeCloseTo(57)
  })

  test('is in a realistic range for UI fonts', () => {
    // "Revenue" in a 12px system font renders at roughly 45–50px.
    const width = estimateTextWidth('Revenue', 12)
    expect(width).toBeGreaterThan(40)
    expect(width).toBeLessThan(55)
  })
})

describe('plotFrame()', () => {
  const size = { width: 400, height: 200 }
  const grow = (pad: FrameInsets): FrameInsets => ({
    top: pad.top + 5,
    bottom: pad.bottom + 20,
    start: pad.start + 40,
    end: pad.end + 10,
  })

  test('puts the start side on the left, the range from the left', () => {
    const frame = plotFrame(size, { left: 30 }, grow)
    expect(frame.area).toEqual({ x: 70, y: 5, width: 320, height: 175 })
    expect(frame.side).toBe('left')
    expect(frame.range()).toEqual([70, 390])
    expect(frame.range(true)).toEqual([390, 70])
  })

  test('right to left, the start side and the range move to the right', () => {
    const frame = plotFrame({ ...size, rtl: true }, { left: 30 }, grow)
    // The padding stays where it was given: on the left, now the end side.
    expect(frame.area).toEqual({ x: 40, y: 5, width: 320, height: 175 })
    expect(frame.side).toBe('right')
    expect(frame.range()).toEqual([360, 40])
    expect(frame.range(false)).toEqual([40, 360])
  })

  test('hands the padding over by reading direction', () => {
    const seen: FrameInsets[] = []
    const spy = (pad: FrameInsets) => {
      seen.push(pad)
      return pad
    }
    plotFrame(size, { left: 1, right: 2, top: 3 }, spy)
    plotFrame({ ...size, rtl: true }, { left: 1, right: 2, top: 3 }, spy)
    expect(seen).toMatchObject([
      { top: 3, bottom: 0, start: 1, end: 2 },
      { top: 3, bottom: 0, start: 2, end: 1 },
    ])
  })

  test('never leaves a negative area', () => {
    const frame = plotFrame({ width: 20, height: 10 }, 0, grow)
    expect(frame.area.width).toBe(0)
    expect(frame.area.height).toBe(0)
  })
})
