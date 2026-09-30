import type { DataTable, LegendItem, RenderContext } from '../chart.ts'
import { axis, axisSize, bandTicks, linearTicks, type Tick, thinTicks } from '../components/axis.ts'
import { grid } from '../components/grid.ts'
import { formatNumber, type NumberFormat } from '../format.ts'
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
export type Label = string | number

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
}

/** Options for the category (x) axis. */
export interface CategoryAxisOptions {
  /** Render the axis labels. Defaults to `true`. */
  show?: boolean
  /** Render vertical grid lines. Defaults to `false`. */
  grid?: boolean
  /** Draw the axis line along the bottom edge. Defaults to `false`. */
  line?: boolean
  /** Format a label for display. */
  format?: (label: Label, index: number) => string
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
  /**
   * Lay categories out along y and values along x (horizontal bars). The
   * `x` / `y` options keep meaning category / value axis.
   */
  horizontal?: boolean
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

const TICK_SPACING = 60
/** Horizontal value axes need more room per label. */
const TICK_SPACING_X = 80
const EDGE = 8

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
  const format = xOptions.format ?? ((label: Label) => String(label))
  const showY = yOptions.show !== false
  const showX = xOptions.show !== false && labels.length > 0

  const horizontal = layout.horizontal === true
  const count =
    yOptions.ticks ??
    Math.max(2, Math.round(horizontal ? width / TICK_SPACING_X : height / TICK_SPACING))
  const domain = valueDomain(data, yOptions, layout.zero, count, ctx.hidden, layout.values)
  const tickFormat = layout.tickFormat ?? yOptions.format
  if (horizontal) {
    return horizontalLayout(options, ctx, layout, labels, domain, count, tickFormat)
  }
  const probeY = linearTicks(linear(domain, [1, 0]), { count, format: tickFormat, locale })

  // Margins: labels outside the plot, half a line above the top tick,
  // half of the first/last x label for point scales.
  const halfLine = Math.ceil((fontSize * LINE_HEIGHT) / 2)
  const firstLabel = showX ? estimateTextWidth(format(labels[0] as Label, 0), fontSize) : 0
  const lastLabel = showX
    ? estimateTextWidth(format(labels[labels.length - 1] as Label, labels.length - 1), fontSize)
    : 0
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
  const x =
    layout.scale === 'point'
      ? point(labels, xRange)
      : band(labels, xRange, {
          paddingInner: layout.paddingInner ?? 0.3,
          paddingOuter: layout.paddingOuter ?? 0.15,
        })
  const y = linear(domain, [area.y + area.height, area.y])

  const yTicks = linearTicks(y, { count, format: tickFormat, locale })
  const xTicks = showX
    ? thinTicks(
        bandTicks(x, (key: BandKey, i) => format(key, i)),
        'bottom',
        fontSize,
      )
    : []

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
function plotClip(ctx: RenderContext, area: Rect, overhang: number): CartesianLayout['clip'] {
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

/** Categories along y (labels on the left), values along x (labels at the bottom). */
function horizontalLayout(
  options: CartesianOptions,
  ctx: RenderContext,
  layout: CartesianLayoutOptions,
  labels: Label[],
  domain: [number, number],
  count: number,
  tickFormat: NumberFormat | undefined,
): CartesianLayout {
  const yOptions = options.y ?? {}
  const xOptions = options.x ?? {}
  const { fontSize, locale, width, height } = ctx
  const overhang = layout.overhang ?? 0
  const pad = insets(options.padding)
  const format = xOptions.format ?? ((label: Label) => String(label))
  const showValues = yOptions.show !== false
  const showCategories = xOptions.show !== false && labels.length > 0

  const probeValues = linearTicks(linear(domain, [0, 1]), { count, format: tickFormat, locale })
  const probeCategories: Tick[] = labels.map((label, i) => ({
    value: label,
    position: 0,
    label: format(label, i),
  }))
  const edgeLabel = (tick: Tick | undefined) =>
    showValues && tick ? Math.ceil(estimateTextWidth(tick.label, fontSize) / 2) : 0

  const margins = {
    top: pad.top + Math.max(overhang, EDGE / 2),
    right: pad.right + Math.max(edgeLabel(probeValues[probeValues.length - 1]), overhang, EDGE),
    bottom:
      pad.bottom +
      Math.max(showValues ? axisSize('bottom', probeValues, fontSize) : 0, overhang, EDGE / 2),
    left:
      pad.left +
      Math.max(
        showCategories ? axisSize('left', probeCategories, fontSize) : 0,
        edgeLabel(probeValues[0]),
        overhang,
        EDGE,
      ),
  }
  const area = innerRect(width, height, margins)

  const x = band(labels, [area.y, area.y + area.height], {
    paddingInner: layout.paddingInner ?? 0.3,
    paddingOuter: layout.paddingOuter ?? 0.15,
  })
  const y = linear(domain, [area.x, area.x + area.width])
  const yTicks = linearTicks(y, { count, format: tickFormat, locale })
  const xTicks = showCategories
    ? thinTicks(
        bandTicks(x, (key: BandKey, i) => format(key, i)),
        'left',
        fontSize,
      )
    : []

  const background: VNode[] = []
  if (yOptions.grid !== false) background.push(grid({ direction: 'x', ticks: yTicks, area }))
  if (xOptions.grid) background.push(grid({ direction: 'y', ticks: xTicks, area }))

  const foreground: VNode[] = []
  if (showCategories || xOptions.line) {
    foreground.push(axis({ position: 'left', ticks: xTicks, area, line: xOptions.line === true }))
  }
  if (showValues) foreground.push(axis({ position: 'bottom', ticks: yTicks, area }))

  return {
    area,
    labels,
    x,
    y,
    horizontal: true,
    xTicks,
    yTicks,
    background,
    foreground,
    clip: plotClip(ctx, area, overhang),
  }
}

/** Attributes shared by every series group. */
export function seriesAttrs(series: Series, index: number): Record<string, string | ClassValue> {
  return {
    key: seriesKey(series),
    class: ['tc-series', `tc-series-${index + 1}`, series.class],
    'data-series': series.name,
    ...(series.color ? { style: `--tc-series-color:${series.color}` } : {}),
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
  const formatLabel = options.x?.format ?? ((label: Label) => String(label))
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
      const value = raw == null || !Number.isFinite(raw) ? null : raw
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
        label,
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
    const hit: Hit = { index, label, title, x: center, area, items }
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
export function seriesTable(options: CartesianOptions, ctx: RenderContext): DataTable {
  const labels = resolveLabels(options.data)
  const formatLabel = options.x?.format ?? ((label: Label) => String(label))
  const formatValue = formatNumber(options.y?.format, ctx.locale)
  const series = options.data.series.filter((s) => !ctx.hidden.has(seriesKey(s)))
  return {
    columns: ['', ...series.map((s) => s.name)],
    rows: labels.map((label, i) => [
      formatLabel(label, i),
      ...series.map((s) => {
        const v = s.values[i]
        return v == null || !Number.isFinite(v) ? '–' : formatValue(v)
      }),
    ]),
  }
}
