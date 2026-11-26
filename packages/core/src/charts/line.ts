import type { ChartType, RenderContext, RenderResult } from '../chart.ts'
import { fadeMask } from '../components/fade.ts'
import { feature } from '../features.ts'
import { round } from '../layout.ts'
import { areaPath, type Curve, linePath, type Point } from '../shapes/path.ts'
import { h } from '../vnode.ts'
import {
  type CartesianOptions,
  cartesianLayout,
  categoryInteraction,
  markerShape,
  plottable,
  pointMark,
  resolveLabels,
  type Series,
  seriesAttrs,
  seriesAxes,
  seriesKey,
  seriesLegend,
  seriesScale,
  seriesTable,
} from './cartesian.ts'
import { cleanData, cleanSeries } from './clean.ts'
import { type StackMode, stackBounds, stackSeries } from './stack.ts'

export interface LineOptions extends CartesianOptions {
  /** Interpolation between points. Defaults to `'monotone'`. */
  curve?: Curve
  /** Draw dots on every point, only on the last one, or none. Defaults to `'none'`. */
  points?: 'none' | 'last' | 'all'
  /** Dot radius in pixels. Defaults to `4`. */
  pointRadius?: number
  /** Bridge `null` values instead of leaving gaps. Defaults to `false`. */
  connectNulls?: boolean
  /** Fill the area under each line. Defaults to `false` (`true` for `area`). */
  area?: boolean
  /**
   * Area fill style: a vertical fade (strength set by `--tc-area-gradient-start`
   * / `--tc-area-gradient-end`) or a flat wash (`--tc-area-opacity`).
   * Defaults to `'gradient'`, or `'solid'` for stacked areas.
   */
  fill?: 'gradient' | 'solid'
  /**
   * Stack series on top of each other (each line draws the running total);
   * `'percent'` shows every category as 100%. Missing values count as zero.
   */
  stacked?: StackMode
  /**
   * Draw long series with at most this many points, chosen by LTTB
   * downsampling so peaks and valleys survive. Tooltips and keyboard
   * navigation still use every value. Off by default.
   */
  decimate?: number
}

/** Points in pixels for a series; `null` for missing values. */
function seriesPoints(
  series: Series,
  count: number,
  x: (i: number) => number,
  y: (v: number) => number,
  connectNulls: boolean,
  valid: (v: number | null | undefined) => v is number,
): Point[] {
  const points: Point[] = []
  for (let i = 0; i < count; i++) {
    const v = series.values[i]
    if (!valid(v)) {
      if (!connectNulls) points.push(null)
    } else {
      points.push([x(i), y(v)])
    }
  }
  return points
}

/** Render line (and optionally area) series; shared by `line` and `area`. */
export function renderLines(options: LineOptions, ctx: RenderContext, fill: boolean): RenderResult {
  const {
    curve = 'monotone',
    points = 'none',
    pointRadius = 4,
    connectNulls = false,
    area: filled = fill,
    stacked = false,
    decimate,
    // Faded layers would show light seams between stacked areas, so stacks default to solid.
    fill: fillStyle = stacked ? 'solid' : 'gradient',
  } = options
  const overhang = points === 'none' ? 2 : pointRadius + 2
  const { series } = options.data
  const count = resolveLabels(options.data).length
  const axisOf = seriesAxes(options)
  // Series on the second axis keep out of the stacks.
  const seconds = series.filter((s) => axisOf(s).second).map(seriesKey)
  const stacks = stacked
    ? stackSeries(series, count, {
        percent: stacked === 'percent',
        nullAsZero: true,
        hidden: seconds.length ? new Set([...ctx.hidden, ...seconds]) : ctx.hidden,
      })
    : null
  const layout = cartesianLayout(options, ctx, {
    scale: 'point',
    zero: filled || stacks !== null,
    zero2: filled,
    overhang,
    ...(stacks ? { values: stackBounds(stacks) } : {}),
    ...(stacked === 'percent' ? { tickFormat: { style: 'percent' } } : {}),
  })
  const { x, labels } = layout
  const scaleOf = (index: number) => seriesScale(layout, series[index])
  // Areas grow from zero, or from the bottom of the plot when zero is out of view.
  const baselineOf = (index: number) => {
    const y = scaleOf(index)
    return y(Math.min(Math.max(0, y.domain[0]), y.domain[1]))
  }
  // (series left out of the stacks have empty rows there)
  const stackOf = (index: number) => (!axisOf(series[index]).second && stacks?.[index]) || null
  const interaction = categoryInteraction(layout, options, ctx, (seriesIndex, i, v) => {
    const stack = stackOf(seriesIndex)
    return { x: x.at(i), y: scaleOf(seriesIndex)(stack ? (stack[i]?.y1 ?? 0) : v) }
  })
  const gradient = filled && fillStyle === 'gradient'
  const fadeId = `${ctx.id}-fade`

  // Hidden series keep their index (and color slot) but draw nothing.
  const visible = (s: Series) => !ctx.hidden.has(seriesKey(s))
  const all = series.map((s, index) => {
    if (!visible(s)) return []
    const y = scaleOf(index)
    // Stacked series draw their running total.
    const stack = stackOf(index)
    if (stack) return stack.map((seg, i): Point => (seg ? [x.at(i), y(seg.y1)] : null))
    const axis = axisOf(s).axis
    return seriesPoints(
      s,
      labels.length,
      (i) => x.at(i),
      y,
      connectNulls,
      (v) => plottable(v, axis),
    )
  })
  /** Indices drawn per series: a downsampled subset when `decimate` is set. */
  const kept = all.map((pts) =>
    decimate !== undefined && pts.length > decimate ? feature('decimate')(pts, decimate) : null,
  )
  const drawn = (index: number): Point[] => {
    const pts = all[index] as Point[]
    const keep = kept[index]
    return keep ? keep.map((i) => pts[i] as Point) : pts
  }
  /** Area bottom: zero, or the top of the layer below for stacks (downsampled alike). */
  const bottom = (index: number): number | (number | null)[] => {
    const stack = stackOf(index)
    if (!stack) return baselineOf(index)
    const y = scaleOf(index)
    const bottoms = stack.map((seg) => (seg ? y(seg.y0) : null))
    const keep = kept[index]
    return keep ? keep.map((i) => bottoms[i] ?? null) : bottoms
  }

  // All areas go below all lines, so a filled series never covers another line.
  const areas =
    filled &&
    h(
      'g',
      { class: 'tc-areas' },
      options.data.series.map(
        (s, index) =>
          visible(s) &&
          h(
            'g',
            seriesAttrs(s, index),
            h('path', {
              class: ['tc-area', gradient && 'tc-area-gradient'],
              d: areaPath(drawn(index), bottom(index), { curve }),
              mask: gradient ? `url(#${fadeId})` : undefined,
            }),
          ),
      ),
    )

  const shape = markerShape(options)
  const lines = options.data.series.map((s, index) => {
    if (!visible(s)) return null
    const pts = drawn(index)
    const valid = pts.filter((p): p is readonly [number, number] => p != null)
    const dots = points === 'all' ? valid : points === 'last' ? valid.slice(-1) : []
    return h(
      'g',
      seriesAttrs(s, index),
      h('path', { class: 'tc-line', d: linePath(pts, { curve }) }),
      dots.length > 0 &&
        h(
          'g',
          { class: 'tc-points' },
          dots.map(([cx, cy]) =>
            pointMark(shape, index, cx, 'tc-point', round(cx), round(cy), pointRadius),
          ),
        ),
    )
  })

  const content = [
    h('defs', { key: 'defs' }, layout.clip.def, gradient && fadeMask(fadeId)),
    layout.background,
    // Layers are keyed: an annotation band or a grid that comes and goes must not
    // shift the series list onto another node (that would recreate every series).
    h('g', { key: 'series', class: 'tc-series-list', 'clip-path': layout.clip.url }, areas, lines),
    layout.foreground,
  ]
  return { content, interaction }
}

/**
 * Line chart: one line per series over category labels.
 *
 * ```ts
 * new Chart('#el', {
 *   type: line,
 *   data: { labels: ['Jan', 'Feb', 'Mar'], series: [{ name: 'Sales', values: [3, 5, 4] }] },
 * })
 * ```
 */
export const line: ChartType<LineOptions> = {
  name: 'line',
  clean: cleanData(cleanSeries),
  render: (options, ctx) => renderLines(options, ctx, false),
  legend: (options) => seriesLegend(options.data),
  table: (options, ctx, limit) => seriesTable(options, ctx, limit),
}
