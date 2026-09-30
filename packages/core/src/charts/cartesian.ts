import type { DataTable, LegendItem, RenderContext } from '../chart.ts'
import { axis, axisSize, bandTicks, linearTicks, type Tick, thinTicks } from '../components/axis.ts'
import { grid } from '../components/grid.ts'
import { feature } from '../features.ts'
import { formatDate, formatNumber, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import {
  estimateTextWidth,
  type InsetsInput,
  innerRect,
  insets,
  LINE_HEIGHT,
  type Rect,
} from '../layout.ts'
import { type BandKey, type BandScale, band, point } from '../scales/band.ts'
import { extent } from '../scales/extent.ts'
import { type LinearScale, linear } from '../scales/linear.ts'
import { niceDomain } from '../scales/ticks.ts'
import { type ClassValue, h, type VNode } from '../vnode.ts'

/** Category label on the x axis. */
export type Label = string | number | Date

/** A label as a `key` for keyed rendering (dates by their timestamp). */
export const labelKey = (label: Label): string | number =>
  label instanceof Date ? label.getTime() : label

/** One data series. `null` values are gaps. */
export interface Series {
  /** Display name (legend, tooltip, accessibility). */
  name: string
  /** One value per label; `null`/`undefined` leaves a gap. */
  values: readonly (number | null | undefined)[]
  /** Stable identity for keyed updates. Defaults to `name`. */
  id?: string
  /** Custom color; overrides the palette slot via `--tc-series-color`. */
  color?: string
  /**
   * Dashed line: dash and gap length in pixels, or a full `stroke-dasharray`
   * such as `'6 3'`. Sets `--tc-series-dash` on the series group.
   */
  dash?: number | string
  /** Line width in pixels; overrides `--tc-stroke-width` via `--tc-series-width`. */
  width?: number
  /**
   * In a `bar` chart, draw this series as a line or a filled area over the
   * bars instead (it is left out of stacks). Needs the line module
   * (`@tabler/charts/line`, or `@tabler/charts`). Defaults to `'bar'`.
   */
  type?: 'bar' | 'line' | 'area'
  /** Extra classes on the series group. */
  class?: ClassValue
  /** Start hidden (toggle it back from the legend). */
  hidden?: boolean
}

export interface CartesianData {
  /** Categories along x. Defaults to `1…n` for the longest series. */
  labels?: readonly Label[]
  series: readonly Series[]
}

/** Options for the value (y) axis. */
export interface ValueAxisOptions {
  /** Render the axis labels. Defaults to `true`. */
  show?: boolean
  /** Render horizontal grid lines. Defaults to `true`. */
  grid?: boolean
  /** Fixed lower bound; overrides data and `zero`. */
  min?: number
  /** Fixed upper bound. */
  max?: number
  /** Include zero in the domain. */
  zero?: boolean
  /** Extend the domain to round tick values. Defaults to `true`. */
  nice?: boolean
  /** Approximate tick count. Defaults to one per ~60px of height. */
  ticks?: number
  format?: NumberFormat
  /** `'log'` for a logarithmic axis (positive values only). Defaults to `'linear'`. */
  scale?: 'linear' | 'log'
}

/** Options for the category (x) axis. */
export interface CategoryAxisOptions {
  /** Render the axis labels. Defaults to `true`. */
  show?: boolean
  /** Render vertical grid lines. Defaults to `false`. */
  grid?: boolean
  /** Draw the axis line along the bottom edge. Defaults to `false`. */
  line?: boolean
  /** Format a label for display (axis ticks for categories, tooltips and the table). */
  format?: (label: Label, index: number) => string
  /**
   * `'time'` treats labels as dates or timestamps: line and area charts place
   * points at their real distance in time, with calendar-aware ticks.
   * Labels must be in ascending order. Defaults to `'category'`.
   */
  type?: 'category' | 'time'
  /** Align time ticks to UTC instead of local time (use it for SSR). */
  utc?: boolean
}

export interface CartesianOptions {
  data: CartesianData
  y?: ValueAxisOptions
  x?: CategoryAxisOptions
  /** Extra space around the plot area, in pixels. */
  padding?: InsetsInput
}

export interface CartesianLayoutOptions {
  /** `point` places categories on points (lines), `band` on bands (bars). */
  scale: 'point' | 'band'
  /** Values spanning the y domain, when they differ from the raw data (stacks). */
  values?: readonly (number | null | undefined)[]
  /** Format of the value axis ticks, when it differs from `y.format` (percent stacks). */
  tickFormat?: NumberFormat
  /** Default for `y.zero`. */
  zero: boolean
  /** Space marks need beyond the plot edge (point radius, stroke). */
  overhang?: number
  /** Band padding for `scale: 'band'`. */
  paddingInner?: number
  paddingOuter?: number
}

export interface CartesianLayout {
  area: Rect
  labels: readonly Label[]
  /** Category scale (along x, or along y when `horizontal`). */
  x: BandScale
  /** Value scale (along y, or along x when `horizontal`). */
  y: LinearScale
  /** Whether categories run along y. */
  horizontal: boolean
  xTicks: Tick[]
  yTicks: Tick[]
  /** Grid lines, drawn below the marks. */
  background: VNode[]
  /** Axes, drawn above the marks. */
  foreground: VNode[]
  /** Clip path definition and its url, for the marks group. */
  clip: { def: VNode; url: string }
}

export const TICK_SPACING = 60
/** Horizontal value axes need more room per label. */
export const TICK_SPACING_X = 80
/** Minimal margin around the plot, in pixels. */
export const EDGE = 8

/** Stable key of a series: its `id`, or its name. */
export const seriesKey = (series: Series): string => series.id ?? series.name

/** Legend entries for series-based charts. */
export function seriesLegend(data: CartesianData): LegendItem[] {
  return data.series.map((series, index) => {
    const item: LegendItem = { key: seriesKey(series), name: series.name, index }
    if (series.color) item.color = series.color
    if (series.hidden) item.hidden = true
    return item
  })
}

/** Categories from `data.labels`, or `1…n` for the longest series. */
export function resolveLabels(data: CartesianData): Label[] {
  if (data.labels) return data.labels.slice()
  const n = Math.max(0, ...data.series.map((s) => s.values.length))
  return Array.from({ length: n }, (_, i) => i + 1)
}

/**
 * Whether a value can be plotted on the axis: finite, and positive on a log
 * scale (zero and negatives become gaps there).
 */
export function plottable(
  value: number | null | undefined,
  axis: ValueAxisOptions | undefined,
): value is number {
  if (value == null || !Number.isFinite(value)) return false
  return axis?.scale !== 'log' || value > 0
}

/**
 * Whether the category axis carries time: `x.type === 'time'` and every label
 * is a date, a timestamp or a parseable string. Otherwise the axis falls back
 * to categories instead of producing NaN positions.
 */
export const isTimeAxis = (options: CartesianOptions): boolean =>
  options.x?.type === 'time' && resolveLabels(options.data).every((l) => Number.isFinite(toMs(l)))

/** Formatter for category labels in tooltips and tables. */
export function labelFormatter(
  options: CartesianOptions,
  ctx: RenderContext,
): (label: Label, index: number) => string {
  if (options.x?.format) return options.x.format
  if (!isTimeAxis(options)) return (label) => String(label)
  const labels = resolveLabels(options.data)
  const first = labels[0]
  const last = labels[labels.length - 1]
  const span = first !== undefined && last !== undefined ? Math.abs(toMs(last) - toMs(first)) : 0
  // Show the time of day when the whole series spans less than a few days.
  const withTime = span > 0 && span < 3 * 24 * 60 * 60 * 1000
  const fmt = formatDate(
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
      ...(options.x?.utc ? { timeZone: 'UTC' } : {}),
    },
    ctx.locale,
  )
  return (label) => (Number.isFinite(toMs(label)) ? fmt(toMs(label)) : String(label))
}

/** A label as a timestamp: dates, numbers, or parseable strings (ISO); `NaN` otherwise. */
export const toMs = (label: Label): number =>
  label instanceof Date ? label.getTime() : typeof label === 'number' ? label : Date.parse(label)

/** Value scale for a domain: linear, or logarithmic with positive-only ticks. */
export function valueScale(
  domain: [number, number],
  range: [number, number],
  options: ValueAxisOptions,
): LinearScale {
  return options.scale === 'log' ? feature('log')(domain, range) : linear(domain, range)
}

/** Ticks of a value scale with labels; log scales format each power as is. */
export function valueTicks(
  scale: LinearScale,
  options: ValueAxisOptions,
  count: number,
  format: NumberFormat | undefined,
  locale: RenderContext['locale'],
): Tick[] {
  if (options.scale !== 'log') return linearTicks(scale, { count, format, locale })
  const fmt = formatNumber(format, locale)
  return scale.ticks(count).map((value) => ({ value, position: scale(value), label: fmt(value) }))
}

/** Y domain from the data and axis options. */
export function valueDomain(
  data: CartesianData,
  options: ValueAxisOptions,
  zeroDefault: boolean,
  count: number,
  hidden: ReadonlySet<string> = new Set(),
  override?: readonly (number | null | undefined)[],
): [number, number] {
  const values =
    override ?? data.series.filter((s) => !hidden.has(seriesKey(s))).flatMap((s) => s.values)
  return domainOf(values, options, zeroDefault, count)
}

/** A niced numeric domain for `values`, honouring zero, min, max and nice. */
export function domainOf(
  values: readonly (number | null | undefined)[],
  options: ValueAxisOptions,
  zeroDefault: boolean,
  count: number,
): [number, number] {
  if (options.scale === 'log') {
    // Only positive values can be shown; nice to whole powers of ten.
    const positive = values.filter((v): v is number => v != null && v > 0 && Number.isFinite(v))
    let [lo, hi] = extent(positive) ?? [1, 10]
    if (options.min !== undefined && options.min > 0) lo = options.min
    if (options.max !== undefined && options.max > 0) hi = options.max
    if (lo === hi) hi = lo * 10
    if (options.nice !== false) {
      const niced = feature('log')([lo, hi], [0, 1]).nice().domain
      if (options.min === undefined) lo = niced[0]
      if (options.max === undefined) hi = niced[1]
    }
    return [lo, hi]
  }
  let [lo, hi] = extent(values) ?? [0, 1]
  if (options.zero ?? zeroDefault) {
    lo = Math.min(lo, 0)
    hi = Math.max(hi, 0)
  }
  if (lo === hi) {
    // A flat series still needs a visible range.
    if (lo === 0) {
      hi = 1
    } else {
      const pad = Math.abs(lo) * 0.1
      lo -= pad
      hi += pad
    }
  }
  if (options.min !== undefined) lo = options.min
  if (options.max !== undefined) hi = options.max
  if (options.nice !== false) {
    const [nlo, nhi] = niceDomain(lo, hi, count)
    if (options.min === undefined) lo = nlo
    if (options.max === undefined) hi = nhi
  }
  return [lo, hi]
}

/** Compute scales, ticks, grid and axes shared by line, area and bar charts. */
export function cartesianLayout(
  options: CartesianOptions,
  ctx: RenderContext,
  layout: CartesianLayoutOptions,
): CartesianLayout {
  const { data } = options
  const yOptions = options.y ?? {}
  const xOptions = options.x ?? {}
  const { fontSize, locale, width, height } = ctx
  const overhang = layout.overhang ?? 0
  const pad = insets(options.padding)
  const labels = resolveLabels(data)
  const format = labelFormatter(options, ctx)
  const showY = yOptions.show !== false
  const showX = xOptions.show !== false && labels.length > 0
  const timed = isTimeAxis(options) && layout.scale === 'point'

  const count = yOptions.ticks ?? Math.max(2, Math.round(height / TICK_SPACING))
  const domain = valueDomain(data, yOptions, layout.zero, count, ctx.hidden, layout.values)
  const tickFormat = layout.tickFormat ?? yOptions.format
  const probeY = valueTicks(
    valueScale(domain, [1, 0], yOptions),
    yOptions,
    count,
    tickFormat,
    locale,
  )
  const countX = Math.max(2, Math.round(width / TICK_SPACING_X))
  // Time ticks come from the scale; their labels are what sits at the edges.
  const keys = labels.map(labelKey)
  const timePoints = timed
    ? (range: [number, number]) =>
        feature('time').points(labels.map(toMs), keys, range, xOptions.utc === true)
    : undefined
  const probeTime = timePoints ? timePoints([0, 1]).time : undefined
  const timeFormat = probeTime
    ? xOptions.format
      ? (d: Date) => (xOptions.format as (l: Label, i: number) => string)(d, -1)
      : probeTime.tickFormat(countX, locale)
    : undefined
  const edgeLabels = probeTime
    ? probeTime.ticks(countX).map((d) => (timeFormat as (d: Date) => string)(d))
    : [format(labels[0] as Label, 0), format(labels[labels.length - 1] as Label, labels.length - 1)]

  // Margins: labels outside the plot, half a line above the top tick,
  // half of the first/last x label for point scales.
  const halfLine = Math.ceil((fontSize * LINE_HEIGHT) / 2)
  const firstLabel = showX ? estimateTextWidth(edgeLabels[0] ?? '', fontSize) : 0
  const lastLabel = showX ? estimateTextWidth(edgeLabels[edgeLabels.length - 1] ?? '', fontSize) : 0
  const edgeX = layout.scale === 'point'
  const margins = {
    top: pad.top + Math.max(showY ? halfLine : 0, overhang, EDGE / 2),
    right: pad.right + Math.max(edgeX ? Math.ceil(lastLabel / 2) : 0, overhang, EDGE),
    bottom:
      pad.bottom +
      Math.max(showX ? axisSize('bottom', [probeY[0] as Tick], fontSize) : 0, overhang, EDGE / 2),
    left:
      pad.left +
      Math.max(
        showY ? axisSize('left', probeY, fontSize) : 0,
        edgeX ? Math.ceil(firstLabel / 2) : 0,
        overhang,
        showY ? 0 : EDGE,
      ),
  }
  const area = innerRect(width, height, margins)

  const xRange: [number, number] = [area.x, area.x + area.width]
  const timeScale = timePoints ? timePoints(xRange) : undefined
  const x = timeScale
    ? timeScale.scale
    : layout.scale === 'point'
      ? point(keys, xRange)
      : band(keys, xRange, {
          paddingInner: layout.paddingInner ?? 0.3,
          paddingOuter: layout.paddingOuter ?? 0.15,
        })
  const y = valueScale(domain, [area.y + area.height, area.y], yOptions)

  const yTicks = valueTicks(y, yOptions, count, tickFormat, locale)
  const rawXTicks: Tick[] = timeScale
    ? timeScale.time.ticks(countX).map((d) => ({
        value: d.getTime(),
        position: timeScale.time(d),
        label: (timeFormat as (d: Date) => string)(d),
      }))
    : bandTicks(x, (_: BandKey, i) => format(labels[i] as Label, i))
  const xTicks = showX ? thinTicks(rawXTicks, 'bottom', fontSize) : []

  const background: VNode[] = []
  if (yOptions.grid !== false) background.push(grid({ direction: 'y', ticks: yTicks, area }))
  if (xOptions.grid) background.push(grid({ direction: 'x', ticks: xTicks, area }))

  const foreground: VNode[] = []
  if (showY) foreground.push(axis({ position: 'left', ticks: yTicks, area }))
  if (showX || xOptions.line) {
    foreground.push(axis({ position: 'bottom', ticks: xTicks, area, line: xOptions.line === true }))
  }

  return {
    area,
    labels,
    x,
    y,
    horizontal: false,
    xTicks,
    yTicks,
    background,
    foreground,
    clip: plotClip(ctx, area, overhang),
  }
}

/** Clip path around the plot area, a little larger so strokes and dots are not cut. */
export function plotClip(
  ctx: RenderContext,
  area: Rect,
  overhang: number,
): CartesianLayout['clip'] {
  const clipId = `${ctx.id}-clip`
  const bleed = overhang + 1
  return {
    def: h(
      'clipPath',
      { id: clipId },
      h('rect', {
        x: area.x - bleed,
        y: area.y - bleed,
        width: area.width + bleed * 2,
        height: area.height + bleed * 2,
      }),
    ),
    url: `url(#${clipId})`,
  }
}

/** Attributes shared by every series group. */
export function seriesAttrs(series: Series, index: number): Record<string, string | ClassValue> {
  const vars: string[] = []
  if (series.color) vars.push(`--tc-series-color:${series.color}`)
  if (series.dash !== undefined) {
    vars.push(
      `--tc-series-dash:${typeof series.dash === 'number' ? `${series.dash}px` : series.dash}`,
    )
  }
  if (series.width !== undefined) vars.push(`--tc-series-width:${series.width}px`)
  return {
    key: seriesKey(series),
    class: ['tc-series', `tc-series-${index + 1}`, series.class],
    'data-series': series.name,
    ...(vars.length ? { style: vars.join(';') } : {}),
  }
}

/** Pixels around the plot area that still count as hovering it. */
const HOVER_SLOP = 8

/**
 * Interaction by category: the nearest category to the pointer while it is
 * over the plot area, with every visible series' value there. `anchor`
 * places each value (line point, bar end); `markAt` names the series of the
 * mark directly under the pointer, if the chart has distinct marks (bars).
 * Labels and values are formatted with `x.format` / `y.format` and the locale.
 */
export function categoryInteraction(
  layout: CartesianLayout,
  options: CartesianOptions,
  ctx: RenderContext,
  anchor: (seriesIndex: number, index: number, value: number) => { x: number; y: number },
  markAt?: (x: number, y: number, index: number) => number | undefined,
): Interaction {
  const { area, x, labels, horizontal } = layout
  const { data } = options
  const formatLabel = labelFormatter(options, ctx)
  const formatValue = formatNumber(options.y?.format, ctx.locale)

  const hitAt = (index: number): Hit => {
    const start = x.at(index)
    const center = start + x.bandwidth / 2
    const label = labels[index] as Label
    // Where a missing value is anchored: the category center on its axis.
    const empty = horizontal ? { x: area.x, y: center } : { x: center, y: null }
    const items: HitItem[] = []
    data.series.forEach((series, seriesIndex) => {
      if (ctx.hidden.has(seriesKey(series))) return
      const raw = series.values[index]
      const value = plottable(raw, options.y) ? raw : null
      const point = value === null ? empty : anchor(seriesIndex, index, value)
      const item: HitItem = {
        name: series.name,
        seriesIndex,
        value,
        text: value === null ? '–' : formatValue(value),
        x: point.x,
        y: point.y,
      }
      if (series.color) item.color = series.color
      items.push(item)
    })
    const title = formatLabel(label, index)
    if (horizontal) {
      const hit: Hit = {
        index,
        label: labelKey(label),
        title,
        x: area.x + area.width / 2,
        y: center,
        axis: 'y',
        area,
        items,
      }
      hit.band = { x: area.x, y: start, width: area.width, height: x.bandwidth }
      return hit
    }
    const hit: Hit = { index, label: labelKey(label), title, x: center, area, items }
    if (x.bandwidth > 0) hit.band = { x: start, y: area.y, width: x.bandwidth, height: area.height }
    return hit
  }

  return {
    count: labels.length,
    hitTest(px, py) {
      if (labels.length === 0) return null
      if (
        px < area.x - HOVER_SLOP ||
        px > area.x + area.width + HOVER_SLOP ||
        py < area.y - HOVER_SLOP ||
        py > area.y + area.height + HOVER_SLOP
      ) {
        return null
      }
      const index = x.indexAt(horizontal ? py : px)
      const hit = hitAt(index)
      const mark = markAt?.(px, py, index)
      if (mark !== undefined) hit.seriesIndex = mark
      return hit
    },
    hitIndex(index, seriesIndex) {
      if (index < 0 || index >= labels.length) return null
      const hit = hitAt(index)
      if (seriesIndex !== undefined && hit.items.some((item) => item.seriesIndex === seriesIndex)) {
        hit.seriesIndex = seriesIndex
      }
      return hit
    },
  }
}

/** Accessible table of series values: one row per category, one column per visible series. */
export function seriesTable(
  options: CartesianOptions,
  ctx: RenderContext,
  limit: number = Number.POSITIVE_INFINITY,
): DataTable {
  const all = resolveLabels(options.data)
  const labels = all.length > limit ? all.slice(0, limit) : all
  const formatLabel = labelFormatter(options, ctx)
  const formatValue = formatNumber(options.y?.format, ctx.locale)
  const series = options.data.series.filter((s) => !ctx.hidden.has(seriesKey(s)))
  return {
    columns: ['', ...series.map((s) => s.name)],
    total: all.length,
    rows: labels.map((label, i) => [
      formatLabel(label, i),
      ...series.map((s) => {
        const v = s.values[i]
        return v == null || !Number.isFinite(v) ? '–' : formatValue(v)
      }),
    ]),
  }
}
