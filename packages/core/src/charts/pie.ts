import type { DataTable } from '../a11y.ts'
import type { ChartType, RenderContext } from '../chart.ts'
import { formatNumber, getNumberFormat, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import { type InsetsInput, innerRect, insets } from '../layout.ts'
import type { LegendItem } from '../legend.ts'
import { arcCentroid, arcPathStable, padAngleForGap } from '../shapes/arc.ts'
import { type ChildInput, type ClassValue, h } from '../vnode.ts'
import { cleanData, cleanItems } from './clean.ts'

/** One slice of a pie or donut. */
export interface PieSlice {
  name: string
  /** Non-negative value; negative values count as zero. */
  value: number
  /** Stable identity for keyed updates and legend toggles. Defaults to `name`. */
  id?: string
  /**
   * Custom color; overrides the palette slot via `--tc-series-color`.
   * Values that could inject CSS (`;`, quotes, `url()` …) are ignored, so colors from user data are safe.
   */
  color?: string
  /** Extra classes on the slice group. */
  class?: ClassValue
  /** Start hidden (toggle it back from the legend). */
  hidden?: boolean
}

export interface PieOptions {
  data: readonly PieSlice[]
  /** Hole size relative to the radius, `0…0.95`. Defaults to `0` (`0.62` for `donut`). */
  innerRadius?: number
  /** Gap between slices in pixels, drawn as surface. Defaults to `2`. */
  gap?: number
  /** Corner radius of the slices. Defaults to `0` (`4` for `donut`). */
  cornerRadius?: number
  /** Where the first slice starts, in degrees clockwise from 12 o'clock. Defaults to `0`. */
  startAngle?: number
  /** Format of the values (tooltip, table, donut total). */
  format?: NumberFormat
  /**
   * Text in the donut hole: the total by default; `false` hides it, or give
   * your own `value` / `label`.
   */
  center?: false | { value?: string; label?: string }
  /** Extra space around the pie, in pixels. */
  padding?: InsetsInput
}

/** Space kept around the pie for the hover halo. */
const HALO = 8
const DEG = Math.PI / 180

interface Slice {
  data: PieSlice
  index: number
  value: number
  startAngle: number
  endAngle: number
}

const sliceKey = (slice: PieSlice): string => slice.id ?? slice.name

/** Angles of the visible slices, clockwise from `startAngle`. */
function layoutSlices(
  options: PieOptions,
  hidden: ReadonlySet<string>,
): { slices: Slice[]; total: number } {
  const visible = options.data
    .map((data, index) => ({ data, index, value: Math.max(0, data.value || 0) }))
    .filter((slice) => !hidden.has(sliceKey(slice.data)))
  const total = visible.reduce((sum, slice) => sum + slice.value, 0)
  let angle = (options.startAngle ?? 0) * DEG
  const slices = visible.map((slice) => {
    const sweep = total > 0 ? (slice.value / total) * Math.PI * 2 : 0
    const out: Slice = { ...slice, startAngle: angle, endAngle: angle + sweep }
    angle += sweep
    return out
  })
  return { slices, total }
}

function renderPie(
  options: PieOptions,
  ctx: RenderContext,
  defaults: { inner: number; corner: number },
) {
  const { width, height, locale } = ctx
  const gap = options.gap ?? 2
  const area = innerRect(width, height, insets(options.padding, 0))
  const outer = Math.max(0, Math.min(area.width, area.height) / 2 - HALO)
  const ratio = Math.min(0.95, Math.max(0, options.innerRadius ?? defaults.inner))
  const inner = outer * ratio
  const cornerRadius = options.cornerRadius ?? defaults.corner
  const cx = area.x + area.width / 2
  const cy = area.y + area.height / 2
  const { slices, total } = layoutSlices(options, ctx.hidden)
  const drawn = slices.filter((slice) => slice.value > 0)
  // A single slice is a full ring: no gap to cut.
  // Rings get a pad angle, which keeps a constant gap width along the whole
  // edge. In a full pie every slice meets at the center, so a pad angle would
  // widen into a wedge: the gap is a surface-colored stroke instead.
  const strokeGap = inner === 0 && drawn.length > 1 ? gap : 0
  const padAngle = inner > 0 && drawn.length > 1 ? padAngleForGap(gap, inner, outer) : 0
  const value = formatNumber(options.format, locale)
  const share = getNumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })

  const geometry = (slice: Slice, r0 = inner, r1 = outer) => ({
    innerRadius: r0,
    outerRadius: r1,
    startAngle: slice.startAngle,
    endAngle: slice.endAngle,
    padAngle,
    cornerRadius,
  })

  const hitFor = (slice: Slice, position: number): Hit => {
    const [x, y] = arcCentroid(geometry(slice))
    const item: HitItem = {
      name: slice.data.name,
      seriesIndex: slice.index,
      value: slice.value,
      text: `${value(slice.value)} (${share.format(total > 0 ? slice.value / total : 0)})`,
      x: cx + x,
      y: cy + y,
    }
    if (slice.data.color) item.color = slice.data.color
    return {
      index: position,
      label: slice.data.name,
      title: '',
      x: cx + x,
      area: { x: cx - outer, y: cy - outer, width: outer * 2, height: outer * 2 },
      items: [item],
      seriesIndex: slice.index,
      // A thin halo just outside the slice.
      mark: {
        d: arcPathStable({ ...geometry(slice, outer + 2, outer + 6), cornerRadius: 2 }),
        x: cx,
        y: cy,
      },
    }
  }

  const interaction: Interaction = {
    count: drawn.length,
    hitIndex: (position) => {
      const slice = drawn[position]
      return slice ? hitFor(slice, position) : null
    },
    hitTest(px, py) {
      const dx = px - cx
      const dy = py - cy
      const r = Math.hypot(dx, dy)
      if (r < inner - 2 || r > outer + HALO) return null
      const start = (options.startAngle ?? 0) * DEG
      const turn = Math.PI * 2
      // Clockwise angle from 12 o'clock, normalized into [start, start + turn).
      let angle = Math.atan2(dx, -dy)
      angle = start + ((((angle - start) % turn) + turn) % turn)
      const position = drawn.findIndex((s) => angle >= s.startAngle && angle < s.endAngle)
      return position === -1 ? null : hitFor(drawn[position] as Slice, position)
    },
  }
  ctx.onHitTest(interaction)

  const groups = slices.map((slice) =>
    h(
      'g',
      {
        key: sliceKey(slice.data),
        class: ['tc-series', `tc-series-${slice.index + 1}`, slice.data.class],
        'data-series': slice.data.name,
        style: { '--tc-series-color': slice.data.color },
      },
      // Fixed path structure, so CSS can transition slices between data sets.
      slice.value > 0 && h('path', { class: 'tc-slice', d: arcPathStable(geometry(slice)) }),
    ),
  )

  const center = options.center
  const showCenter = inner > 0 && center !== false
  const centerValue = showCenter ? (center?.value ?? value(total)) : ''
  const centerLabel = showCenter ? center?.label : undefined

  return [
    h(
      'g',
      { class: 'tc-pie', style: `transform:translate(${cx}px,${cy}px)` },
      total === 0 &&
        h('path', {
          class: 'tc-pie-track',
          d: arcPathStable({
            innerRadius: inner,
            outerRadius: outer,
            startAngle: 0,
            endAngle: Math.PI * 2,
          }),
        }),
      h(
        'g',
        {
          class: 'tc-pie-slices',
          style: strokeGap > 0 ? `--tc-pie-gap:${strokeGap}px` : undefined,
        },
        groups,
      ),
    ),
    showCenter &&
      h(
        'g',
        { class: 'tc-pie-center', 'aria-hidden': 'true' },
        h(
          'text',
          {
            class: 'tc-pie-value',
            x: cx,
            y: cy,
            dy: centerLabel ? '0' : '0.35em',
            'text-anchor': 'middle',
          },
          centerValue,
        ),
        centerLabel &&
          h(
            'text',
            { class: 'tc-pie-label', x: cx, y: cy, dy: '1.6em', 'text-anchor': 'middle' },
            centerLabel,
          ),
      ),
  ]
}

function pieLegend(options: PieOptions): LegendItem[] {
  return options.data.map((slice, index) => {
    const item: LegendItem = { key: sliceKey(slice), name: slice.name, index }
    if (slice.color) item.color = slice.color
    if (slice.hidden) item.hidden = true
    return item
  })
}

function pieTable(options: PieOptions, ctx: RenderContext): DataTable {
  const { slices, total } = layoutSlices(options, ctx.hidden)
  const value = formatNumber(options.format, ctx.locale)
  const share = getNumberFormat(ctx.locale, { style: 'percent', maximumFractionDigits: 1 })
  return {
    columns: ['', 'Value', 'Share'],
    rows: slices.map((slice) => [
      slice.data.name,
      value(slice.value),
      share.format(total > 0 ? slice.value / total : 0),
    ]),
  }
}

function pieType(name: string, defaults: { inner: number; corner: number }): ChartType<PieOptions> {
  return {
    name,
    clean: cleanData(cleanItems),
    render: (options, ctx): ChildInput => renderPie(options, ctx, defaults),
    legend: pieLegend,
    table: pieTable,
    valueLabels: { marks: 'slice' },
  }
}

/**
 * Pie chart: parts of a whole as slices, in data order, clockwise from the top.
 *
 * ```ts
 * new Chart('#el', { type: pie, data: [{ name: 'Direct', value: 42 }, { name: 'Search', value: 31 }] })
 * ```
 */
export const pie: ChartType<PieOptions> = pieType('pie', { inner: 0, corner: 0 })

/** Donut chart: a pie with a hole showing the total (or your own `center`). */
export const donut: ChartType<PieOptions> = pieType('donut', { inner: 0.62, corner: 4 })
