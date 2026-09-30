import type { ChartType, RenderContext } from '../chart.ts'
import { areaPath, type Curve, linePath, type Point } from '../shapes/path.ts'
import { type ChildInput, h } from '../vnode.ts'
import {
  type CartesianOptions,
  cartesianLayout,
  categoryInteraction,
  resolveLabels,
  type Series,
  seriesAttrs,
  seriesKey,
  seriesLegend,
  seriesTable,
} from './cartesian.ts'
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
}

const round = (value: number): number => Math.round(value * 100) / 100

/** Points in pixels for a series; `null` for missing values. */
function seriesPoints(
  series: Series,
  count: number,
  x: (i: number) => number,
  y: (v: number) => number,
  connectNulls: boolean,
): Point[] {
  const points: Point[] = []
  for (let i = 0; i < count; i++) {
    const v = series.values[i]
    if (v == null || !Number.isFinite(v)) {
      if (!connectNulls) points.push(null)
    } else {
      points.push([x(i), y(v)])
    }
  }
  return points
}

/** Render line (and optionally area) series; shared by `line` and `area`. */
export function renderLines(options: LineOptions, ctx: RenderContext, fill: boolean): ChildInput {
  const {
    curve = 'monotone',
    points = 'none',
    pointRadius = 4,
    connectNulls = false,
    area: filled = fill,
    stacked = false,
    // Faded layers would show light seams between stacked areas, so stacks default to solid.
    fill: fillStyle = stacked ? 'solid' : 'gradient',
  } = options
  const overhang = points === 'none' ? 2 : pointRadius + 2
  const { series } = options.data
  const count = resolveLabels(options.data).length
  const stacks = stacked
    ? stackSeries(series, count, {
        percent: stacked === 'percent',
        nullAsZero: true,
        hidden: ctx.hidden,
      })
    : null
  const layout = cartesianLayout(options, ctx, {
    scale: 'point',
    zero: filled || stacks !== null,
    overhang,
    ...(stacks ? { values: stackBounds(stacks) } : {}),
    ...(stacked === 'percent' ? { tickFormat: { style: 'percent' } } : {}),
  })
  const { x, y, labels } = layout
  const baseline = y(Math.min(Math.max(0, y.domain[0]), y.domain[1]))
  ctx.onHitTest(
    categoryInteraction(layout, options, ctx, (seriesIndex, i, v) => ({
      x: x.at(i),
      y: y(stacks ? (stacks[seriesIndex]?.[i]?.y1 ?? 0) : v),
    })),
  )
  const gradient = filled && fillStyle === 'gradient'
  const fadeId = `${ctx.id}-fade`

  // Hidden series keep their index (and color slot) but draw nothing.
  const visible = (s: Series) => !ctx.hidden.has(seriesKey(s))
  const all = series.map((s, index) => {
    if (!visible(s)) return []
    // Stacked series draw their running total.
    const stack = stacks?.[index]
    if (stack) return stack.map((seg, i): Point => (seg ? [x.at(i), y(seg.y1)] : null))
    return seriesPoints(s, labels.length, (i) => x.at(i), y, connectNulls)
  })
  /** Area bottom: zero, or the top of the layer below for stacks. */
  const bottom = (index: number) =>
    stacks?.[index]?.map((seg) => (seg ? y(seg.y0) : null)) ?? baseline

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
              d: areaPath(all[index] as Point[], bottom(index), { curve }),
              mask: gradient ? `url(#${fadeId})` : undefined,
            }),
          ),
      ),
    )

  const lines = options.data.series.map((s, index) => {
    if (!visible(s)) return null
    const pts = all[index] as Point[]
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
            h('circle', {
              key: cx,
              class: 'tc-point',
              cx: round(cx),
              cy: round(cy),
              r: pointRadius,
            }),
          ),
        ),
    )
  })

  return [
    h('defs', null, layout.clip.def, gradient && fadeMask(fadeId)),
    layout.background,
    h('g', { class: 'tc-series-list', 'clip-path': layout.clip.url }, areas, lines),
    layout.foreground,
  ]
}

/**
 * A vertical luminance mask shared by all gradient areas. Areas keep their
 * series color from CSS; the mask only fades them, with stop opacities read
 * from `--tc-area-gradient-start` / `--tc-area-gradient-end`.
 */
function fadeMask(id: string) {
  return h(
    'mask',
    { id, maskContentUnits: 'objectBoundingBox' },
    h(
      'linearGradient',
      { id: `${id}-gradient`, x1: 0, y1: 0, x2: 0, y2: 1 },
      h('stop', { class: 'tc-fade-start', offset: 0 }),
      h('stop', { class: 'tc-fade-end', offset: 1 }),
    ),
    h('rect', { width: 1, height: 1, fill: `url(#${id}-gradient)` }),
  )
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
  render: (options, ctx) => renderLines(options, ctx, false),
  legend: (options) => seriesLegend(options.data),
  table: (options, ctx) => seriesTable(options, ctx),
}
