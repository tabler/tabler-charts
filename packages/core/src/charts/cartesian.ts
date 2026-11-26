import type { DataTable, LegendItem, RenderContext, TableContext } from '../chart.ts'
import {
  axis,
  axisSize,
  axisTitle,
  axisTitleSize,
  bandTicks,
  linearTicks,
  type Tick,
  thinTicks,
} from '../components/axis.ts'
import { grid } from '../components/grid.ts'
import { type Features, feature, features } from '../features.ts'
import { formatDetail, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import {
  estimateTextWidth,
  type InsetsInput,
  LINE_HEIGHT,
  type PlotFrame,
  plotFrame,
  type Rect,
} from '../layout.ts'
import { type BandKey, type BandScale, band, point } from '../scales/band.ts'
import { extent } from '../scales/extent.ts'
import { type LinearScale, linear } from '../scales/linear.ts'
import { niceDomain } from '../scales/ticks.ts'
import { type ClassValue, h, type Props, type VNode } from '../vnode.ts'
import type { Annotation } from './annotations.ts'
import { finite } from './clean.ts'
import { groupAttrs, keyOf, legendItems } from './named.ts'

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
  /**
   * Value axis of the series: `'y2'` draws it against the second axis
   * (options in `y2`), on the right of the plot (on the left in a
   * right-to-left chart), and leaves it out of stacks. Line, area and
   * vertical bar charts. Defaults to `'y'`.
   */
  axis?: 'y' | 'y2'
  /** Extra classes on the series group. */
  class?: ClassValue
  /** Start hidden (toggle it back from the legend). */
  hidden?: boolean
  /**
   * Write values on this series' marks, whatever the chart's `valueLabels`
   * says: `true` labels it even when the chart option is off, `false` leaves
   * it out. Needs `@tabler/charts/value-labels` on the core.
   */
  valueLabels?: boolean
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
  /**
   * Title of the axis (e.g. a unit), beside its labels: turned 90° on the
   * left of the plot, or on the right in a right-to-left chart.
   */
  title?: string
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
  /** Title of the axis, below its labels. */
  title?: string
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
  /** Run the categories from the right. Defaults to the chart's `rtl`. */
  reverse?: boolean
}

export interface CartesianOptions {
  data: CartesianData
  y?: ValueAxisOptions
  /**
   * The second value axis, for series with `axis: 'y2'` (it is drawn only
   * when a series uses it). Its labels and title stand on the other side of
   * the plot; the grid lines follow `y`.
   */
  y2?: ValueAxisOptions
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
  /** Default for `y2.zero`. Defaults to `zero`. */
  zero2?: boolean
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
  /** Scale of the second value axis, when a series uses it. */
  y2?: LinearScale
  /** Whether categories run along y. */
  horizontal: boolean
  xTicks: Tick[]
  yTicks: Tick[]
  /** Ticks of the second value axis (with `y2`). */
  y2Ticks?: Tick[]
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
export const seriesKey: (series: Series) => string = keyOf

/**
 * Whether the chart draws a second value axis: a series asks for it with
 * `axis: 'y2'`, and the values run along y (not in horizontal bars).
 */
export const hasY2 = (options: CartesianOptions): boolean =>
  (options as { orientation?: unknown }).orientation !== 'horizontal' &&
  options.data.series.some((s) => s.axis === 'y2')

/**
 * The value axis a series is read on: a function giving each series'
 * axis options, and whether it is the second one.
 */
export function seriesAxes(
  options: CartesianOptions,
): (series: Series | undefined) => { second: boolean; axis: ValueAxisOptions } {
  const second = hasY2(options)
  const y = { second: false, axis: options.y ?? {} }
  const y2 = { second: true, axis: options.y2 ?? {} }
  return (series) => (second && series?.axis === 'y2' ? y2 : y)
}

/** The scale of a series: the second one for series on `y2`. */
export const seriesScale = (
  layout: Pick<CartesianLayout, 'y' | 'y2'>,
  series: Series | undefined,
): LinearScale => (layout.y2 && series?.axis === 'y2' ? layout.y2 : layout.y)

/** Legend entries for series-based charts. */
export const seriesLegend = (data: CartesianData): LegendItem[] => legendItems(data.series)

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
  ctx: TableContext,
): (label: Label, index: number) => string {
  if (options.x?.format) return options.x.format
  if (!isTimeAxis(options)) return (label) => String(label)
  return feature('dates')(resolveLabels(options.data), options.x?.utc, ctx.locale)
}

/** A label as a timestamp: dates, numbers, or parseable strings (ISO); `NaN` otherwise. */
// Through Date, so timestamps out of its range are NaN too.
export const toMs = (label: Label): number => new Date(label).getTime()

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

/** The point shapes of a chart (`shapes`, or with `patterns: true`), if it has them. */
export const markerShape = (options: object): NonNullable<Features['point-shapes']> | undefined => {
  const { shapes, patterns } = options as { shapes?: boolean; patterns?: unknown }
  // On the core, the shapes come with their module (like the points of line charts).
  return (shapes ?? patterns === true) ? features['point-shapes'] : undefined
}

/**
 * A point of the series in color slot `slot`: a circle, or the slot's marker
 * when the chart has point shapes (see `markerShape`).
 */
export function pointMark(
  shape: ReturnType<typeof markerShape>,
  slot: number,
  key: string | number,
  cls: ClassValue,
  cx: number,
  cy: number,
  r: number,
): VNode {
  return shape
    ? h('path', { key, class: [cls, 'tc-marker'], d: shape(slot, cx, cy, r) })
    : h('circle', { key, class: cls, cx, cy, r })
}

/** The tick count asked for on an axis (a number up to 100), or `auto`. */
export const tickCount = (axis: { ticks?: number } | undefined, auto: number): number =>
  Math.min(finite(axis?.ticks) ?? auto, 100)

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
  // Bounds may come from outside: only numbers count.
  const min = finite(options.min)
  const max = finite(options.max)
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
  if (min !== null) lo = min
  if (max !== null) hi = max
  if (options.nice !== false) {
    const [nlo, nhi] = niceDomain(lo, hi, count)
    if (min === null) lo = nlo
    if (max === null) hi = nhi
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

/**
 * The value axis of a cartesian layout, before the plot area is known: its
 * scale over a pixel range, the ticks of that scale, and `probe`, ticks to
 * measure the labels with (their positions mean nothing). `auto` is the
 * tick count the plot has room for, unless the axis asks for its own.
 */
export function valueAxis(
  options: CartesianOptions,
  ctx: RenderContext,
  layout: CartesianLayoutOptions,
  auto: number,
  /** Only the series of this axis (`y` or `y2`); every series when not set. */
  which?: 'y' | 'y2',
): {
  scale(range: [number, number]): LinearScale
  ticks(scale: LinearScale): Tick[]
  probe: Tick[]
} {
  const second = which === 'y2'
  const axis = (second ? options.y2 : options.y) ?? {}
  const count = tickCount(axis, Math.max(2, auto))
  let domain: [number, number]
  if (second) {
    const own = options.data.series.filter((s) => s.axis === 'y2')
    const shown = own.filter((s) => !ctx.hidden.has(seriesKey(s)))
    // With all its series hidden, the axis keeps its scale instead of jumping to 0…1.
    const values = (shown.length ? shown : own).flatMap((s) => s.values)
    domain = domainOf(values, axis, layout.zero2 ?? layout.zero, count)
  } else {
    const data =
      which === 'y'
        ? { ...options.data, series: options.data.series.filter((s) => s.axis !== 'y2') }
        : options.data
    domain = valueDomain(
      data,
      axis,
      layout.zero,
      count,
      ctx.hidden,
      layout.values,
      notesFeature(options)?.values(options.annotations),
    )
  }
  const format = second ? axis.format : (layout.tickFormat ?? axis.format)
  const scale = (range: [number, number]) => valueScale(domain, range, axis)
  const ticks = (of: LinearScale) => valueTicks(of, axis, count, format, ctx.locale)
  return { scale, ticks, probe: ticks(scale([0, 1])) }
}

/**
 * Finish a layout that has its plot area, scales and ticks with what is
 * drawn around the marks: grid lines and annotation bands below them,
 * annotation lines and the axes above. Values run along y and categories
 * along x, or the other way round when `horizontal`. The value axis (the
 * category axis when `horizontal`) sits on the start `side`.
 */
export function finishLayout(
  options: CartesianOptions,
  ctx: RenderContext,
  side: PlotFrame['side'],
  overhang: number,
  plot: Omit<CartesianLayout, 'background' | 'foreground' | 'clip'>,
  keys: readonly BandKey[],
  time?: (date: Date) => number,
): CartesianLayout {
  const { area, x, y, xTicks, yTicks, y2Ticks, horizontal: flip } = plot
  const xOptions = options.x ?? {}
  // The second value axis stands on the other side.
  const opposite = side === 'left' ? 'right' : 'left'
  // Annotations: bands under the series, lines above them (and below the axes).
  const notes = notesFeature(options)?.layers(options.annotations, {
    area,
    horizontal: flip,
    fontSize: ctx.fontSize,
    value: y,
    band: x,
    keys,
    time,
  })
  const values = options.y?.show !== false && [
    axis({ position: flip ? 'bottom' : side, ticks: yTicks, area }),
  ]
  const categories = ((xOptions.show !== false && plot.labels.length > 0) || xOptions.line) && [
    axis({ position: flip ? side : 'bottom', ticks: xTicks, area, line: xOptions.line === true }),
  ]
  // Titles stand past the labels of their axis, or at the plot's edge when it is hidden.
  const seconds = !!y2Ticks &&
    options.y2?.show !== false && [axis({ position: opposite, ticks: y2Ticks, area })]
  const title = (
    text: string | undefined,
    position: 'left' | 'right' | 'bottom',
    ticks: readonly Tick[] | false,
  ) => !!text && axisTitle(position, ticks || [], area, text, ctx.fontSize)
  const titles = [
    title(options.y?.title, flip ? 'bottom' : side, !!values && yTicks),
    title(xOptions.title, flip ? side : 'bottom', xTicks),
    !!y2Ticks && title(options.y2?.title, opposite, !!seconds && y2Ticks),
  ]
  const present = (parts: (VNode | VNode[] | null | false | undefined)[]): VNode[] =>
    parts.flatMap((part) => part || [])
  return {
    ...plot,
    background: present([
      options.y?.grid !== false && grid({ direction: flip ? 'x' : 'y', ticks: yTicks, area }),
      xOptions.grid && grid({ direction: flip ? 'y' : 'x', ticks: xTicks, area }),
      notes?.under,
    ]),
    // The axis on the left first, then the one at the bottom.
    foreground: present([
      notes?.over,
      flip ? categories : values,
      flip ? values : categories,
      seconds,
      ...titles,
    ]),
    clip: plotClip(ctx, area, overhang),
  }
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
  const rtl = ctx.rtl === true
  const reverse = xOptions.reverse ?? rtl
  const labels = resolveLabels(data)
  const format = labelFormatter(options, ctx)
  const showY = yOptions.show !== false
  const showX = xOptions.show !== false && labels.length > 0
  const timed = isTimeAxis(options) && layout.scale === 'point'

  const auto = Math.round(height / TICK_SPACING)
  const second = hasY2(options)
  const value = valueAxis(options, ctx, layout, auto, second ? 'y' : undefined)
  const probeY = value.probe
  const y2Options = options.y2 ?? {}
  const value2 = second ? valueAxis(options, ctx, layout, auto, 'y2') : null
  const showY2 = !!value2 && y2Options.show !== false
  const countX = Math.max(2, Math.round(width / TICK_SPACING_X))
  const keys = labels.map(labelKey)
  const labelAt = (i: number) => format(labels[i] as Label, i)
  // Time axes (from the time module) place points by date, with calendar ticks.
  const xAxis: CategoryAxis = timed
    ? feature('time').axis(labels, keys, xOptions, countX, locale)
    : {
        // No labels, no edges: a custom format is not asked about a label that is not there.
        edges: labels.length ? [labelAt(0), labelAt(labels.length - 1)] : [],
        scale: (range) =>
          layout.scale === 'point'
            ? point(keys, range)
            : band(keys, range, {
                paddingInner: layout.paddingInner ?? 0.3,
                paddingOuter: layout.paddingOuter ?? 0.15,
              }),
        ticks: (scale) => bandTicks(scale, (_: BandKey, i) => labelAt(i)),
      }
  const edgeLabels = xAxis.edges

  // Margins: labels outside the plot, half a line above the top tick,
  // half of the first/last x label for point scales.
  const halfLine = Math.ceil((fontSize * LINE_HEIGHT) / 2)
  // The label at the value axis' end of the plot, and the one at the other end.
  const edgeWidth = (last: boolean) =>
    showX ? estimateTextWidth(edgeLabels[last ? edgeLabels.length - 1 : 0] ?? '', fontSize) : 0
  const firstLabel = edgeWidth(reverse !== rtl)
  const lastLabel = edgeWidth(reverse === rtl)
  const edgeX = layout.scale === 'point'
  // On bands a label is centered half a step from the edge: only what is wider
  // than that needs margin (long labels on narrow bands, e.g. dates on candles).
  // The step depends on the margins, so they are worked out twice.
  const valueWidth =
    (showY ? axisSize('left', probeY, fontSize) : 0) + axisTitleSize(yOptions.title, fontSize)
  // The second axis takes the end side (measured as the right, then mirrored).
  const value2Width = value2
    ? (showY2 ? axisSize('right', value2.probe, fontSize) : 0) +
      axisTitleSize(y2Options.title, fontSize)
    : 0
  const { area, side, range } = plotFrame(ctx, options.padding, (pad) => {
    const sides = (halfStep: number) => {
      const overflow = (label: number) =>
        edgeX ? Math.ceil(label / 2) : Math.max(0, Math.ceil(label / 2 - halfStep))
      return {
        start: pad.start + Math.max(valueWidth, overflow(firstLabel), overhang, showY ? 0 : EDGE),
        end: pad.end + Math.max(value2Width, overflow(lastLabel), overhang, EDGE),
      }
    }
    const steps = Math.max(1, labels.length) * 2
    let both = sides((width - pad.start - pad.end - valueWidth - value2Width) / steps)
    if (!edgeX) both = sides((width - both.start - both.end) / steps)
    return {
      top: pad.top + Math.max(showY || showY2 ? halfLine : 0, overhang, EDGE / 2),
      bottom:
        pad.bottom +
        Math.max(
          // Without an x axis, the lowest value label still needs half a line.
          (showX ? axisSize('bottom', [probeY[0] as Tick], fontSize) : showY ? halfLine : 0) +
            axisTitleSize(xOptions.title, fontSize),
          overhang,
          EDGE / 2,
        ),
      ...both,
    }
  })

  const x = xAxis.scale(range(reverse))
  const y = value.scale([area.y + area.height, area.y])
  const y2 = value2?.scale([area.y + area.height, area.y])

  // Nice ticks can outnumber the count asked for: on a short plot, thin them
  // like category labels so none overlap (the grid follows the ticks kept).
  const yTicks = thinTicks(value.ticks(y), 'left', fontSize, 4)
  const xTicks = showX ? thinTicks(xAxis.ticks(x), 'bottom', fontSize) : []
  const plot: Omit<CartesianLayout, 'background' | 'foreground' | 'clip'> = {
    area,
    labels,
    x,
    y,
    horizontal: false,
    xTicks,
    yTicks,
  }
  if (value2 && y2) {
    plot.y2 = y2
    plot.y2Ticks = thinTicks(value2.ticks(y2), 'right', fontSize, 4)
  }

  return finishLayout(options, ctx, side, overhang, plot, keys, xAxis.time)
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
    ...groupAttrs(series, index),
    // A map, so values from data cannot inject CSS (see normalizeStyle).
    style: {
      '--tc-series-color': series.color,
      '--tc-series-dash': Number.isFinite(dash) ? `${dash}px` : dash,
      '--tc-series-width': Number.isFinite(width) ? `${width}px` : undefined,
    },
  }
}

/** Pixels around the plot area that still count as hovering it. */
const HOVER_SLOP = 8

/**
 * Interaction by category: the nearest category to the pointer while it is
 * over the plot area, with every visible series' value there. `anchor`
 * places each value (line point, bar end, and the bar's box); `markAt` names the series of the
 * mark directly under the pointer, if the chart has distinct marks (bars).
 * Labels and values are formatted with `x.format` / `y.format` and the locale.
 */
export function categoryInteraction(
  layout: CartesianLayout,
  options: CartesianOptions,
  ctx: RenderContext,
  anchor: (
    seriesIndex: number,
    index: number,
    value: number,
  ) => { x: number; y: number; box?: Rect },
  markAt?: (x: number, y: number, index: number) => number | undefined,
): Interaction {
  const { area, x, labels, horizontal } = layout
  const { data } = options
  const formatLabel = labelFormatter(options, ctx)
  const axisOf = seriesAxes(options)
  // Each series reads its values like its axis: bounds (log) and format.
  const axes = data.series.map((s) => axisOf(s).axis)
  const formats = axes.map((axis) => formatDetail(axis.format, ctx.locale))

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
      const value = plottable(raw, axes[seriesIndex]) ? raw : null
      const point = value === null ? empty : anchor(seriesIndex, index, value)
      const item: HitItem = {
        name: series.name,
        seriesIndex,
        value,
        text: value === null ? '–' : (formats[seriesIndex] as (v: number) => string)(value),
        ...point,
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
      hit.highlight = horizontal
        ? { kind: 'band', x: area.x, y: start, width: area.width, height: x.bandwidth }
        : { kind: 'band', x: start, y: area.y, width: x.bandwidth, height: area.height }
    }
    return hit
  }

  return {
    count: labels.length,
    reversed: x.range[1] < x.range[0],
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
  ctx: TableContext,
  limit: number = Number.POSITIVE_INFINITY,
): DataTable {
  const all = resolveLabels(options.data)
  const labels = all.length > limit ? all.slice(0, limit) : all
  const formatLabel = labelFormatter(options, ctx)
  const axisOf = seriesAxes(options)
  const series = options.data.series.filter((s) => !ctx.hidden.has(seriesKey(s)))
  const formats = series.map((s) => formatDetail(axisOf(s).axis.format, ctx.locale))
  return {
    columns: ['', ...series.map((s) => s.name)],
    total: all.length,
    rows: labels.map((label, i) => [
      formatLabel(label, i),
      ...series.map((s, n) => {
        const v = s.values[i]
        return v == null || !Number.isFinite(v) ? '–' : (formats[n] as (v: number) => string)(v)
      }),
    ]),
  }
}
