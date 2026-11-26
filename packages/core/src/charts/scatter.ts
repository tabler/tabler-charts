import type { DataTable } from '../a11y.ts'
import type { ChartType, RenderContext } from '../chart.ts'
import { axis, axisSize, type Tick, thinTicks } from '../components/axis.ts'
import { grid } from '../components/grid.ts'
import { formatDetail, formatNumber } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import { estimateTextWidth, type InsetsInput, LINE_HEIGHT, plotFrame, round } from '../layout.ts'
import { extent } from '../scales/extent.ts'
import type { LinearScale } from '../scales/linear.ts'
import { circlePath } from '../shapes/circle.ts'
import { type ClassValue, h } from '../vnode.ts'
import {
  domainOf,
  markerShape,
  plotClip,
  plottable,
  tickCount,
  type ValueAxisOptions,
  valueScale,
  valueTicks,
} from './cartesian.ts'
import { cleanData, finite, isRecord, named, records, text } from './clean.ts'
import { groupAttrs, keyOf, legendItems } from './named.ts'

/** A point of a scatter or bubble chart. */
export interface ScatterPoint {
  x: number
  y: number
  /** Bubble size; the circle area is proportional to it. */
  size?: number
  /** Name shown in the tooltip and table (e.g. a country). */
  label?: string
}

export interface ScatterSeries {
  name: string
  points: readonly ScatterPoint[]
  /** Stable identity for keyed updates and legend toggles. Defaults to `name`. */
  id?: string
  /**
   * Custom color; overrides the palette slot via `--tc-series-color`.
   * Values that could inject CSS (`;`, quotes, `url()` …) are ignored, so colors from user data are safe.
   */
  color?: string
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

export interface ScatterOptions {
  data: { series: readonly ScatterSeries[] }
  /** Horizontal value axis; `reverse` runs it from the right (the default with `rtl`). */
  x?: ValueAxisOptions & { reverse?: boolean }
  /** Vertical value axis. */
  y?: ValueAxisOptions
  /** Radius of points without a size, in pixels. Defaults to `4`. */
  radius?: number
  /** Radius range for bubbles (points with `size`). Defaults to `{ min: 4, max: 24 }`. */
  size?: { min?: number; max?: number }
  /** Extra space around the plot area, in pixels. */
  padding?: InsetsInput
}

/** Pointer distance (in pixels, beyond the radius) that still hits a point. */
const HIT_RADIUS = 24
const EDGE = 8

interface Placed {
  seriesIndex: number
  pointIndex: number
  point: ScatterPoint
  cx: number
  cy: number
  r: number
}

/** A point's bubble size, or `undefined` when it has none (or an invalid one). */
const sizeOf = (p: ScatterPoint): number | undefined =>
  p.size != null && Number.isFinite(p.size) && p.size > 0 ? p.size : undefined

function renderScatter(options: ScatterOptions, ctx: RenderContext) {
  const { width, height, fontSize, locale } = ctx
  const xOptions = options.x ?? {}
  const yOptions = options.y ?? {}
  const radius = options.radius ?? 4
  const visible = options.data.series.filter((s) => !ctx.hidden.has(keyOf(s)))
  const points = visible.flatMap((s) => s.points)
  const sizes = points.map(sizeOf).filter((v): v is number => v !== undefined)
  const maxSize = extent(sizes)?.[1] ?? 0
  const rMin = options.size?.min ?? 4
  const rMax = options.size?.max ?? 24
  // Area-proportional bubbles: the radius grows with the square root of the size.
  const bubble = (size: number | undefined) =>
    size != null && size > 0 && maxSize > 0
      ? rMin + (rMax - rMin) * Math.sqrt(size / maxSize)
      : radius
  const overhang = Math.max(radius, sizes.length ? rMax : 0) + 2

  const countY = tickCount(yOptions, Math.max(2, Math.round(height / 60)))
  const countX = tickCount(xOptions, Math.max(2, Math.round(width / 80)))
  // Only points that can be plotted on both axes take part.
  const usable = (p: ScatterPoint) => plottable(p.x, xOptions) && plottable(p.y, yOptions)
  const shown = points.filter(usable)
  const xDomain = domainOf(
    shown.map((p) => p.x),
    xOptions,
    false,
    countX,
  )
  const yDomain = domainOf(
    shown.map((p) => p.y),
    yOptions,
    false,
    countY,
  )

  const showX = xOptions.show !== false
  const showY = yOptions.show !== false
  // Linear or logarithmic, as each axis asks (see valueScale).
  const ticksOf = (scale: LinearScale, axis: ValueAxisOptions, count: number) =>
    valueTicks(scale, axis, count, axis.format, locale)
  const probeY = ticksOf(valueScale(yDomain, [1, 0], yOptions), yOptions, countY)
  const probeX = ticksOf(valueScale(xDomain, [0, 1], xOptions), xOptions, countX)
  const half = (tick: Tick | undefined) =>
    showX && tick ? Math.ceil(estimateTextWidth(tick.label, fontSize) / 2) : 0
  const reverse = xOptions.reverse ?? ctx.rtl === true
  // The x tick on the start side of the plot, and the one on the end side.
  const near = reverse === (ctx.rtl === true) ? 0 : probeX.length - 1
  const { area, side, range } = plotFrame(ctx, options.padding, (pad) => ({
    top:
      pad.top + Math.max(showY ? Math.ceil((fontSize * LINE_HEIGHT) / 2) : 0, overhang, EDGE / 2),
    bottom:
      pad.bottom + Math.max(showX ? axisSize('bottom', probeX, fontSize) : 0, overhang, EDGE / 2),
    start:
      pad.start +
      Math.max(showY ? axisSize('left', probeY, fontSize) : 0, half(probeX[near]), overhang),
    end: pad.end + Math.max(half(probeX[probeX.length - 1 - near]), overhang, EDGE),
  }))
  const x = valueScale(xDomain, range(reverse), xOptions)
  const y = valueScale(yDomain, [area.y + area.height, area.y], yOptions)
  // Thinned like the ticks of the other charts: on a log axis they crowd at the end of each decade.
  const xTicks = thinTicks(ticksOf(x, xOptions, countX), 'bottom', fontSize)
  const yTicks = thinTicks(ticksOf(y, yOptions, countY), 'left', fontSize, 4)

  // Every visible point in pixels, sorted by x for fast nearest-point lookups.
  const placed: Placed[] = []
  options.data.series.forEach((series, seriesIndex) => {
    if (ctx.hidden.has(keyOf(series))) return
    series.points.forEach((point, pointIndex) => {
      if (!usable(point)) return
      placed.push({
        seriesIndex,
        pointIndex,
        point,
        cx: x(point.x),
        cy: y(point.y),
        r: bubble(sizeOf(point)),
      })
    })
  })
  placed.sort((a, b) => a.cx - b.cx)

  const fx = formatDetail(xOptions.format, locale)
  const fy = formatDetail(yOptions.format, locale)
  const fs = formatNumber(undefined, locale)
  const hitFor = (p: Placed, index: number): Hit => {
    const series = options.data.series[p.seriesIndex] as ScatterSeries
    const sz = sizeOf(p.point)
    const size = sz === undefined ? '' : ` · ${fs(sz)}`
    const item: HitItem = {
      name: series.name,
      seriesIndex: p.seriesIndex,
      value: p.point.y,
      text: `${fx(p.point.x)}, ${fy(p.point.y)}${size}`,
      x: p.cx,
      y: p.cy,
    }
    if (series.color) item.color = series.color
    return {
      index,
      label: p.point.label ?? series.name,
      title: p.point.label ?? '',
      x: p.cx,
      area,
      items: [item],
      seriesIndex: p.seriesIndex,
      highlight: { kind: 'halo', d: circlePath(round(p.r + 4)), x: p.cx, y: p.cy },
    }
  }

  const interaction: Interaction = {
    count: placed.length,
    hitIndex: (index) => {
      const p = placed[index]
      return p ? hitFor(p, index) : null
    },
    hitTest(px, py) {
      // Binary search the first point within reach on x, then scan the window.
      let lo = 0
      let hi = placed.length
      const reach = HIT_RADIUS + rMax
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if ((placed[mid] as Placed).cx < px - reach) lo = mid + 1
        else hi = mid
      }
      let best = -1
      let bestDistance = Number.POSITIVE_INFINITY
      for (let i = lo; i < placed.length; i++) {
        const p = placed[i] as Placed
        if (p.cx > px + reach) break
        const distance = Math.hypot(p.cx - px, p.cy - py) - p.r
        if (distance < bestDistance && distance <= HIT_RADIUS) {
          best = i
          bestDistance = distance
        }
      }
      return best === -1 ? null : hitFor(placed[best] as Placed, best)
    },
  }

  /** One path drawing a dot of `radius` at every point (two arcs each, or the series' shape). */
  const shape = markerShape(options)
  const dotsPath = (dots: readonly ScatterPoint[], slot: number) => {
    if (!dots.length) return null
    const r = round(radius)
    let d = ''
    for (const p of dots) {
      d += shape
        ? shape(slot, x(p.x), y(p.y), r)
        : `M${round(x(p.x) - radius)},${round(y(p.y))}a${r},${r},0,1,0,${2 * r},0a${r},${r},0,1,0,${-2 * r},0`
    }
    return h('path', { key: 'dots', class: ['tc-point tc-dots', shape && 'tc-marker'], d })
  }

  const background = []
  if (yOptions.grid !== false) background.push(grid({ direction: 'y', ticks: yTicks, area }))
  if (xOptions.grid) background.push(grid({ direction: 'x', ticks: xTicks, area }))

  // Dots may reach a little past the plot edges; bubbles are cut at them (like
  // Chart.js), as a big one there would cover the axis labels.
  const clip = plotClip(ctx, area, sizes.length ? 0 : overhang)
  const groups = options.data.series.map(
    (series, seriesIndex) =>
      !ctx.hidden.has(keyOf(series)) &&
      h(
        'g',
        groupAttrs(series, seriesIndex),
        // Plain points share one path per series: thousands of circles would
        // each cost the browser style and layout work. The path keeps its
        // commands while the point count does, so new data morphs. Bubbles
        // stay circles: each is see-through over the others.
        dotsPath(
          series.points.filter((p) => usable(p) && sizeOf(p) === undefined),
          seriesIndex,
        ),
        series.points.map(
          (point, i) =>
            usable(point) &&
            sizeOf(point) !== undefined &&
            h('circle', {
              key: i,
              class: 'tc-point tc-bubble',
              cx: round(x(point.x)),
              cy: round(y(point.y)),
              r: round(bubble(sizeOf(point))),
            }),
        ),
      ),
  )

  const content = [
    h('defs', null, clip.def),
    background,
    h('g', { key: 'series', class: 'tc-series-list', 'clip-path': clip.url }, groups),
    showY && axis({ position: side, ticks: yTicks, area }),
    showX && axis({ position: 'bottom', ticks: xTicks, area }),
  ]
  return { content, interaction }
}

function scatterTable(
  options: ScatterOptions,
  ctx: RenderContext,
  limit: number = Number.POSITIVE_INFINITY,
): DataTable {
  const fx = formatDetail(options.x?.format, ctx.locale)
  const fy = formatDetail(options.y?.format, ctx.locale)
  const fs = formatNumber(undefined, ctx.locale)
  const series = options.data.series.filter((s) => !ctx.hidden.has(keyOf(s)))
  const withSize = series.some((s) => s.points.some((p) => p.size != null))
  const withLabel = series.some((s) => s.points.some((p) => p.label != null))
  const total = series.reduce((sum, s) => sum + s.points.length, 0)
  let left = limit
  return {
    columns: ['', ...(withLabel ? ['Label'] : []), 'x', 'y', ...(withSize ? ['Size'] : [])],
    total,
    rows: series.flatMap((s) => {
      const take = s.points.slice(0, Math.max(0, left))
      left -= take.length
      return take.map((p) => [
        s.name,
        ...(withLabel ? [p.label ?? ''] : []),
        fx(p.x),
        fy(p.y),
        ...(withSize ? [sizeOf(p) === undefined ? '–' : fs(sizeOf(p) as number)] : []),
      ])
    }),
  }
}

/**
 * Scatter chart: points on two value axes; give points a `size` for a
 * bubble chart (area-proportional radii).
 *
 * ```ts
 * new Chart('#el', {
 *   type: scatter,
 *   data: { series: [{ name: 'Cities', points: [{ x: 12, y: 3.4 }, { x: 18, y: 5.1 }] }] },
 * })
 * ```
 */
export const scatter: ChartType<ScatterOptions> = {
  name: 'scatter',
  clean: cleanData((data) => ({
    ...(isRecord(data) ? data : {}),
    series: records(isRecord(data) && data.series, (s) => ({
      ...named(s),
      points: records(s.points, (p) => ({
        ...p,
        x: finite(p.x),
        y: finite(p.y),
        size: finite(p.size) ?? undefined,
        label: p.label == null ? undefined : text(p.label),
      })).filter((p) => p.x !== null && p.y !== null),
    })),
  })),
  render: renderScatter,
  legend: (options) => legendItems(options.data.series),
  table: scatterTable,
  valueLabels: { format: (options) => options.y?.format },
}
