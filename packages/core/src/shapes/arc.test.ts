import { describe, expect, test } from 'vitest'
import { arcCentroid, arcPath, arcPathStable, padAngleForGap } from './arc.ts'

const TAU = Math.PI * 2

describe('arcPath()', () => {
  test('draws a pie slice from the center', () => {
    // A quarter from 12 to 3 o'clock.
    expect(arcPath({ innerRadius: 0, outerRadius: 10, startAngle: 0, endAngle: TAU / 4 })).toBe(
      'M0,-10A10,10,0,0,1,10,0L0,0Z',
    )
  })

  test('draws an annular sector', () => {
    expect(arcPath({ innerRadius: 5, outerRadius: 10, startAngle: 0, endAngle: TAU / 4 })).toBe(
      'M0,-10A10,10,0,0,1,10,0L5,0A5,5,0,0,0,0,-5Z',
    )
  })

  test('uses the large arc flag past a half turn', () => {
    const d = arcPath({ innerRadius: 0, outerRadius: 10, startAngle: 0, endAngle: TAU * 0.75 })
    expect(d).toContain('A10,10,0,1,1')
  })

  test('draws full rings as two arcs per radius', () => {
    const d = arcPath({ innerRadius: 5, outerRadius: 10, startAngle: 0, endAngle: TAU })
    expect(d.match(/A10,10/g)).toHaveLength(2)
    expect(d.match(/A5,5/g)).toHaveLength(2)
  })

  test('rounds corners with extra arcs', () => {
    const d = arcPath({
      innerRadius: 50,
      outerRadius: 100,
      startAngle: 0,
      endAngle: TAU / 4,
      cornerRadius: 4,
    })
    expect(d.match(/A4,4/g)).toHaveLength(4)
  })

  test('pads arcs so neighbours keep a gap', () => {
    const padded = arcPath({
      innerRadius: 50,
      outerRadius: 100,
      startAngle: 0,
      endAngle: TAU / 4,
      padAngle: 0.1,
    })
    expect(padded.startsWith('M0,-100')).toBe(false)
  })

  test('handles empty radii', () => {
    expect(arcPath({ innerRadius: 0, outerRadius: 0, startAngle: 0, endAngle: 1 })).toBe('M0,0Z')
  })
})

describe('arcCentroid()', () => {
  test('returns the middle of the arc', () => {
    const [x, y] = arcCentroid({
      innerRadius: 0,
      outerRadius: 10,
      startAngle: 0,
      endAngle: TAU / 2,
    })
    expect(x).toBeCloseTo(5)
    expect(y).toBeCloseTo(0)
  })
})

describe('padAngleForGap()', () => {
  test('gives a pad angle whose chord at the pad radius equals the gap', () => {
    const angle = padAngleForGap(2, 60, 100)
    const rp = Math.sqrt(60 ** 2 + 100 ** 2)
    expect(2 * rp * Math.sin(angle / 2)).toBeCloseTo(2)
    expect(padAngleForGap(2, 0, 0)).toBe(0)
  })
})

describe('arcPathStable()', () => {
  const signature = (d: string) => d.replace(/[^MLAZ]/g, '')
  const numbers = (d: string) => (d.match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).map(Number)

  test('keeps the same command structure for any sector', () => {
    const cases = [
      { innerRadius: 0, outerRadius: 100, startAngle: 0, endAngle: 0.3 },
      { innerRadius: 0, outerRadius: 100, startAngle: 0, endAngle: 5 },
      {
        innerRadius: 60,
        outerRadius: 100,
        startAngle: 1,
        endAngle: 2,
        padAngle: 0.05,
        cornerRadius: 4,
      },
      {
        innerRadius: 60,
        outerRadius: 100,
        startAngle: 1,
        endAngle: 1.02,
        padAngle: 0.05,
        cornerRadius: 4,
      },
      { innerRadius: 60, outerRadius: 100, startAngle: 0, endAngle: TAU },
      { innerRadius: 0, outerRadius: 100, startAngle: 0, endAngle: TAU },
      { innerRadius: 60, outerRadius: 100, startAngle: 2, endAngle: 0.5 },
      { innerRadius: 0, outerRadius: 0, startAngle: 0, endAngle: 1 },
    ]
    const signatures = new Set(cases.map((c) => signature(arcPathStable(c))))
    expect(signatures.size).toBe(1)
    expect([...signatures][0]).toBe('MAAAALAAAAZ')
  })

  test('matches arcPath at the edges of plain and rounded sectors', () => {
    for (const c of [
      { innerRadius: 0, outerRadius: 100, startAngle: 0.2, endAngle: 2.5 },
      { innerRadius: 50, outerRadius: 100, startAngle: 0.2, endAngle: 4.5, padAngle: 0.04 },
      {
        innerRadius: 50,
        outerRadius: 100,
        startAngle: 0.2,
        endAngle: 2.2,
        padAngle: 0.04,
        cornerRadius: 6,
      },
    ]) {
      const exact = numbers(arcPath({ ...c, precision: 4 }))
      const stable = numbers(arcPathStable({ ...c, precision: 4 }))
      // Same start point (first M) and same end of the outer edge / start of the inner edge.
      expect(stable.slice(0, 2)).toEqual(exact.slice(0, 2))
      const lineStableIndex = arcPathStable({ ...c, precision: 4 }).indexOf('L')
      const lineExactIndex = arcPath({ ...c, precision: 4 }).indexOf('L')
      const after = (d: string, i: number) => numbers(d.slice(i, i + 40)).slice(0, 2)
      expect(after(arcPathStable({ ...c, precision: 4 }), lineStableIndex)).toEqual(
        after(arcPath({ ...c, precision: 4 }), lineExactIndex),
      )
    }
  })

  test('splits rings so no arc needs the large-arc flag', () => {
    const d = arcPathStable({ innerRadius: 40, outerRadius: 100, startAngle: 0, endAngle: 5.5 })
    for (const m of d.matchAll(/A[\d.]+,[\d.]+,0,(\d),/g)) expect(m[1]).toBe('0')
  })
})
