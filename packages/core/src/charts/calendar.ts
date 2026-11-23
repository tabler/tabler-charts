import type { ChartType, DataTable, LegendItem, RenderContext } from '../chart.ts'
import { axis, axisSize, type Tick, thinTicks } from '../components/axis.ts'
import { type DateFormat, formatDate, formatNumber, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import {
  estimateTextWidth,
  type InsetsInput,
  innerRect,
  insets,
  LINE_HEIGHT,
  round,
} from '../layout.ts'
import { rectPath } from '../shapes/rect.ts'
import { type ClassValue, h, type StyleValue, type VNode } from '../vnode.ts'
import { cleanData, finite, isRecord, named, records } from './clean.ts'
import { keyOf, legendItems } from './named.ts'

/** One day's value. Several entries on the same day add up. */
export interface CalendarEntry {
  /** The day: a `Date`, a timestamp, or anything `new Date()` reads (`'2026-10-26'`). */
  date: Date | string | number
  /** `null` leaves the day empty (drawn faded, like a day without data). */
  value: number | null
}

/** A kind of activity (commits, reviews …), with its own legend entry. */
export interface CalendarSeries {
  name: string
  values: readonly CalendarEntry[]
  /** Stable identity for keyed updates. Defaults to `name`. */
  id?: string
  /**
   * Custom color of the legend and tooltip swatch. Values that could inject
   * CSS (`;`, quotes, `url()` …) are ignored, so colors from user data are safe.
   */
  color?: string
  /** Extra classes on the legend entry. */
  class?: ClassValue
  /** Start hidden (toggle it back from the legend). */
  hidden?: boolean
}

export interface CalendarData {
  series: readonly CalendarSeries[]
}

export interface CalendarOptions {
  /** Days and their values, as one list or as several series that add up (the legend filters them). */
  data: CalendarData | readonly CalendarEntry[]
  /** First day shown (at most ten years before `to`). Defaults to the first day in the data, or the start of the `weeks` window. */
  from?: Date | string | number
  /** Last day shown. Defaults to the last day in the data. */
  to?: Date | string | number
  /** Number of week columns ending with the week of `to`, when `from` is not set (e.g. `12`). */
  weeks?: number
  /** First day of the week: `0` Sunday … `6` Saturday. Defaults to `1` (Monday). */
  weekStart?: number
  /** Read the dates in UTC instead of local time. */
  utc?: boolean
  /** Value shown as empty. Defaults to the smaller of `0` and the data minimum. */
  min?: number
  /** Value shown with the full color. Defaults to the data maximum. */
  max?: number
  /** Number of shades between empty and the full color (the steps of the scale). Defaults to `4`. */
  levels?: number
  /**
   * A scale through two or more colors (any CSS color, including
   * `var(--tc-…)`) from `min` to `max` in `levels` steps, instead of one hue.
   * `'diverging'` is two hues around a neutral middle, for values with a sign
   * (changes, balances): the middle sits on `mid`, `0` by default, and the
   * two ends are equally far from it unless `min` or `max` is set.
   * Values that could inject CSS are ignored, as for series colors.
   */
  colors?: 'diverging' | readonly string[]
  /** Value placed on the middle color of `colors`. Defaults to `0` for `'diverging'`, else halfway. */
  mid?: number
  /** Space between cells in pixels, drawn as surface. Defaults to `2`. */
  gap?: number
  /** Corner radius of the cells. Defaults to `2`. */
  radius?: number
  /** Format of the values (tooltip, table). */
  format?: NumberFormat
  /** Format of the day in the tooltip and the table. Defaults to e.g. "Oct 26, 2026". */
  dateFormat?: DateFormat
  /** Month names above the columns where a month begins. */
  x?: { show?: boolean; format?: (date: Date) => string }
  /** Weekday names on the left. */
  y?: { show?: boolean; format?: (date: Date) => string }
  /**
   * The low-to-high scale below the grid: `false` hides it, an object names
   * its ends (defaults `'Less'` and `'More'`; with `colors`, the values at the ends).
   */
  scale?: boolean | { low?: string; high?: string }
  /** Extra space around the grid, in pixels. */
  padding?: InsetsInput
}

const DAY = 86_400_000
/** `colors: 'diverging'`: two hues around a neutral middle. */
const DIVERGING = ['var(--tc-color-1)', 'var(--tc-grid-color)', 'var(--tc-color-8)']
const MONDAY = 1
/** Most days drawn (ten years): a range from junk dates stays finite. */
const MAX_DAYS = 3660

/** A timestamp from a date value, or `null` for anything that is not a date. */
const stamp = (v: unknown): number | null =>
  typeof v === 'string' || typeof v === 'number' || v instanceof Date
    ? finite(new Date(v as string | number | Date).getTime())
    : null

/** Days since the epoch of the calendar day `ms` falls in, in UTC or local time. */
const dayOf = (ms: number, utc: boolean): number => {
  const d = new Date(ms)
  return Math.floor((utc ? ms : Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / DAY)
}

/** The calendar day as a date at UTC midnight (format it with `timeZone: 'UTC'`). */
const dateOf = (day: number): Date => new Date(day * DAY)

/** Weekday of a day number, `0` Sunday … `6` Saturday (day 0 was a Thursday). */
const weekday = (day: number): number => (((day + 4) % 7) + 7) % 7

/** Series of the data, which may be one plain list of entries. */
const seriesOf = (data: CalendarOptions['data']): readonly CalendarSeries[] =>
  Array.isArray(data)
    ? [{ name: '', values: data as readonly CalendarEntry[] }]
    : (data as CalendarData).series

/** Series with their entries as `[day, value]`, every date valid. */
const cleanCalendar = (data: unknown): unknown => {
  const d = Array.isArray(data)
    ? { series: [{ name: '', values: data }] }
    : isRecord(data)
      ? data
      : {}
  return {
    ...d,
    series: records(d.series, (s) => ({
      ...named(s),
      values: records(s.values, (e) => ({ date: stamp(e.date), value: finite(e.value) })).filter(
        (e) => e.date !== null,
      ),
    })),
  }
}

/** A stretch of the range drawn as one grid of weeks: the whole range, or twelve months of it. */
interface Band {
  /** First and last day drawn. */
  start: number
  end: number
  /** The day in the top left corner: the start of `start`'s week. */
  gridStart: number
  columns: number
}

interface Range {
  /** First day drawn, and how many days from it. */
  from: number
  count: number
  bands: Band[]
  /** Columns of the widest band. */
  columns: number
  /** First day of the week, `0` Sunday … `6` Saturday. */
  weekStart: number
  /** Row of a day: its weekday counted from `weekStart`. */
  row(day: number): number
}

/**
 * The days drawn: `from` … `to`, else the data (every series, so hiding one
 * keeps the grid). More than a year (and than 53 weeks) is split into bands
 * of twelve months from the first month, so a fiscal year from April is one band.
 */
function rangeOf(options: CalendarOptions): Range {
  const utc = options.utc === true
  const weekStart = ((Math.floor(finite(options.weekStart) ?? MONDAY) % 7) + 7) % 7
  const row = (day: number) => (weekday(day) - weekStart + 7) % 7
  let first = Number.POSITIVE_INFINITY
  let last = Number.NEGATIVE_INFINITY
  for (const s of seriesOf(options.data))
    for (const e of s.values) {
      const ms = stamp(e.date)
      if (ms === null) continue
      const day = dayOf(ms, utc)
      if (day < first) first = day
      if (day > last) last = day
    }
  const toMs = stamp(options.to)
  const fromMs = stamp(options.from)
  const to = toMs !== null ? dayOf(toMs, utc) : last
  const weeks = finite(options.weeks)
  let from =
    fromMs !== null
      ? dayOf(fromMs, utc)
      : weeks !== null && weeks > 0 && Number.isFinite(to)
        ? to - row(to) - (Math.min(MAX_DAYS / 7, Math.floor(weeks)) - 1) * 7
        : first
  if (to - from >= MAX_DAYS) from = to - MAX_DAYS + 1
  const count = Number.isFinite(from) && Number.isFinite(to) && to >= from ? to - from + 1 : 0
  const bands: Band[] = []
  if (count) {
    const d = dateOf(from)
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth()
    /** The first day of the month `months` after the range's first month. */
    const monthStart = (months: number) => Math.floor(Date.UTC(y, m + months, 1) / DAY)
    // A year or less (up to the same date a year on) is one band, and so are
    // 53 weeks: the last year of a contribution graph.
    const single =
      to < Math.floor(Date.UTC(y + 1, m, d.getUTCDate()) / DAY) ||
      to + (6 - row(to)) - (from - row(from)) < 53 * 7
    for (let start = from, k = 1; start <= to; k++) {
      const end = single ? to : Math.min(to, monthStart(k * 12) - 1)
      const gridStart = start - row(start)
      bands.push({ start, end, gridStart, columns: (end + (6 - row(end)) - gridStart + 1) / 7 })
      start = end + 1
    }
  }
  return {
    from,
    count,
    bands,
    columns: bands.reduce((max, band) => Math.max(max, band.columns), 0),
    weekStart,
    row,
  }
}

/** Space between two bands, in pixels. */
const BAND_GAP = 10

function renderCalendar(options: CalendarOptions, ctx: RenderContext) {
  const { width, height, fontSize, locale } = ctx
  const { radius = 2, utc = false } = options
  const levels = Math.min(64, Math.max(1, Math.floor(finite(options.levels) ?? 4)))
  const series = seriesOf(options.data)
  const visible = series.filter((s) => !ctx.hidden.has(keyOf(s)))
  const value = formatNumber(options.format, locale)
  const dates = { timeZone: 'UTC' as const }
  const title = formatDate(
    options.dateFormat ?? { year: 'numeric', month: 'short', day: 'numeric', ...dates },
    locale,
  )
  const month = options.x?.format ?? formatDate({ month: 'short', ...dates }, locale)
  const dayName = options.y?.format ?? formatDate({ weekday: 'short', ...dates }, locale)
  const year = formatDate({ year: 'numeric', ...dates }, locale)
  const shortYear = formatDate({ year: '2-digit', ...dates }, locale)

  // Values by day, per series and in total (the shade), over the visible series.
  const totals = new Map<number, number | null>()
  const byDay = visible.map((s) => {
    const days = new Map<number, number | null>()
    for (const e of s.values) {
      const ms = stamp(e.date)
      if (ms === null) continue
      const day = dayOf(ms, utc)
      const v = finite(e.value)
      days.set(day, v === null ? (days.get(day) ?? null) : (days.get(day) ?? 0) + v)
      totals.set(day, v === null ? (totals.get(day) ?? null) : (totals.get(day) ?? 0) + v)
    }
    return days
  })

  const { from, count, bands, columns, weekStart, row } = rangeOf(options)

  // Shades: `levels` steps from empty (at or below `min`) to the full color (at `max`).
  let dataMin = 0
  let dataMax = 0
  for (const v of totals.values()) {
    if (v === null) continue
    if (v < dataMin) dataMin = v
    if (v > dataMax) dataMax = v
  }
  let lo = finite(options.min) ?? dataMin
  let hi = Math.max(finite(options.max) ?? dataMax, lo)
  // A color scale instead of one hue: `levels` steps through its colors.
  const diverging = options.colors === 'diverging'
  const stops = diverging
    ? DIVERGING
    : Array.isArray(options.colors) && options.colors.length >= 2
      ? (options.colors as readonly string[])
      : undefined
  const mid = finite(options.mid) ?? (diverging ? 0 : null)
  if (diverging && mid !== null) {
    // The ends are equally far from the middle, so both hues mean the same distance.
    const reach = Math.max(hi - mid, mid - lo)
    if (finite(options.min) === null) lo = mid - reach
    if (finite(options.max) === null) hi = mid + reach
  }
  /** Position of a value on the scale, 0…1 (through `mid` when it lies inside). */
  const position = (v: number) => {
    const t =
      stops && mid !== null && lo < mid && mid < hi
        ? v <= mid
          ? ((v - lo) / (mid - lo)) * 0.5
          : 0.5 + ((v - mid) / (hi - mid)) * 0.5
        : hi > lo
          ? (v - lo) / (hi - lo)
          : v > lo
            ? 1
            : 0
    return Math.min(1, Math.max(0, t))
  }
  const level = (v: number) =>
    stops
      ? Math.round(position(v) * levels)
      : v <= lo
        ? 0
        : Math.min(levels, Math.ceil(position(v) * levels) || levels)
  const shade = (step: number): StyleValue => {
    if (!stops) return `--tc-heat:${round((step / levels) * 100)}%`
    const at = (step / levels) * (stops.length - 1)
    const k = Math.min(stops.length - 2, Math.floor(at))
    const u = round((at - k) * 100)
    return {
      '--tc-cell-fill':
        u <= 0
          ? stops[k]
          : u >= 100
            ? stops[k + 1]
            : `color-mix(in oklab,${stops[k + 1]} ${u}%,${stops[k]})`,
    }
  }

  // Margins: weekday names on the left, months on top, the scale below.
  const pad = insets(options.padding, 0)
  const showX = options.x?.show !== false && count > 0
  const showY = options.y?.show !== false && count > 0
  const scale = options.scale !== false && count > 0
  const scaleText = typeof options.scale === 'object' ? options.scale : {}
  const low = scaleText.low ?? (stops ? value(lo) : 'Less')
  const high = scaleText.high ?? (stops ? value(hi) : 'More')
  // Day 3 (4 January 1970) was a Sunday: the row's weekday, on a date of that weekday.
  const rowLabels = Array.from({ length: 7 }, (_, r) => dayName(dateOf(3 + ((weekStart + r) % 7))))
  const left = showY
    ? axisSize(
        'left',
        rowLabels.map((label, r) => ({ value: r, position: 0, label })),
        fontSize,
      )
    : 0
  const top = showX ? axisSize('top', [{ value: 0, position: 0, label: 'M' }], fontSize) : 0
  // Bands are named by their years, in the corner over the weekday names.
  const multi = bands.length > 1
  const bandLabels = bands.map((band) => {
    const a = dateOf(band.start)
    const b = dateOf(band.end)
    return a.getUTCFullYear() === b.getUTCFullYear() ? year(a) : `${year(a)}–${shortYear(b)}`
  })
  const named = multi && showX
  const yearWidth = named
    ? Math.ceil(bandLabels.reduce((max, l) => Math.max(max, estimateTextWidth(l, fontSize)), 0)) + 8
    : 0
  const scaleHeight = scale ? Math.ceil(fontSize * LINE_HEIGHT) + 6 : 0
  const area = innerRect(width, height, {
    top: pad.top,
    right: pad.right,
    bottom: pad.bottom + scaleHeight,
    left: pad.left + Math.max(left, yearWidth),
  })
  // Square cells, as large as the columns and the seven rows of every band allow.
  const n = bands.length
  const room = area.height - n * top - (n - 1) * BAND_GAP
  const step = columns ? Math.max(0, Math.min(area.width / columns, room / (7 * n))) : 0
  // (On a phone the days are a few pixels: the gap is at most a quarter of one.)
  const gap = Math.max(0, Math.min(finite(options.gap) ?? 2, step / 4))
  const cell = Math.max(0, step - gap)
  /** Top of the cells of band `k`, below its month names. */
  const bandY = (k: number) => area.y + k * (top + step * 7 + BAND_GAP) + top
  const cellX = (c: number) => area.x + c * step + gap / 2
  const grid = {
    x: area.x,
    y: area.y,
    width: step * columns,
    height: n ? bandY(n - 1) + step * 7 - area.y : 0,
  }
  /** Band, column and row of a day of the range. */
  const place = (day: number) => {
    const k = Math.max(
      0,
      bands.findIndex((band) => day <= band.end),
    )
    const c = Math.floor((day - (bands[k] as Band).gridStart) / 7)
    return { x: cellX(c), y: bandY(k) + row(day) * step + gap / 2 }
  }

  const hitAt = (i: number, seriesIndex?: number): Hit | null => {
    if (i < 0 || i >= count) return null
    const day = from + i
    const at = place(day)
    const x = at.x + cell / 2
    const y = at.y + cell / 2
    const box = { x: at.x, y: at.y, width: cell, height: cell }
    const items: HitItem[] = visible.map((s, k) => {
      const v = byDay[k]?.get(day) ?? null
      return {
        name: s.name,
        seriesIndex: series.indexOf(s),
        value: v,
        text: v === null ? '–' : value(v),
        x,
        y,
        box,
        color: s.color,
      }
    })
    return {
      index: i,
      label: dateOf(day).toISOString().slice(0, 10),
      title: title(dateOf(day)),
      x,
      area: grid,
      items,
      seriesIndex,
      mark: { d: rectPath(box.x - 2, box.y - 2, cell + 4, cell + 4, radius + 2), x: 0, y: 0 },
    }
  }

  const interaction: Interaction = {
    count,
    // Arrow keys walk the grid: left and right by a week, up and down by a day.
    rows: 7,
    hitIndex: hitAt,
    hitTest(px, py) {
      if (!step || px < grid.x) return null
      const c = Math.floor((px - grid.x) / step)
      for (let k = 0; k < n; k++) {
        const band = bands[k] as Band
        const r = Math.floor((py - bandY(k)) / step)
        if (py < bandY(k) || r > 6 || c >= band.columns) continue
        const day = band.gridStart + c * 7 + r
        return day < band.start || day > band.end ? null : hitAt(day - from)
      }
      return null
    },
  }
  ctx.onHitTest(interaction)

  const cells: VNode[] = []
  for (let day = from; day < from + count; day++) {
    const v = totals.get(day) ?? null
    const at = place(day)
    cells.push(
      h('rect', {
        key: day,
        class: ['tc-cell', v === null && 'tc-cell-empty'],
        x: round(at.x),
        y: round(at.y),
        width: round(cell),
        height: round(cell),
        rx: round(Math.min(radius, cell / 2)),
        style: v === null ? undefined : shade(level(v)),
      }),
    )
  }

  // A month is named over the first column whose week starts in it (the
  // first column by the band's first day, which may be later in its week).
  const axes = bands.map((band, k) => {
    const months: Tick[] = []
    for (let c = 0; c < band.columns; c++) {
      const start = Math.max(band.start, band.gridStart + c * 7)
      const m = dateOf(start).getUTCMonth()
      if (c === 0 || m !== dateOf(Math.max(band.start, start - 7)).getUTCMonth()) {
        months.push({
          value: start,
          position: area.x + c * step + step / 2,
          label: month(dateOf(start)),
        })
      }
    }
    const weekdays: Tick[] = rowLabels.map((label, r) => ({
      value: r,
      position: bandY(k) + r * step + step / 2,
      label,
    }))
    const rect = { x: area.x, y: bandY(k), width: step * band.columns, height: step * 7 }
    return h(
      'g',
      { key: `band-${band.start}`, class: 'tc-calendar-band' },
      showX && axis({ position: 'top', ticks: thinTicks(months, 'top', fontSize), area: rect }),
      showY && axis({ position: 'left', ticks: thinTicks(weekdays, 'left', fontSize), area: rect }),
      named &&
        h(
          'text',
          {
            class: 'tc-tick-label tc-calendar-year',
            x: round(area.x - 8),
            y: round(bandY(k) - 8),
            'text-anchor': 'end',
            'aria-hidden': 'true',
          },
          bandLabels[k],
        ),
    )
  })

  // The scale, right-aligned below the grid: "Less", one swatch per shade, "More".
  const swatch = Math.min(cell, fontSize)
  const scaleY = grid.y + grid.height + 6 + swatch / 2
  const lowWidth = estimateTextWidth(low, fontSize)
  const highWidth = estimateTextWidth(high, fontSize)
  const swatches = levels + 1
  const scaleWidth = lowWidth + 6 + swatches * (swatch + gap) + 6 + highWidth
  const scaleX = Math.max(area.x, area.x + grid.width - scaleWidth)

  return [
    h('g', { key: 'cells', class: 'tc-calendar-cells' }, cells),
    axes,
    scale &&
      h(
        'g',
        { key: 'scale', class: 'tc-calendar-scale', 'aria-hidden': 'true' },
        h(
          'text',
          { class: 'tc-tick-label', x: round(scaleX), y: round(scaleY), dy: '0.32em' },
          low,
        ),
        Array.from({ length: swatches }, (_, k) =>
          h('rect', {
            key: k,
            class: 'tc-cell',
            x: round(scaleX + lowWidth + 6 + k * (swatch + gap)),
            y: round(scaleY - swatch / 2),
            width: round(swatch),
            height: round(swatch),
            rx: round(Math.min(radius, swatch / 2)),
            style: shade(k),
          }),
        ),
        h(
          'text',
          {
            class: 'tc-tick-label',
            x: round(scaleX + lowWidth + 6 + swatches * (swatch + gap) + 6),
            y: round(scaleY),
            dy: '0.32em',
          },
          high,
        ),
      ),
  ]
}

/**
 * Size of the grid with its names and scale at the size of a contribution
 * graph (13 pixel days, 12 pixel text): `fixed` is the part of the height
 * that stays as the days shrink (the month names, the scale).
 */
function naturalSize(options: CalendarOptions) {
  const { bands, columns } = rangeOf(options)
  const n = bands.length
  if (!n) return undefined
  const top = options.x?.show === false ? 0 : 23
  const left = options.y?.show === false ? 0 : 36
  const fixed = n * top + (n - 1) * BAND_GAP + (options.scale === false ? 0 : 21)
  return {
    left,
    fixed,
    rows: 7 * n,
    columns,
    width: left + columns * 13,
    height: fixed + n * 7 * 13,
  }
}

/**
 * Width to height of the chart, so a year is a low strip of small squares
 * instead of filling a chart half as tall as wide.
 */
function ratioOf(options: CalendarOptions): number | undefined {
  const size = naturalSize(options)
  // (A few weeks alone would be taller than wide: not below the usual 2.)
  return size && Math.max(2, round(size.width / size.height))
}

/**
 * Height for a width narrower than the contribution graph (a phone): the
 * names and the scale keep their size there, so the ratio alone would leave
 * the days no room. Your own `aspectRatio` is kept.
 */
function heightOf(
  options: CalendarOptions & { aspectRatio?: number; autoRatio?: number },
  width: number,
): number | undefined {
  const size = naturalSize(options)
  if (!size || options.aspectRatio !== options.autoRatio || width >= size.width) return undefined
  const days = (Math.max(0, width - size.left) / size.columns) * size.rows
  // (Not taller than the usual half of the width, which a few weeks alone get.)
  return Math.min(width / 2, size.fixed + days)
}

/** Legend: the series (kinds of activity), when the data has them. */
const calendarLegend = (options: CalendarOptions): LegendItem[] =>
  Array.isArray(options.data) ? [] : legendItems(seriesOf(options.data))

/** Table: one row per day of the range, one column per visible series. */
function calendarTable(options: CalendarOptions, ctx: RenderContext, limit: number): DataTable {
  const series = seriesOf(options.data).filter((s) => !ctx.hidden.has(keyOf(s)))
  const utc = options.utc === true
  const value = formatNumber(options.format, ctx.locale)
  const title = formatDate(
    options.dateFormat ?? { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' },
    ctx.locale,
  )
  // Every day with an entry, in order (the grid's blank days say nothing).
  const days = new Map<number, (number | null)[]>()
  series.forEach((s, k) => {
    for (const e of s.values) {
      const ms = stamp(e.date)
      if (ms === null) continue
      const day = dayOf(ms, utc)
      const rowValues = days.get(day) ?? series.map(() => null)
      const v = finite(e.value)
      if (v !== null) rowValues[k] = (rowValues[k] ?? 0) + v
      days.set(day, rowValues)
    }
  })
  const sorted = [...days.keys()].sort((a, b) => a - b)
  return {
    columns: ['', ...series.map((s) => s.name)],
    total: sorted.length,
    rows: sorted
      .slice(0, limit)
      .map((day) => [
        title(dateOf(day)),
        ...(days.get(day) ?? []).map((v) => (v === null ? '–' : value(v))),
      ]),
  }
}

/**
 * Calendar: a contribution-style heatmap of days, one column per week and
 * one row per weekday, shaded in `levels` steps of one hue by the day's
 * value (`--tc-heat-color`), with month and weekday names and a low-to-high
 * scale; `colors` shades through a scale of colors instead, `'diverging'`
 * for values with a sign. Several series add up per day and the legend filters them.
 *
 * ```ts
 * new Chart('#el', {
 *   type: calendar,
 *   data: [{ date: '2026-10-26', value: 3 }, { date: '2026-10-27', value: 0 }],
 *   weeks: 12,
 * })
 * ```
 */
export const calendar: ChartType<CalendarOptions> = {
  name: 'calendar',
  // (The options come with the whole config: its proportions are defaulted here.)
  clean: (options) => {
    const config = cleanData(cleanCalendar)(options) as CalendarOptions & {
      aspectRatio?: number
      autoRatio?: number
    }
    // The ratio set here follows the range; one of your own is kept.
    if (config.aspectRatio !== undefined && config.aspectRatio !== config.autoRatio) return config
    const autoRatio = ratioOf(config)
    return { ...config, aspectRatio: autoRatio, autoRatio }
  },
  render: renderCalendar,
  height: heightOf,
  legend: calendarLegend,
  table: calendarTable,
  valueLabels: { marks: 'cell', format: (options) => options.format },
}
