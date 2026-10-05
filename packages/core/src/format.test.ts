import { describe, expect, test } from 'vitest'
import {
  formatDate,
  formatDetail,
  formatNumber,
  formatTicks,
  getDateFormat,
  getNumberFormat,
  type NumberFormat,
  stepPrecision,
} from './format.ts'
import { tickStep, ticks } from './scales/ticks.ts'

/** Non-breaking spaces used by Intl as group and currency separators. */
const nbsp = (value: string) => value.replace(/ /g, ' ')

describe('formatNumber()', () => {
  test('uses Intl with the given locale', () => {
    expect(formatNumber(undefined, 'en-US')(1234567.891)).toBe('1,234,567.891')
    expect(formatNumber(undefined, 'de-DE')(1234.5)).toBe('1.234,5')
    expect(formatNumber(undefined, 'pl-PL')(12345.5)).toBe(nbsp('12 345,5'))
  })

  test('supports currency, percent and compact notation', () => {
    expect(formatNumber({ style: 'currency', currency: 'USD' }, 'en-US')(1234.5)).toBe('$1,234.50')
    expect(formatNumber({ style: 'currency', currency: 'PLN' }, 'pl-PL')(1234.5)).toBe(
      nbsp('1234,50 zł'),
    )
    expect(formatNumber({ style: 'percent' }, 'en-US')(0.256)).toBe('26%')
    expect(formatNumber({ notation: 'compact' }, 'en-US')(1_250_000)).toBe('1.3M')
  })

  test('passes custom functions through', () => {
    const fn = (v: number) => `${v} pts`
    expect(formatNumber(fn)).toBe(fn)
  })

  test('never prints negative zero', () => {
    expect(formatNumber(undefined, 'en-US')(-0)).toBe('0')
  })
})

describe('stepPrecision()', () => {
  test('returns the fraction digits needed for a step', () => {
    expect(stepPrecision(100)).toBe(0)
    expect(stepPrecision(1)).toBe(0)
    expect(stepPrecision(0.5)).toBe(1)
    expect(stepPrecision(0.2)).toBe(1)
    expect(stepPrecision(0.1)).toBe(1)
    expect(stepPrecision(0.05)).toBe(2)
    expect(stepPrecision(0.001)).toBe(3)
    expect(stepPrecision(-0.1)).toBe(1)
  })

  test('handles degenerate steps', () => {
    expect(stepPrecision(0)).toBe(0)
    expect(stepPrecision(Number.NaN)).toBe(0)
  })
})

describe('formatTicks()', () => {
  const axis = (start: number, stop: number, count: number, format?: NumberFormat) => {
    const fmt = formatTicks(tickStep(start, stop, count), format, 'en-US')
    return ticks(start, stop, count).map(fmt)
  }

  test('gives every tick the same precision', () => {
    expect(axis(0, 1, 2)).toEqual(['0.0', '0.5', '1.0'])
    expect(axis(0, 100, 5)).toEqual(['0', '20', '40', '60', '80', '100'])
    expect(axis(0, 0.1, 2)).toEqual(['0.00', '0.05', '0.10'])
  })

  test('adjusts precision for percentages', () => {
    expect(axis(0, 1, 4, { style: 'percent' })).toEqual(['0%', '20%', '40%', '60%', '80%', '100%'])
    expect(axis(0, 0.01, 2, { style: 'percent' })).toEqual(['0.0%', '0.5%', '1.0%'])
  })

  test('keeps user precision and compact notation', () => {
    expect(formatTicks(0.5, { maximumFractionDigits: 0 }, 'en-US')(1.5)).toBe('2')
    expect(formatTicks(500_000, { notation: 'compact' }, 'en-US')(1_500_000)).toBe('1.5M')
  })

  test('formats floating point noise around zero as zero', () => {
    expect(formatTicks(0.1, undefined, 'en-US')(-1e-17)).toBe('0.0')
  })

  test('passes custom functions through', () => {
    const fn = (v: number) => `#${v}`
    expect(formatTicks(1, fn)).toBe(fn)
  })
})

describe('formatDate()', () => {
  const date = new Date(Date.UTC(2026, 0, 5, 12))

  test('uses Intl with the given locale', () => {
    const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' } as const
    expect(formatDate(opts, 'en-US')(date)).toBe('Jan 5')
    expect(formatDate(opts, 'pl-PL')(date)).toBe('5 sty')
  })

  test('accepts timestamps', () => {
    expect(formatDate({ year: 'numeric', timeZone: 'UTC' }, 'en-US')(date.getTime())).toBe('2026')
  })

  test('wraps custom functions to accept timestamps', () => {
    const fmt = formatDate((d) => d.toISOString().slice(0, 10))
    expect(fmt(date.getTime())).toBe('2026-01-05')
    expect(fmt(date)).toBe('2026-01-05')
  })
})

describe('Intl caches', () => {
  test('reuse instances for equal locale and options', () => {
    expect(getNumberFormat('en-US', { style: 'percent' })).toBe(
      getNumberFormat('en-US', { style: 'percent' }),
    )
    expect(getNumberFormat('en-US')).not.toBe(getNumberFormat('de-DE'))
    expect(getDateFormat('en-US', { year: 'numeric' })).toBe(
      getDateFormat('en-US', { year: 'numeric' }),
    )
  })
})

describe('formatDetail()', () => {
  test('compact formats keep three significant digits for single values', () => {
    const compact = { style: 'currency', currency: 'USD', notation: 'compact' } as const
    expect(formatNumber(compact, 'en-US')(24_812)).toBe('$25K')
    expect(formatDetail(compact, 'en-US')(24_812)).toBe('$24.8K')
    expect(formatDetail(compact, 'en-US')(1_410_000_000)).toBe('$1.41B')
  })

  test('other formats, and compact ones with their own precision, stay as they are', () => {
    expect(formatDetail({ style: 'percent' }, 'en-US')(0.125)).toBe('13%')
    expect(formatDetail({ notation: 'compact', maximumFractionDigits: 0 }, 'en-US')(24_812)).toBe(
      '25K',
    )
    expect(formatDetail(undefined, 'en-US')(24_812)).toBe('24,812')
    expect(formatDetail((v) => `${v}!`, 'en-US')(3)).toBe('3!')
  })
})

describe('compactSymbols', () => {
  const symbols = { notation: 'compact', compactSymbols: ['k', 'M', 'G'] } as const

  test('writes its own suffixes, in the locale separators', () => {
    const en = formatNumber(symbols, 'en-US')
    expect([999, 1000, 1500, 1_100_000, 2_500_000_000].map(en)).toEqual([
      '999',
      '1k',
      '1.5k',
      '1.1M',
      '2.5G',
    ])
    expect(formatNumber(symbols, 'pl-PL')(1_100_000)).toBe('1,1M')
    expect(formatNumber({ compactSymbols: true }, 'pl-PL')(1000)).toBe('1K')
    expect(formatNumber({ compactSymbols: true }, 'de-DE')(2_500_000_000)).toBe('2,5B')
  })

  test('rounds like compact notation, into the next thousand', () => {
    const en = formatNumber(symbols, 'en-US')
    expect([1250, 12_500, 125_400, 999_950, 0.123].map(en)).toEqual([
      '1.3k',
      '13k',
      '125k',
      '1M',
      '0.12',
    ])
  })

  test('keeps the last suffix for larger numbers', () => {
    expect(formatNumber(symbols, 'en-US')(1.5e12)).toBe('1,500G')
  })

  test('puts the suffix after the digits: signs and currencies stay around them', () => {
    expect(formatNumber(symbols, 'en-US')(-1500)).toBe('-1.5k')
    expect(formatNumber({ ...symbols, style: 'currency', currency: 'USD' }, 'en-US')(25_000)).toBe(
      '$25k',
    )
    expect(
      formatNumber({ ...symbols, style: 'currency', currency: 'PLN' }, 'pl-PL')(1_100_000),
    ).toBe(nbsp('1,1M zł'))
  })

  test('respects digits of its own, and the detail format keeps three digits', () => {
    expect(formatNumber({ ...symbols, maximumFractionDigits: 2 }, 'en-US')(1_234_567)).toBe('1.23M')
    expect(formatDetail(symbols, 'en-US')(24_812)).toBe('24.8k')
    expect(formatTicks(500_000, symbols, 'en-US')(1_500_000)).toBe('1.5M')
  })

  test('leaves values that are not finite to Intl', () => {
    expect(formatNumber(symbols, 'en-US')(Number.POSITIVE_INFINITY)).toBe('∞')
    expect(formatNumber(symbols, 'en-US')(Number.NaN)).toBe('NaN')
  })

  test('`false` is plain Intl', () => {
    expect(formatNumber({ compactSymbols: false }, 'en-US')(1500)).toBe('1,500')
  })
})
