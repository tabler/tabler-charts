import { describe, expect, test } from 'vitest'
import { groupSlices } from './others.ts'

const parts = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `P${i}`, value: n - i }))

describe('groupSlices()', () => {
  test('marks the one slice that groups the rest as Others, last', () => {
    const slices = groupSlices(parts(12), 4, 'Rest')
    expect(slices.map((s) => s.data.name)).toEqual(['P0', 'P1', 'P2', 'Rest'])
    expect(slices.map((s) => s.others)).toEqual([undefined, undefined, undefined, true])
    expect(slices[3]?.value).toBe(9 + 8 + 7 + 6 + 5 + 4 + 3 + 2 + 1)
  })

  test('has no Others when every entry fits, or with maxSlices 0', () => {
    expect(groupSlices(parts(9), undefined).some((s) => s.others)).toBe(false)
    expect(groupSlices(parts(30), 0).some((s) => s.others)).toBe(false)
  })
})
