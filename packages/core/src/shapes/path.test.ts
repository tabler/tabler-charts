import { describe, expect, test } from 'vitest'
import { areaPath, linePath, type Point } from './path.ts'

const pts: Point[] = [
  [0, 10],
  [10, 20],
  [20, 5],
]

describe('linePath()', () => {
  test('draws straight segments by default', () => {
    expect(linePath(pts)).toBe('M0,10L10,20L20,5')
  })

  test('returns an empty string for no points', () => {
    expect(linePath([])).toBe('')
    expect(linePath([null, [Number.NaN, 1]])).toBe('')
  })

  test('closes a lone point so it can render as a dot', () => {
    expect(linePath([[5, 5]])).toBe('M5,5Z')
  })

  test('starts a new subpath after gaps', () => {
    expect(linePath([[0, 0], [1, 1], null, [3, 3], [4, 4], [5, Number.NaN], [6, 6]])).toBe(
      'M0,0L1,1M3,3L4,4M6,6Z',
    )
  })

  test('rounds coordinates to the given precision', () => {
    const p: Point[] = [
      [0.123456, 1 / 3],
      [2.005, -0.0001],
    ]
    expect(linePath(p)).toBe('M0.12,0.33L2.01,0')
    expect(linePath(p, { precision: 0 })).toBe('M0,0L2,0')
    expect(linePath(p, { precision: 4 })).toBe('M0.1235,0.3333L2.005,-0.0001')
  })

  test('draws step curves', () => {
    expect(linePath(pts, { curve: 'step' })).toBe('M0,10L5,10L5,20L15,20L15,5L20,5')
    expect(linePath(pts, { curve: 'step-after' })).toBe('M0,10L10,10L10,20L20,20L20,5')
    expect(linePath(pts, { curve: 'step-before' })).toBe('M0,10L0,20L10,20L10,5L20,5')
  })

  test('draws monotone curves as cubic beziers through every point', () => {
    const d = linePath(pts, { curve: 'monotone' })
    expect(d.startsWith('M0,10C')).toBe(true)
    expect(d.match(/C/g)).toHaveLength(2)
    expect(d.endsWith(',20,5')).toBe(true)
  })

  test('monotone never overshoots the data', () => {
    const data: Point[] = [
      [0, 0],
      [10, 100],
      [20, 100],
      [30, 0],
    ]
    const numbers = linePath(data, { curve: 'monotone', precision: 6 })
      .split(/[MC,]/)
      .filter(Boolean)
      .map(Number)
    const ys = numbers.filter((_, i) => i % 2 === 1)
    expect(Math.max(...ys)).toBeLessThanOrEqual(100)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
  })

  test('monotone renders a run of identical points as a dot', () => {
    expect(
      linePath(
        [
          [1, 1],
          [1, 1],
        ],
        { curve: 'monotone' },
      ),
    ).toBe('M1,1Z')
  })

  test('monotone falls back to a line for two points and skips duplicates', () => {
    expect(
      linePath(
        [
          [0, 0],
          [10, 10],
        ],
        { curve: 'monotone' },
      ),
    ).toBe('M0,0L10,10')
    expect(
      linePath(
        [
          [0, 0],
          [0, 0],
          [10, 10],
        ],
        { curve: 'monotone' },
      ),
    ).toBe('M0,0L10,10')
  })
})

describe('areaPath()', () => {
  test('closes the area against a constant baseline', () => {
    expect(areaPath(pts, 30)).toBe('M0,10L10,20L20,5L20,30L10,30L0,30Z')
  })

  test('a flat baseline keeps the commands of a stacked one, so CSS can morph between them', () => {
    const commands = (d: string) => d.replace(/[^A-Z]/g, '')
    for (const curve of ['linear', 'monotone', 'step', 'step-before', 'step-after'] as const) {
      const flat = areaPath(pts, 30, { curve })
      expect(commands(flat), curve).toBe(commands(areaPath(pts, [30, 25, 20], { curve })))
      // Still straight along the baseline.
      expect(
        flat
          .split(/[A-Z]/)
          .filter(Boolean)
          .slice(-3)
          .every((p) => p.endsWith(',30')),
      ).toBe(true)
    }
  })

  test('follows a per-point baseline for stacked areas', () => {
    expect(areaPath(pts, [30, 25, 20])).toBe('M0,10L10,20L20,5L20,20L10,25L0,30Z')
  })

  test('mirrors step curves along a stacked baseline', () => {
    expect(areaPath(pts, [30, 25, 20], { curve: 'step-after' })).toBe(
      'M0,10L10,10L10,20L20,20L20,5L20,20L20,25L10,25L10,30L0,30Z',
    )
  })

  test('splits into closed subpaths at gaps in points or baseline', () => {
    const p: Point[] = [[0, 1], [1, 2], null, [3, 3], [4, 4], [5, 5]]
    expect(areaPath(p, 10)).toBe('M0,1L1,2L1,10L0,10ZM3,3L4,4L5,5L5,10L4,10L3,10Z')
    expect(areaPath(pts, [30, null, 20])).toBe('M0,10L0,30ZM20,5L20,20Z')
  })

  test('returns an empty string for no points', () => {
    expect(areaPath([], 0)).toBe('')
  })
})
