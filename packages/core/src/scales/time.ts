import { getDateFormat, type Locale } from '../format.ts'
import type { BandKey, BandScale } from './band.ts'
import { extent } from './extent.ts'
import { tickStep } from './ticks.ts'

/** A point in time: a `Date` or a timestamp in milliseconds. */
export type TimeValue = Date | number

export interface TimeScaleOptions {
  /** Align ticks to UTC instead of local time (use it for SSR). Defaults to `false`. */
  utc?: boolean
  /** Clamp output to the range. */
  clamp?: boolean
}

/** Continuous scale mapping time to a pixel range, with calendar-aware ticks. */
export interface TimeScale {
  (value: TimeValue): number
  readonly domain: readonly [number, number]
  readonly range: readonly [number, number]
  readonly utc: boolean
  /** Map a pixel back to a time. */
  invert(pixel: number): Date
  /** Tick dates at calendar boundaries, roughly `count` of them. */
  ticks(count?: number): Date[]
  /** A formatter suited to the tick interval chosen for `count`. */
  tickFormat(count?: number, locale?: Locale): (date: Date) => string
  /** A copy with the domain extended to tick boundaries. */
  nice(count?: number): TimeScale
}

type Unit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

interface Interval {
  unit: Unit
  step: number
  /** Approximate duration, for choosing an interval. */
  ms: number
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

const INTERVALS: Interval[] = [
  { unit: 'second', step: 1, ms: SECOND },
  { unit: 'second', step: 5, ms: 5 * SECOND },
  { unit: 'second', step: 15, ms: 15 * SECOND },
  { unit: 'second', step: 30, ms: 30 * SECOND },
  { unit: 'minute', step: 1, ms: MINUTE },
  { unit: 'minute', step: 5, ms: 5 * MINUTE },
  { unit: 'minute', step: 15, ms: 15 * MINUTE },
  { unit: 'minute', step: 30, ms: 30 * MINUTE },
  { unit: 'hour', step: 1, ms: HOUR },
  { unit: 'hour', step: 3, ms: 3 * HOUR },
  { unit: 'hour', step: 6, ms: 6 * HOUR },
  { unit: 'hour', step: 12, ms: 12 * HOUR },
  { unit: 'day', step: 1, ms: DAY },
  { unit: 'day', step: 2, ms: 2 * DAY },
  { unit: 'week', step: 1, ms: WEEK },
  { unit: 'month', step: 1, ms: MONTH },
  { unit: 'month', step: 3, ms: 3 * MONTH },
  { unit: 'year', step: 1, ms: YEAR },
]

/** Calendar arithmetic in local time or UTC. */
function calendar(utc: boolean) {
  const get = (d: Date, unit: Unit): number => {
    switch (unit) {
      case 'year':
        return utc ? d.getUTCFullYear() : d.getFullYear()
      case 'month':
        return utc ? d.getUTCMonth() : d.getMonth()
      case 'day':
      case 'week':
        return utc ? d.getUTCDate() : d.getDate()
      case 'hour':
        return utc ? d.getUTCHours() : d.getHours()
      case 'minute':
        return utc ? d.getUTCMinutes() : d.getMinutes()
      default:
        return utc ? d.getUTCSeconds() : d.getSeconds()
    }
  }
  const make = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0): Date =>
    utc ? new Date(Date.UTC(y, mo, d, h, mi, s)) : new Date(y, mo, d, h, mi, s)
  const weekday = (d: Date): number => (utc ? d.getUTCDay() : d.getDay())

  /** Start of the interval containing `date` (weeks start on Monday). */
  const floor = (date: Date, { unit, step }: Interval): Date => {
    const y = get(date, 'year')
    const mo = get(date, 'month')
    const d = get(date, 'day')
    switch (unit) {
      case 'year':
        return make(Math.floor(y / step) * step, 0, 1)
      case 'month':
        return make(y, Math.floor(mo / step) * step, 1)
      case 'week':
        return make(y, mo, d - ((weekday(date) + 6) % 7))
      case 'day':
        return make(y, mo, Math.floor((d - 1) / step) * step + 1)
      case 'hour':
        return make(y, mo, d, Math.floor(get(date, 'hour') / step) * step)
      case 'minute':
        return make(y, mo, d, get(date, 'hour'), Math.floor(get(date, 'minute') / step) * step)
      default:
        return make(
          y,
          mo,
          d,
          get(date, 'hour'),
          get(date, 'minute'),
          Math.floor(get(date, 'second') / step) * step,
        )
    }
  }

  /** `date` moved forward by one interval. */
  const next = (date: Date, { unit, step }: Interval): Date => {
    const y = get(date, 'year')
    const mo = get(date, 'month')
    const d = get(date, 'day')
    switch (unit) {
      case 'year':
        return make(y + step, 0, 1)
      case 'month':
        return make(y, mo + step, 1)
      case 'week':
        return make(y, mo, d + 7 * step)
      case 'day': {
        // Day steps restart at the first of each month, so ticks land on the 1st.
        const n = make(y, mo, d + step)
        return get(n, 'month') === mo ? n : make(y, mo + 1, 1)
      }
      case 'hour':
        return make(y, mo, d, get(date, 'hour') + step)
      case 'minute':
        return make(y, mo, d, get(date, 'hour'), get(date, 'minute') + step)
      default:
        return make(y, mo, d, get(date, 'hour'), get(date, 'minute'), get(date, 'second') + step)
    }
  }

  /** Whether `date` sits on the boundary of the unit above `unit`. */
  const boundary = (date: Date, unit: Unit): boolean => {
    switch (unit) {
      case 'second':
        return get(date, 'second') === 0
      case 'minute':
        return get(date, 'minute') === 0 && get(date, 'second') === 0
      case 'hour':
        return get(date, 'hour') === 0 && get(date, 'minute') === 0
      case 'day':
      case 'week':
        return get(date, 'day') === 1
      case 'month':
        return get(date, 'month') === 0
      default:
        return false
    }
  }

  return { floor, next, boundary }
}

/** Pick the interval whose duration is closest to `span / count`. */
function chooseInterval(span: number, count: number): Interval {
  const target = Math.abs(span) / Math.max(1, count)
  let i = 0
  while (i < INTERVALS.length && (INTERVALS[i] as Interval).ms < target) i++
  if (i === INTERVALS.length) {
    // Beyond one year: multiples of years.
    const years = Math.max(1, tickStep(0, target / YEAR, 1))
    return { unit: 'year', step: years, ms: years * YEAR }
  }
  if (i === 0) return INTERVALS[0] as Interval
  const lo = INTERVALS[i - 1] as Interval
  const hi = INTERVALS[i] as Interval
  return target / lo.ms < hi.ms / target ? lo : hi
}

const toMs = (value: TimeValue): number => (value instanceof Date ? value.getTime() : value)

/** Intl options for each tick unit, and for the boundary of the unit above it. */
const FORMATS: Record<Unit, [Intl.DateTimeFormatOptions, Intl.DateTimeFormatOptions | null]> = {
  second: [
    { hour: 'numeric', minute: '2-digit', second: '2-digit' },
    { hour: 'numeric', minute: '2-digit' },
  ],
  minute: [
    { hour: 'numeric', minute: '2-digit' },
    { hour: 'numeric', minute: '2-digit' },
  ],
  hour: [
    { hour: 'numeric', minute: '2-digit' },
    { month: 'short', day: 'numeric' },
  ],
  day: [{ month: 'short', day: 'numeric' }, null],
  week: [{ month: 'short', day: 'numeric' }, null],
  month: [{ month: 'short' }, { year: 'numeric' }],
  year: [{ year: 'numeric' }, null],
}

/**
 * Create a time scale over `[start, end]`.
 *
 * ```ts
 * const x = time([new Date(2026, 0, 1), new Date(2026, 2, 31)], [0, 600])
 * x.ticks()      // first of each month, or every week, depending on the range
 * x.tickFormat() // e.g. "Jan", "Feb"
 * ```
 */
export function time(
  domain: readonly [TimeValue, TimeValue],
  range: readonly [number, number],
  options: TimeScaleOptions = {},
): TimeScale {
  const utc = options.utc === true
  const d0 = toMs(domain[0])
  const d1 = toMs(domain[1])
  const [r0, r1] = range
  const span = d1 - d0
  const k = span === 0 ? 0 : (r1 - r0) / span
  const cal = calendar(utc)
  const clamp = options.clamp === true
  const rMin = Math.min(r0, r1)
  const rMax = Math.max(r0, r1)

  const scale = (value: TimeValue): number => {
    if (span === 0) return (r0 + r1) / 2
    const px = r0 + (toMs(value) - d0) * k
    return clamp ? Math.min(rMax, Math.max(rMin, px)) : px
  }

  const interval = (count = 5): Interval => chooseInterval(span, count)

  return Object.assign(scale, {
    domain: [d0, d1] as const,
    range: [r0, r1] as const,
    utc,
    invert(pixel: number): Date {
      return new Date(span === 0 || r1 === r0 ? d0 : d0 + (pixel - r0) / k)
    },
    ticks(count = 5): Date[] {
      if (!Number.isFinite(d0) || !Number.isFinite(d1)) return []
      const lo = Math.min(d0, d1)
      const hi = Math.max(d0, d1)
      if (lo === hi) return [new Date(lo)]
      const step = interval(count)
      const out: Date[] = []
      let t = cal.floor(new Date(lo), step)
      if (t.getTime() < lo) t = cal.next(t, step)
      while (t.getTime() <= hi && out.length < 1000) {
        out.push(t)
        t = cal.next(t, step)
      }
      return d1 < d0 ? out.reverse() : out
    },
    tickFormat(count = 5, locale?: Locale): (date: Date) => string {
      const { unit } = interval(count)
      const [primary, above] = FORMATS[unit]
      const tz = utc ? { timeZone: 'UTC' } : {}
      const main = getDateFormat(locale, { ...primary, ...tz })
      const upper = above ? getDateFormat(locale, { ...above, ...tz }) : null
      return (date) => (upper && cal.boundary(date, unit) ? upper : main).format(date)
    },
    nice(count = 5): TimeScale {
      if (span === 0 || !Number.isFinite(span)) return time(domain, range, options)
      const step = interval(count)
      const lo = cal.floor(new Date(Math.min(d0, d1)), step)
      let hi = cal.floor(new Date(Math.max(d0, d1)), step)
      if (hi.getTime() < Math.max(d0, d1)) hi = cal.next(hi, step)
      return time(d1 < d0 ? [hi, lo] : [lo, hi], range, options)
    },
  })
}

/**
 * A point scale over time for category charts: each category sits at its
 * real distance in time. Conforms to `BandScale` (zero bandwidth), so line
 * and area charts and their hit testing work unchanged. `stamps` must be
 * ascending; `keys` are the categories' keys.
 */
export function timePointScale(
  stamps: readonly number[],
  keys: readonly BandKey[],
  range: readonly [number, number],
  utc: boolean,
): { scale: BandScale; time: TimeScale } {
  // Spreading large arrays into Math.min/max overflows the stack, so scan.
  const [lo, hi] = extent(stamps) ?? [0, 1]
  const valid = stamps.filter((t) => Number.isFinite(t))
  const t = time([lo, hi], range, { utc })
  const positions = stamps.map((ms) => t(ms))
  const at = (i: number): number => positions[i] ?? range[0]
  const scale = Object.assign((key: BandKey) => positions[keys.indexOf(key)], {
    domain: keys.slice(),
    range,
    bandwidth: 0,
    step: valid.length > 1 ? (range[1] - range[0]) / (valid.length - 1) : 0,
    at,
    center: (key: BandKey) => positions[keys.indexOf(key)],
    indexAt(pixel: number): number {
      // Stamps are sorted, so the nearest position is found by binary search.
      if (positions.length === 0) return -1
      let a = 0
      let b = positions.length - 1
      while (a < b) {
        const mid = (a + b) >> 1
        if ((positions[mid] as number) < pixel) a = mid + 1
        else b = mid
      }
      const prev = a - 1
      return prev >= 0 && pixel - (positions[prev] as number) < (positions[a] as number) - pixel
        ? prev
        : a
    },
  })
  return { scale: scale as BandScale, time: t }
}
