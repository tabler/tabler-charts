import type { DataTable, LegendItem, RenderContext } from '../chart.ts'
import { axis, axisSize, bandTicks, linearTicks, type Tick, thinTicks } from '../components/axis.ts'
import { grid } from '../components/grid.ts'
import { type Features, feature } from '../features.ts'
import { formatDetail, type NumberFormat } from '../format.ts'
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
import { type ClassValue, h, type Props, type VNode } from '../vnode.ts'
import type { Annotation } from './annotations.ts'

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
  /**
   * Custom color; overrides the palette slot via `--tc-series-color`.
   * Values that could inject CSS (`;`, quotes, `url()` …) are ignored, so colors from user data are safe.
   */
  color?: string
  /**
   * Dashed line: dash and gap length in pixels, or a full `stroke-dasharray`
   * such as `'6 3'`. Sets `--tc-series-dash` on the series group; values
   * that could inject CSS are ignored, as for `color`.
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
   * Labels must be in ascending order. Needs `@tabler/charts/time` (included
   * in `@tabler/charts`; candlesticks label dates without it). Defaults to `'category'`.
   */
  type?: 'category' | 'time'
  /** Align time ticks to UTC instead of local time (use it for SSR). */
  utc?: boolean
}

export interface CartesianOptions {
  data: CartesianData
  y?: ValueAxisOptions
  x?: CategoryAxisOptions
  /** Reference lines and bands: targets, normal ranges, events and periods. */
  annotations?: readonly Annotation[]
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
  return feature('dates')(resolveLabels(options.data), options.x?.utc, ctx.locale)
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
  return options.scale === 'log' ? feature('log').scale(domain, range) : linear(domain, range)
}

/** Ticks of a value scale with labels; log scales format each power as is. */
export function valueTicks(
  scale: LinearScale,
  options: ValueAxisOptions,
  count: number,
  format: NumberFormat | undefined,
  locale: RenderContext['locale'],
): Tick[] {
  return options.scale === 'log'
    ? feature('log').ticks(scale, count, format, locale)
    : linearTicks(scale, { count, format, locale })
}

/** Y domain from the data and axis options. */
export function valueDomain(
  data: CartesianData,
  options: ValueAxisOptions,
  zeroDefault: boolean,
  count: number,
  hidden: ReadonlySet<string> = new Set(),
  override?: readonly (number | null | undefined)[],
  extra: readonly number[] = [],
): [number, number] {
  // (extra: values to include besides the data, e.g. annotation targets)
  const values =
    override ?? data.series.filter((s) => !hidden.has(seriesKey(s))).flatMap((s) => s.values)
  return domainOf(extra.length ? [...values, ...extra] : values, options, zeroDefault, count)
}

/** A niced numeric domain for `values`, honouring zero, min, max and nice. */
export function domainOf(
  values: readonly (number | null | undefined)[],
  options: ValueAxisOptions,
  zeroDefault: boolean,
  count: number,
): [number, number] {
  if (options.scale === 'log') return feature('log').domain(values, options)
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

/** The annotations feature, when the chart has annotations (it then must be registered). */
export function notesFeature(
  options: CartesianOptions,
): NonNullable<Features['annotations']> | undefined {
  return options.annotations?.length ? feature('annotations') : undefined
}

/**
 * The category axis of a cartesian layout: the labels at its edges (for the
 * margins), its scale over a pixel range, and its ticks on that scale.
 */
export interface CategoryAxis {
  edges: readonly string[]
  scale(range: [number, number]): BandScale
  ticks(scale: BandScale): Tick[]
  /** Pixel position of a date, on time axes (after `scale()`). */
  readonly time?: ((date: Date) => number) | undefined
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
  const domain = valueDomain(
    data,
    yOptions,
    layout.zero,
    count,
    ctx.hidden,
    layout.values,
    notesFeature(options)?.values(options.annotations),
  )
  const tickFormat = layout.tickFormat ?? yOptions.format
  const probeY = valueTicks(
    valueScale(domain, [1, 0], yOptions),
    yOptions,
    count,
    tickFormat,
    locale,
  )
  const countX = Math.max(2, Math.round(width / TICK_SPACING_X))
  const keys = labels.map(labelKey)
  // Time axes (from the time module) place points by date, with calendar ticks.
  const xAxis: CategoryAxis = timed
    ? feature('time').axis(labels, keys, xOptions, countX, locale)
    : {
        edges: [
          format(labels[0] as Label, 0),
          format(labels[labels.length - 1] as Label, labels.length - 1),
        ],
        scale: (range) =>
          layout.scale === 'point'
            ? point(keys, range)
            : band(keys, range, {
                paddingInner: layout.paddingInner ?? 0.3,
                paddingOuter: layout.paddingOuter ?? 0.15,
              }),
        ticks: (scale) => bandTicks(scale, (_: BandKey, i) => format(labels[i] as Label, i)),
      }
  const edgeLabels = xAxis.edges

  // Margins: labels outside the plot, half a line above the top tick,
  // half of the first/last x label for point scales.
  const halfLine = Math.ceil((fontSize * LINE_HEIGHT) / 2)
  const firstLabel = showX ? estimateTextWidth(edgeLabels[0] ?? '', fontSize) : 0
  const lastLabel = showX ? estimateTextWidth(edgeLabels[edgeLabels.length - 1] ?? '', fontSize) : 0
  const edgeX = layout.scale === 'point'
  // On bands a label is centered half a step from the edge: only what is wider
  // than that needs margin (long labels on narrow bands, e.g. dates on candles).
  // The step depends on the margins, so they are worked out twice.
  const valueAxis = showY ? axisSize('left', probeY, fontSize) : 0
  const side = (halfStep: number) => {
    const overflow = (label: number) =>
      edgeX ? Math.ceil(label / 2) : Math.max(0, Math.ceil(label / 2 - halfStep))
    return {
      right: pad.right + Math.max(overflow(lastLabel), overhang, EDGE),
      left: pad.left + Math.max(valueAxis, overflow(firstLabel), overhang, showY ? 0 : EDGE),
    }
  }
  const steps = Math.max(1, labels.length) * 2
  let sides = side((width - pad.left - pad.right - valueAxis) / steps)
  if (!edgeX) sides = side((width - sides.left - sides.right) / steps)
  const margins = {
    top: pad.top + Math.max(showY ? halfLine : 0, overhang, EDGE / 2),
    bottom:
      pad.bottom +
      Math.max(
        // Without an x axis, the lowest value label still needs half a line.
        showX ? axisSize('bottom', [probeY[0] as Tick], fontSize) : showY ? halfLine : 0,
        overhang,
        EDGE / 2,
      ),
    ...sides,
  }
  const area = innerRect(width, height, margins)

  const x = xAxis.scale([area.x, area.x + area.width])
  const y = valueScale(domain, [area.y + area.height, area.y], yOptions)

  // Nice ticks can outnumber the count asked for: on a short plot, thin them
  // like category labels so none overlap (the grid follows the ticks kept).
  const yTicks = thinTicks(valueTicks(y, yOptions, count, tickFormat, locale), 'left', fontSize, 4)
  const xTicks = showX ? thinTicks(xAxis.ticks(x), 'bottom', fontSize) : []

  const background: VNode[] = []
  if (yOptions.grid !== false) background.push(grid({ direction: 'y', ticks: yTicks, area }))
  if (xOptions.grid) background.push(grid({ direction: 'x', ticks: xTicks, area }))

  // Annotations: bands under the series, lines above them (and below the axes).
  const notes = notesFeature(options)?.layers(options.annotations, {
    area,
    horizontal: false,
    fontSize,
    value: y,
    band: x,
    keys,
    time: xAxis.time,
  })
  if (notes?.under) background.push(notes.under)

  const foreground: VNode[] = []
  if (notes?.over) foreground.push(notes.over)
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
export function seriesAttrs(series: Series, index: number): Props {
  const { dash, width } = series
  return {
    key: seriesKey(series),
    class: ['tc-series', `tc-series-${index + 1}`, series.class],
    'data-series': series.name,
    // A map, so values from data cannot inject CSS (see normalizeStyle).
    style: {
      '--tc-series-color': series.color,
      '--tc-series-dash': typeof dash === 'number' ? `${dash}px` : dash,
      '--tc-series-width': Number.isFinite(width) ? `${width}px` : undefined,
    },
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
  const formatValue = formatDetail(options.y?.format, ctx.locale)

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
    // Horizontal bars run the categories along y: the hit sits at the plot center on x.
    const hit: Hit = {
      index,
      label: labelKey(label),
      title: formatLabel(label, index),
      x: horizontal ? area.x + area.width / 2 : center,
      area,
      items,
    }
    if (horizontal) {
      hit.y = center
      hit.axis = 'y'
    }
    if (x.bandwidth > 0) {
      hit.band = horizontal
        ? { x: area.x, y: start, width: area.width, height: x.bandwidth }
        : { x: start, y: area.y, width: x.bandwidth, height: area.height }
    }
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
  const formatValue = formatDetail(options.y?.format, ctx.locale)
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
