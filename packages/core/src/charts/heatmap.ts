import type { ChartType, LegendItem, RenderContext } from '../chart.ts'
import { axis, axisSize, bandTicks, thinTicks } from '../components/axis.ts'
import { formatNumber, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import { estimateTextWidth, type InsetsInput, innerRect, insets } from '../layout.ts'
import { band } from '../scales/band.ts'
import { extent } from '../scales/extent.ts'
import { h, type StyleValue } from '../vnode.ts'
import {
  type CartesianData,
  type Label,
  labelKey,
  resolveLabels,
  type Series,
  seriesKey,
  seriesLegend,
  seriesTable,
} from './cartesian.ts'
import { cleanAxes, cleanSeries } from './clean.ts'

/** A band of values drawn in one color, with its own legend entry. */
export interface HeatmapRange {
  /** Lowest value in the band (inclusive). Leave it out for "everything below `to`". */
  from?: number
  /** Value where the band ends (exclusive). Leave it out on the last band. */
  to?: number
  /**
   * Any CSS color, including `var(--tc-color-3)`.
   * Values that could inject CSS (`;`, quotes, `url()` …) are ignored, so colors from user data are safe.
   */
  color: string
  /** Legend and tooltip name, e.g. `'High'`. Defaults to the range, e.g. `10–30`. */
  name?: string
}

export interface HeatmapOptions {
  /** Columns are the labels, rows are the series (first series on top). */
  data: CartesianData
  /** Value shown with the lightest shade (or the first color). Defaults to the smaller of `0` and the data minimum. */
  min?: number
  /** Value shown with the full color (or the last color). Defaults to the data maximum. */
  max?: number
  /**
   * Discrete bands of values, each in its own color and legend entry (which
   * also hides the band's cells). Takes precedence over `colors` and `colorBy`.
   */
  ranges?: readonly HeatmapRange[]
  /**
   * A continuous scale through two or more colors (any CSS color, including
   * `var(--tc-…)`), from `min` to `max`. For values around a reference
   * point, use two hues with a neutral middle, e.g.
   * `['var(--tc-color-1)', 'var(--tc-grid-color)', 'var(--tc-color-8)']`.
   * Values that could inject CSS are ignored, as for series colors.
   */
  colors?: readonly string[]
  /** Value placed on the middle color of `colors` (e.g. `0` for changes). Defaults to halfway. */
  mid?: number
  /**
   * `'series'` shades every row in its own palette color (with a legend of
   * the rows); `'value'` (the default) uses one hue, `--tc-heat-color`.
   */
  colorBy?: 'value' | 'series'
  /** Space between cells in pixels, drawn as surface. Defaults to `2`. */
  gap?: number
  /** Corner radius of the cells. Defaults to `3`. */
  radius?: number
  /** Format of the values (tooltip, table). */
  format?: NumberFormat
  /** Column labels along the bottom. */
  x?: { show?: boolean; format?: (label: Label, index: number) => string }
  /** Row names on the left. */
  y?: { show?: boolean }
  /** Extra space around the grid, in pixels. */
  padding?: InsetsInput
}

/** Share of the full color at the minimum, so zero still reads as a value, not a gap. */
const FLOOR = 0.08

const round = (value: number): number => Math.round(value * 100) / 100

const EMPTY = 'var(--tc-heat-empty,var(--tc-grid-color))'

/** Cell color at `share` (0…1) of the way from the empty shade to `color`. */
const shade = (share: number, color = 'var(--tc-heat-color,var(--tc-color-1))'): string =>
  `color-mix(in oklab,${color} ${round(share * 100)}%,${EMPTY})`

/** Legend key of a range. */
const rangeKey = (range: HeatmapRange, index: number): string => range.name ?? `range-${index + 1}`

/** The first range containing `v` (`from` inclusive, `to` exclusive). */
const rangeOf = (ranges: readonly HeatmapRange[], v: number): number =>
  ranges.findIndex((r) => (r.from === undefined || v >= r.from) && (r.to === undefined || v < r.to))

/** Color of a palette slot by series index, as the CSS classes would pick it. */
const slotColor = (series: Series, index: number): string =>
  series.color ?? (index < 8 ? `var(--tc-color-${index + 1})` : 'var(--tc-color-other)')

/** How one cell is painted: inline style, the tooltip swatch, and whether it is drawn empty. */
interface Paint {
  style?: StyleValue
  color: string
  empty?: boolean
}

/** A rounded rectangle as path data, for the hover ring. */
function ringPath(x: number, y: number, w: number, hgt: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, hgt / 2))
  const n = round
  return (
    `M${n(x + rr)},${n(y)}H${n(x + w - rr)}A${n(rr)},${n(rr)},0,0,1,${n(x + w)},${n(y + rr)}` +
    `V${n(y + hgt - rr)}A${n(rr)},${n(rr)},0,0,1,${n(x + w - rr)},${n(y + hgt)}` +
    `H${n(x + rr)}A${n(rr)},${n(rr)},0,0,1,${n(x)},${n(y + hgt - rr)}` +
    `V${n(y + rr)}A${n(rr)},${n(rr)},0,0,1,${n(x + rr)},${n(y)}Z`
  )
}

function renderHeatmap(options: HeatmapOptions, ctx: RenderContext) {
  const { width, height, fontSize, locale } = ctx
  const { gap = 2, radius = 3 } = options
  const labels = resolveLabels(options.data)
  const formatLabel = options.x?.format ?? ((label: Label) => String(label))
  const value = formatNumber(options.format, locale)

  // Color domain.
  const all = options.data.series.flatMap((s) => s.values)
  const [dataMin, dataMax] = extent(all) ?? [0, 1]
  const lo = options.min ?? Math.min(0, dataMin)
  const hi = options.max ?? dataMax
  /** Position of a value in the domain, 0…1 (through `mid` for a scale with a middle). */
  const position = (v: number) => {
    const { mid } = options
    let t: number
    if (mid !== undefined && options.colors && lo < mid && mid < hi) {
      t = v <= mid ? ((v - lo) / (mid - lo)) * 0.5 : 0.5 + ((v - mid) / (hi - mid)) * 0.5
    } else {
      t = hi > lo ? (v - lo) / (hi - lo) : v > lo ? 1 : 0
    }
    return Math.min(1, Math.max(0, t))
  }
  const share = (v: number) => FLOOR + (1 - FLOOR) * position(v)

  const ranges = options.ranges?.length ? options.ranges : undefined
  const stops = !ranges && options.colors && options.colors.length >= 2 ? options.colors : undefined
  const bySeries = !ranges && !stops && options.colorBy === 'series'
  // Rows hidden from the legend (rows are legend entries when colored by series).
  const rows = bySeries
    ? options.data.series.filter((s) => !ctx.hidden.has(seriesKey(s)))
    : options.data.series
  const slot = (row: Series) => options.data.series.indexOf(row)

  /** How the cell of `row` with value `v` is painted in the active color mode. */
  const paint = (v: number, row: Series): Paint => {
    if (ranges) {
      const index = rangeOf(ranges, v)
      const range = ranges[index]
      if (!range || ctx.hidden.has(rangeKey(range, index))) return { color: EMPTY, empty: true }
      return { style: { '--tc-cell-fill': range.color }, color: range.color }
    }
    if (stops) {
      const at = position(v) * (stops.length - 1)
      const k = Math.min(stops.length - 2, Math.floor(at))
      const u = round((at - k) * 100)
      const from = stops[k] as string
      const color =
        u <= 0
          ? from
          : u >= 100
            ? (stops[k + 1] as string)
            : `color-mix(in oklab,${stops[k + 1]} ${u}%,${from})`
      return { style: { '--tc-cell-fill': color }, color }
    }
    const pct = share(v)
    return {
      style: `--tc-heat:${round(pct * 100)}%`,
      color: bySeries ? shade(pct, slotColor(row, slot(row))) : shade(pct),
    }
  }

  // Margins for the labels, then one band per column and per row.
  const pad = insets(options.padding, 0)
  const showX = options.x?.show !== false && labels.length > 0
  const showY = options.y?.show !== false && rows.length > 0
  const rowTicks = rows.map((s, i) => ({ value: i, position: 0, label: s.name }))
  const left = showY ? axisSize('left', rowTicks, fontSize) : 0
  const bottom = showX ? axisSize('bottom', [{ value: 0, position: 0, label: 'M' }], fontSize) : 0
  // The last column label is centered on its column: what is wider than half a
  // column needs room on the right.
  const lastLabel = showX
    ? estimateTextWidth(
        formatLabel(labels[labels.length - 1] as Label, labels.length - 1),
        fontSize,
      )
    : 0
  const halfColumn = (width - pad.left - pad.right - left) / Math.max(1, labels.length) / 2
  const area = innerRect(width, height, {
    top: pad.top,
    right: pad.right + Math.max(0, Math.ceil(lastLabel / 2 - halfColumn)),
    bottom: pad.bottom + bottom,
    left: pad.left + left,
  })
  const x = band(
    labels.map((_, i) => i),
    [area.x, area.x + area.width],
  )
  const y = band(
    rows.map((_, i) => i),
    [area.y, area.y + area.height],
  )
  const cellW = Math.max(0, x.bandwidth - gap)
  const cellH = Math.max(0, y.bandwidth - gap)
  const cellX = (i: number) => x.at(i) + gap / 2
  const cellY = (j: number) => y.at(j) + gap / 2
  const valueAt = (i: number, j: number) => {
    const v = rows[j]?.values[i]
    return v != null && Number.isFinite(v) ? v : null
  }

  // One hit per column; every row is an item, the hovered row is active.
  const hitAt = (i: number, row = 0): Hit | null => {
    if (i < 0 || i >= labels.length || rows.length === 0) return null
    const j = Math.max(0, Math.min(rows.length - 1, row))
    const items: HitItem[] = rows.map((s, r) => {
      const v = valueAt(i, r)
      const range = ranges && v !== null ? ranges[rangeOf(ranges, v)] : undefined
      return {
        name: s.name,
        seriesIndex: r,
        value: v,
        // With ranges, the band's name says what the value means.
        text: v === null ? '–' : range?.name ? `${value(v)} · ${range.name}` : value(v),
        x: cellX(i) + cellW / 2,
        y: cellY(r) + cellH / 2,
        color: v === null ? 'var(--tc-grid-color)' : paint(v, s).color,
      }
    })
    return {
      index: i,
      label: labelKey(labels[i] as Label),
      title: formatLabel(labels[i] as Label, i),
      x: cellX(i) + cellW / 2,
      area,
      items,
      seriesIndex: j,
      // A ring just outside the hovered cell.
      mark: {
        d: ringPath(cellX(i) - 2, cellY(j) - 2, cellW + 4, cellH + 4, radius + 2),
        x: 0,
        y: 0,
      },
    }
  }

  const interaction: Interaction = {
    count: labels.length,
    hitIndex: (i, row) => hitAt(i, row),
    hitTest(px, py) {
      if (px < area.x || px > area.x + area.width || py < area.y || py > area.y + area.height) {
        return null
      }
      const i = Math.min(labels.length - 1, Math.floor((px - area.x) / (x.step || 1)))
      const j = Math.min(rows.length - 1, Math.floor((py - area.y) / (y.step || 1)))
      return hitAt(i, j)
    },
  }
  ctx.onHitTest(interaction)

  const cells = rows.map((s, j) =>
    h(
      'g',
      {
        key: seriesKey(s),
        // Colored by series, a row takes its palette slot like any series.
        class: ['tc-heatmap-row', bySeries && ['tc-series', `tc-series-${slot(s) + 1}`]],
        'data-series': s.name,
        style: bySeries ? { '--tc-series-color': s.color } : undefined,
      },
      labels.map((label, i) => {
        const v = valueAt(i, j)
        const painted = v === null ? undefined : paint(v, s)
        return h('rect', {
          key: labelKey(label),
          class: ['tc-cell', (v === null || painted?.empty) && 'tc-cell-empty'],
          x: round(cellX(i)),
          y: round(cellY(j)),
          width: round(cellW),
          height: round(cellH),
          rx: round(Math.min(radius, cellW / 2, cellH / 2)),
          style: painted?.style,
        })
      }),
    ),
  )

  const xTicks = showX
    ? thinTicks(
        bandTicks(x, (_, i) => formatLabel(labels[i] as Label, i)),
        'bottom',
        fontSize,
      )
    : []
  const yTicks = showY ? bandTicks(y, (_, j) => rows[j]?.name ?? '') : []

  return [
    h('g', { class: 'tc-heatmap-cells' }, cells),
    showX && axis({ position: 'bottom', ticks: xTicks, area }),
    showY && axis({ position: 'left', ticks: yTicks, area }),
  ]
}

/** Legend: the ranges, or the rows when colored by series; none for a single scale. */
function heatmapLegend(options: HeatmapOptions): LegendItem[] {
  const { ranges } = options
  if (ranges?.length) {
    const value = formatNumber(options.format)
    return ranges.map((range, index) => ({
      key: rangeKey(range, index),
      name:
        range.name ??
        (range.from === undefined
          ? `< ${value(range.to ?? 0)}`
          : range.to === undefined
            ? `≥ ${value(range.from)}`
            : `${value(range.from)}–${value(range.to)}`),
      index,
      color: range.color,
    }))
  }
  if (options.colors && options.colors.length >= 2) return []
  return options.colorBy === 'series' ? seriesLegend(options.data) : []
}

/**
 * Heatmap: a grid of cells, one row per series and one column per label,
 * shaded from light to the full color by value (a single hue, so it reads
 * as magnitude). Set the hue with `--tc-heat-color`, or color the cells by
 * `ranges` of values, a `colors` scale (with a `mid` for diverging data),
 * or one palette color per row with `colorBy: 'series'`.
 *
 * ```ts
 * new Chart('#el', {
 *   type: heatmap,
 *   data: { labels: ['W1', 'W2', 'W3'], series: [{ name: 'Mon', values: [2, 4, 0] }] },
 * })
 * ```
 */
export const heatmap: ChartType<HeatmapOptions> = {
  name: 'heatmap',
  clean: cleanAxes(cleanSeries),
  render: renderHeatmap,
  legend: heatmapLegend,
  table: (options, ctx, limit) => seriesTable(options, ctx, limit),
}
