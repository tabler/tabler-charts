import type { ChartType, RenderContext } from '../chart.ts'
import { areaPath, type Curve, linePath, type Point } from '../shapes/path.ts'
import { type ChildInput, h } from '../vnode.ts'
import { type CartesianOptions, cartesianLayout, type Series, seriesAttrs } from './cartesian.ts'

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
}

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
    area: fillOption = fill,
  } = options
  const overhang = points === 'none' ? 2 : pointRadius + 2
  const layout = cartesianLayout(options, ctx, { scale: 'point', zero: fillOption, overhang })
  const { x, y, labels } = layout
  const baseline = y(Math.min(Math.max(0, y.domain[0]), y.domain[1]))

  const series = options.data.series.map((s, index) => {
    const pts = seriesPoints(s, labels.length, (i) => x.at(i), y, connectNulls)
    const valid = pts.filter((p): p is readonly [number, number] => p != null)
    const dots = points === 'all' ? valid : points === 'last' ? valid.slice(-1) : []

    return h(
      'g',
      seriesAttrs(s, index),
      fillOption && h('path', { class: 'tc-area', d: areaPath(pts, baseline, { curve }) }),
      h('path', { class: 'tc-line', d: linePath(pts, { curve }) }),
      dots.length > 0 &&
        h(
          'g',
          { class: 'tc-points' },
          dots.map(([cx, cy]) =>
            h('circle', { key: cx, class: 'tc-point', cx, cy, r: pointRadius }),
          ),
        ),
    )
  })

  return [
    h('defs', null, layout.clip.def),
    layout.background,
    h('g', { class: 'tc-series-list', 'clip-path': layout.clip.url }, series),
    layout.foreground,
  ]
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
}
