import type { ChartType, RenderContext } from '../chart.ts'
import { axis, axisSize, bandTicks, thinTicks } from '../components/axis.ts'
import { formatNumber, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import { type InsetsInput, innerRect, insets } from '../layout.ts'
import { band } from '../scales/band.ts'
import { extent } from '../scales/extent.ts'
import { h } from '../vnode.ts'
import {
  type CartesianData,
  type Label,
  labelKey,
  resolveLabels,
  seriesKey,
  seriesTable,
} from './cartesian.ts'

export interface HeatmapOptions {
  /** Columns are the labels, rows are the series (first series on top). */
  data: CartesianData
  /** Value shown with the lightest shade. Defaults to the smaller of `0` and the data minimum. */
  min?: number
  /** Value shown with the full color. Defaults to the data maximum. */
  max?: number
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

/** Cell color at `share` (0…1) of the way from the empty shade to the full color. */
const shade = (share: number): string =>
  `color-mix(in oklab,var(--tc-heat-color,var(--tc-color-1)) ${round(share * 100)}%,var(--tc-heat-empty,var(--tc-grid-color)))`

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
  const rows = options.data.series
  const labels = resolveLabels(options.data)
  const formatLabel = options.x?.format ?? ((label: Label) => String(label))
  const value = formatNumber(options.format, locale)

  // Color domain.
  const all = rows.flatMap((s) => s.values)
  const [dataMin, dataMax] = extent(all) ?? [0, 1]
  const lo = options.min ?? Math.min(0, dataMin)
  const hi = options.max ?? dataMax
  const share = (v: number) => {
    const t = hi > lo ? (v - lo) / (hi - lo) : v > lo ? 1 : 0
    return FLOOR + (1 - FLOOR) * Math.min(1, Math.max(0, t))
  }

  // Margins for the labels, then one band per column and per row.
  const pad = insets(options.padding, 0)
  const showX = options.x?.show !== false && labels.length > 0
  const showY = options.y?.show !== false && rows.length > 0
  const rowTicks = rows.map((s, i) => ({ value: i, position: 0, label: s.name }))
  const left = showY ? axisSize('left', rowTicks, fontSize) : 0
  const bottom = showX ? axisSize('bottom', [{ value: 0, position: 0, label: 'M' }], fontSize) : 0
  const area = innerRect(width, height, {
    top: pad.top,
    right: pad.right,
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
      return {
        name: s.name,
        seriesIndex: r,
        value: v,
        text: v === null ? '–' : value(v),
        x: cellX(i) + cellW / 2,
        y: cellY(r) + cellH / 2,
        color: v === null ? 'var(--tc-grid-color)' : shade(share(v)),
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
      { key: seriesKey(s), class: 'tc-heatmap-row', 'data-series': s.name },
      labels.map((label, i) => {
        const v = valueAt(i, j)
        return h('rect', {
          key: labelKey(label),
          class: ['tc-cell', v === null && 'tc-cell-empty'],
          x: round(cellX(i)),
          y: round(cellY(j)),
          width: round(cellW),
          height: round(cellH),
          rx: round(Math.min(radius, cellW / 2, cellH / 2)),
          style: v === null ? undefined : `--tc-heat:${round(share(v) * 100)}%`,
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

/**
 * Heatmap: a grid of cells, one row per series and one column per label,
 * shaded from light to the full color by value (a single hue, so it reads
 * as magnitude). Set the hue with `--tc-heat-color`.
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
  render: renderHeatmap,
  table: (options, ctx, limit) => seriesTable(options, ctx, limit),
}
