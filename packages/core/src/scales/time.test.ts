import { describe, expect, test } from 'vitest'
import { time } from './time.ts'

const utc = (y: number, m: number, d = 1, h = 0, mi = 0) => Date.UTC(y, m, d, h, mi)
const iso = (d: Date) => d.toISOString().replace('.000Z', 'Z')

describe('time()', () => {
  test('maps time linearly onto the range and back', () => {
    const x = time([utc(2026, 0, 1), utc(2026, 0, 3)], [0, 200], { utc: true })
    expect(x(utc(2026, 0, 2))).toBe(100)
    expect(x(new Date(utc(2026, 0, 3)))).toBe(200)
    expect(x.invert(50).getTime()).toBe(utc(2026, 0, 1, 12))
    expect(x.domain).toEqual([utc(2026, 0, 1), utc(2026, 0, 3)])
  })

  test('ticks at day boundaries for a two-week range', () => {
    const x = time([utc(2026, 8, 17, 10), utc(2026, 9, 1)], [0, 600], { utc: true })
    const ticks = x.ticks(7).map(iso)
    // ~2 days per tick: every other midnight, restarting on the 1st.
    expect(ticks[0]).toBe('2026-09-19T00:00:00Z')
    expect(ticks).toContain('2026-10-01T00:00:00Z')
    expect(ticks.every((t) => t.endsWith('T00:00:00Z'))).toBe(true)
  })

  test('ticks at the first of each month for a quarter, and years for a decade', () => {
    const months = time([utc(2026, 0, 15), utc(2026, 3, 15)], [0, 400], { utc: true })
    expect(months.ticks(3).map(iso)).toEqual([
      '2026-02-01T00:00:00Z',
      '2026-03-01T00:00:00Z',
      '2026-04-01T00:00:00Z',
    ])
    const years = time([utc(2016, 5), utc(2026, 5)], [0, 400], { utc: true })
    expect(years.ticks(5).map((d) => d.getUTCFullYear())).toEqual([2018, 2020, 2022, 2024, 2026])
  })

  test('ticks at hours within a day and weeks within months', () => {
    const hours = time([utc(2026, 0, 1, 0), utc(2026, 0, 2, 0)], [0, 600], { utc: true })
    expect(hours.ticks(8).map((d) => d.getUTCHours())).toEqual([0, 3, 6, 9, 12, 15, 18, 21, 0])
    const weeks = time([utc(2026, 8, 1), utc(2026, 9, 31)], [0, 600], { utc: true })
    const days = weeks.ticks(8)
    expect(days.every((d) => d.getUTCDay() === 1)).toBe(true) // Mondays
    expect(days.length).toBeGreaterThanOrEqual(7)
  })

  test('day ticks restart on the first of a month', () => {
    const x = time([utc(2026, 0, 27), utc(2026, 1, 6)], [0, 500], { utc: true })
    expect(x.ticks(5).map(iso)).toEqual([
      '2026-01-27T00:00:00Z',
      '2026-01-29T00:00:00Z',
      '2026-01-31T00:00:00Z',
      '2026-02-01T00:00:00Z',
      '2026-02-03T00:00:00Z',
      '2026-02-05T00:00:00Z',
    ])
  })

  test('formats ticks by interval and marks the boundary of the unit above', () => {
    const hours = time([utc(2026, 0, 1, 18), utc(2026, 0, 2, 6)], [0, 600], { utc: true })
    const fh = hours.tickFormat(4, 'en-US')
    expect(hours.ticks(4).map(fh)).toEqual(['6:00 PM', '9:00 PM', 'Jan 2', '3:00 AM', '6:00 AM'])
    const months = time([utc(2025, 9), utc(2026, 2)], [0, 600], { utc: true })
    expect(months.ticks(5).map(months.tickFormat(5, 'en-US'))).toEqual([
      'Oct',
      'Nov',
      'Dec',
      '2026',
      'Feb',
      'Mar',
    ])
    const years = time([utc(2020, 0), utc(2026, 0)], [0, 600], { utc: true })
    expect(years.ticks(3).map(years.tickFormat(3, 'en-US'))).toEqual([
      '2020',
      '2022',
      '2024',
      '2026',
    ])
  })

  test('nice() extends the domain to tick boundaries', () => {
    const x = time([utc(2026, 0, 15, 7), utc(2026, 3, 20)], [0, 400], { utc: true }).nice(3)
    expect(iso(new Date(x.domain[0]))).toBe('2026-01-01T00:00:00Z')
    expect(iso(new Date(x.domain[1]))).toBe('2026-05-01T00:00:00Z')
  })

  test('handles reversed and empty domains', () => {
    const rev = time([utc(2026, 0, 3), utc(2026, 0, 1)], [0, 200], { utc: true })
    expect(rev(utc(2026, 0, 1))).toBe(200)
    expect(rev.ticks(2).map(iso)).toEqual([
      '2026-01-03T00:00:00Z',
      '2026-01-02T00:00:00Z',
      '2026-01-01T00:00:00Z',
    ])
    const flat = time([utc(2026, 0, 1), utc(2026, 0, 1)], [0, 200])
    expect(flat(utc(2026, 0, 1))).toBe(100)
    expect(flat.ticks()).toHaveLength(1)
  })

  test('respects local time when not utc', () => {
    const x = time([new Date(2026, 0, 1, 5), new Date(2026, 0, 4)], [0, 300])
    expect(x.ticks(3).every((d) => d.getHours() === 0)).toBe(true)
  })
})
