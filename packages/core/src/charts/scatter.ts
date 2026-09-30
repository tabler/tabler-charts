import type { DataTable } from '../a11y.ts'
import type { ChartType, RenderContext } from '../chart.ts'
import { axis, axisSize, linearTicks, type Tick } from '../components/axis.ts'
import { grid } from '../components/grid.ts'
import { formatNumber } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import { estimateTextWidth, type InsetsInput, innerRect, insets, LINE_HEIGHT } from '../layout.ts'
import type { LegendItem } from '../legend.ts'
import { extent } from '../scales/extent.ts'
import { linear } from '../scales/linear.ts'
import { type ClassValue, h } from '../vnode.ts'
import { domainOf, type ValueAxisOptions } from './cartesian.ts'

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
  /** Custom color; overrides the palette slot via `--tc-series-color`. */
  color?: string
  /** Extra classes on the series group. */
  class?: ClassValue
  /** Start hidden (toggle it back from the legend). */
  hidden?: boolean
}

export interface ScatterOptions {
  data: { series: readonly ScatterSeries[] }
  /** Horizontal value axis. */
  x?: ValueAxisOptions
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

const seriesKey = (series: ScatterSeries): string => series.id ?? series.name
const round = (value: number): number => Math.round(value * 100) / 100

/** SVG path of a circle of radius `r` around the origin. */
const circlePath = (r: number): string => `M${r},0A${r},${r},0,1,1,${-r},0A${r},${r},0,1,1,${r},0Z`

function renderScatter(options: ScatterOptions, ctx: RenderContext) {
  const { width, height, fontSize, locale } = ctx
  const xOptions = options.x ?? {}
  const yOptions = options.y ?? {}
  const radius = options.radius ?? 4
  const visible = options.data.series.filter((s) => !ctx.hidden.has(seriesKey(s)))
  const points = visible.flatMap((s) => s.points)
  const sizes = points.map((p) => p.size).filter((v): v is number => v != null && v > 0)
  const maxSize = extent(sizes)?.[1] ?? 0
  const rMin = options.size?.min ?? 4
  const rMax = options.size?.max ?? 24
  // Area-proportional bubbles: the radius grows with the square root of the size.
  const bubble = (size: number | undefined) =>
    size != null && size > 0 && maxSize > 0
      ? rMin + (rMax - rMin) * Math.sqrt(size / maxSize)
      : radius
  const overhang = Math.max(radius, sizes.length ? rMax : 0) + 2

  const countY = yOptions.ticks ?? Math.max(2, Math.round(height / 60))
  const countX = xOptions.ticks ?? Math.max(2, Math.round(width / 80))
  const xDomain = domainOf(
    points.map((p) => p.x),
    xOptions,
    false,
    countX,
  )
  const yDomain = domainOf(
    points.map((p) => p.y),
    yOptions,
    false,
    countY,
  )

  const showX = xOptions.show !== false
  const showY = yOptions.show !== false
  const probeY = linearTicks(linear(yDomain, [1, 0]), {
    count: countY,
    format: yOptions.format,
    locale,
  })
  const probeX = linearTicks(linear(xDomain, [0, 1]), {
    count: countX,
    format: xOptions.format,
    locale,
  })
  const half = (tick: Tick | undefined) =>
    showX && tick ? Math.ceil(estimateTextWidth(tick.label, fontSize) / 2) : 0
  const pad = insets(options.padding)
  const margins = {
    top:
      pad.top + Math.max(showY ? Math.ceil((fontSize * LINE_HEIGHT) / 2) : 0, overhang, EDGE / 2),
    right: pad.right + Math.max(half(probeX[probeX.length - 1]), overhang, EDGE),
    bottom:
      pad.bottom + Math.max(showX ? axisSize('bottom', probeX, fontSize) : 0, overhang, EDGE / 2),
    left:
      pad.left +
      Math.max(showY ? axisSize('left', probeY, fontSize) : 0, half(probeX[0]), overhang),
  }
  const area = innerRect(width, height, margins)
  const x = linear(xDomain, [area.x, area.x + area.width])
  const y = linear(yDomain, [area.y + area.height, area.y])
  const xTicks = linearTicks(x, { count: countX, format: xOptions.format, locale })
  const yTicks = linearTicks(y, { count: countY, format: yOptions.format, locale })

  // Every visible point in pixels, sorted by x for fast nearest-point lookups.
  const placed: Placed[] = []
  options.data.series.forEach((series, seriesIndex) => {
    if (ctx.hidden.has(seriesKey(series))) return
    series.points.forEach((point, pointIndex) => {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return
      placed.push({
        seriesIndex,
        pointIndex,
        point,
        cx: x(point.x),
        cy: y(point.y),
        r: bubble(point.size),
      })
    })
  })
  placed.sort((a, b) => a.cx - b.cx)

  const fx = formatNumber(xOptions.format, locale)
  const fy = formatNumber(yOptions.format, locale)
  const fs = formatNumber(undefined, locale)
  const hitFor = (p: Placed, index: number): Hit => {
    const series = options.data.series[p.seriesIndex] as ScatterSeries
    const size = p.point.size != null ? ` · ${fs(p.point.size)}` : ''
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
      mark: { d: circlePath(round(p.r + 4)), x: p.cx, y: p.cy },
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
  ctx.onHitTest(interaction)

  const background = []
  if (yOptions.grid !== false) background.push(grid({ direction: 'y', ticks: yTicks, area }))
  if (xOptions.grid) background.push(grid({ direction: 'x', ticks: xTicks, area }))

  const clipId = `${ctx.id}-clip`
  const bleed = overhang + 1
  const groups = options.data.series.map(
    (series, seriesIndex) =>
      !ctx.hidden.has(seriesKey(series)) &&
      h(
        'g',
        {
          key: seriesKey(series),
          class: ['tc-series', `tc-series-${seriesIndex + 1}`, series.class],
          'data-series': series.name,
          style: series.color ? `--tc-series-color:${series.color}` : undefined,
        },
        series.points.map(
          (point, i) =>
            Number.isFinite(point.x) &&
            Number.isFinite(point.y) &&
            h('circle', {
              key: i,
              class: ['tc-point', point.size != null && 'tc-bubble'],
              cx: round(x(point.x)),
              cy: round(y(point.y)),
              r: round(bubble(point.size)),
            }),
        ),
      ),
  )

  return [
    h(
      'defs',
      null,
      h(
        'clipPath',
        { id: clipId },
        h('rect', {
          x: area.x - bleed,
          y: area.y - bleed,
          width: area.width + bleed * 2,
          height: area.height + bleed * 2,
        }),
      ),
    ),
    background,
    h('g', { class: 'tc-series-list', 'clip-path': `url(#${clipId})` }, groups),
    showY && axis({ position: 'left', ticks: yTicks, area }),
    showX && axis({ position: 'bottom', ticks: xTicks, area }),
  ]
}

function scatterLegend(options: ScatterOptions): LegendItem[] {
  return options.data.series.map((series, index) => {
    const item: LegendItem = { key: seriesKey(series), name: series.name, index }
    if (series.color) item.color = series.color
    if (series.hidden) item.hidden = true
    return item
  })
}

function scatterTable(
  options: ScatterOptions,
  ctx: RenderContext,
  limit: number = Number.POSITIVE_INFINITY,
): DataTable {
  const fx = formatNumber(options.x?.format, ctx.locale)
  const fy = formatNumber(options.y?.format, ctx.locale)
  const fs = formatNumber(undefined, ctx.locale)
  const series = options.data.series.filter((s) => !ctx.hidden.has(seriesKey(s)))
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
        ...(withSize ? [p.size == null ? '–' : fs(p.size)] : []),
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
  render: renderScatter,
  legend: scatterLegend,
  table: scatterTable,
}
