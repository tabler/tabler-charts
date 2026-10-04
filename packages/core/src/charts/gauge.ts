import type { DataTable } from '../a11y.ts'
import type { ChartType, RenderContext } from '../chart.ts'
import { formatNumber, getNumberFormat, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import { type InsetsInput, innerRect, insets } from '../layout.ts'
import type { LegendItem } from '../legend.ts'
import { arcCentroid, arcPathStable } from '../shapes/arc.ts'
import { type ChildInput, type ClassValue, h } from '../vnode.ts'

/** One ring of a gauge. */
export interface GaugeRing {
  name: string
  /** Current value, clamped to `0…max`. */
  value: number
  /** Full-ring value of this ring; overrides `GaugeOptions.max`. */
  max?: number
  /** Stable identity for keyed updates and legend toggles. Defaults to `name`. */
  id?: string
  /** Custom color; overrides the palette slot via `--tc-series-color`. */
  color?: string
  /** Extra classes on the ring group. */
  class?: ClassValue
  /** Start hidden (toggle it back from the legend). */
  hidden?: boolean
}

export interface GaugeOptions {
  /** A single value, one ring, or concentric rings (outermost first). */
  data: number | GaugeRing | readonly GaugeRing[]
  /** Full-ring value. Defaults to `100`. */
  max?: number
  /** Where the arc starts, in degrees clockwise from 12 o'clock. Defaults to `0`. */
  startAngle?: number
  /** Degrees the full ring spans, `0…360`. Defaults to `360`; use e.g. `270` for a dial. */
  angle?: number
  /** Ring thickness in pixels. Defaults to `12`. */
  thickness?: number
  /** Space between rings in pixels. Defaults to `4`. */
  gap?: number
  /** Corner radius of the arcs. Defaults to half the thickness (round caps). */
  cornerRadius?: number
  /** Format of the values (tooltip, table). */
  format?: NumberFormat
  /**
   * Text in the middle: the first ring's share of `max` and its name by
   * default; `false` hides it, or give your own `value` / `label`.
   */
  center?: false | { value?: string; label?: string }
  /** Extra space around the gauge, in pixels. */
  padding?: InsetsInput
}

/** Space kept around the gauge for the hover halo. */
const HALO = 8
const DEG = Math.PI / 180
const HALF_PI = Math.PI / 2

interface Ring {
  data: GaugeRing
  index: number
  value: number
  max: number
  /** Slot among the visible rings, from the outside in. */
  position: number
}

const ringKey = (ring: GaugeRing): string => ring.id ?? ring.name

function ringsOf(options: GaugeOptions): GaugeRing[] {
  const { data } = options
  if (typeof data === 'number') return [{ name: '', value: data }]
  return Array.isArray(data) ? (data as GaugeRing[]) : [data as GaugeRing]
}

/** The visible rings with clamped values. */
function layoutRings(options: GaugeOptions, hidden: ReadonlySet<string>): Ring[] {
  const max = options.max ?? 100
  return ringsOf(options)
    .map((data, index) => ({ data, index, max: data.max ?? max }))
    .filter((ring) => !hidden.has(ringKey(ring.data)))
    .map((ring, position) => ({
      ...ring,
      position,
      value: Math.min(ring.max, Math.max(0, ring.data.value || 0)),
    }))
}

/**
 * Radius and center that fit the swept ring (plus the text in the middle)
 * into `area`: a dial or half ring is centered by its own outline, not by
 * the full circle it is cut from.
 */
function fitGauge(
  area: { x: number; y: number; width: number; height: number },
  start: number,
  sweep: number,
  textTop: number,
  textBottom: number,
): { outer: number; cx: number; cy: number } {
  // Points of the outline, in units of the outer radius: both ends of the arc
  // and every axis extreme it passes; the origin covers the inner edge.
  const unit: [number, number][] = [[0, 0]]
  const end = start + sweep
  unit.push([Math.sin(start), -Math.cos(start)], [Math.sin(end), -Math.cos(end)])
  for (let a = Math.ceil(start / HALF_PI) * HALF_PI; a <= end + 1e-9; a += HALF_PI) {
    unit.push([Math.sin(a), -Math.cos(a)])
  }
  let outer = Math.min(area.width, area.height) / 2
  let box = { x0: 0, y0: 0, x1: 0, y1: 0 }
  // The text does not scale with the radius, so converge in a few rounds.
  for (let i = 0; i < 4; i++) {
    box = { x0: 0, y0: textTop, x1: 0, y1: textBottom }
    for (const [x, y] of unit) {
      box.x0 = Math.min(box.x0, x * outer)
      box.x1 = Math.max(box.x1, x * outer)
      box.y0 = Math.min(box.y0, y * outer)
      box.y1 = Math.max(box.y1, y * outer)
    }
    const scale = Math.min(area.width / (box.x1 - box.x0), area.height / (box.y1 - box.y0))
    if (Math.abs(scale - 1) < 1e-3) break
    outer = Math.max(0, outer * scale)
  }
  return {
    outer,
    cx: area.x + (area.width - (box.x1 - box.x0)) / 2 - box.x0,
    cy: area.y + (area.height - (box.y1 - box.y0)) / 2 - box.y0,
  }
}

function renderGauge(options: GaugeOptions, ctx: RenderContext): ChildInput {
  const { width, height, locale } = ctx
  const thickness = Math.max(1, options.thickness ?? 12)
  const gap = Math.max(0, options.gap ?? 4)
  const cornerRadius = options.cornerRadius ?? thickness / 2
  const pad = insets(options.padding, 0)
  const area = innerRect(width, height, {
    top: pad.top + HALO,
    right: pad.right + HALO,
    bottom: pad.bottom + HALO,
    left: pad.left + HALO,
  })
  const start = (options.startAngle ?? 0) * DEG
  const sweep = Math.min(360, Math.max(0, options.angle ?? 360)) * DEG
  const rings = layoutRings(options, ctx.hidden)
  const center = options.center
  const first = rings[0]
  const showCenter = center !== false && first !== undefined
  const centerLabel = showCenter ? (center?.label ?? (first.data.name || undefined)) : undefined
  const { outer, cx, cy } = fitGauge(
    area,
    start,
    sweep,
    showCenter ? -1.4 * ctx.fontSize : 0,
    showCenter ? (centerLabel ? 2 : 0.7) * ctx.fontSize : 0,
  )
  const value = formatNumber(options.format, locale)
  const share = getNumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })

  const radii = (ring: Ring, grow = 0) => {
    const r1 = Math.max(0, outer - ring.position * (thickness + gap))
    return { innerRadius: Math.max(0, r1 - thickness - grow), outerRadius: r1 + grow }
  }
  const fraction = (ring: Ring) => (ring.max > 0 ? ring.value / ring.max : 0)
  const geometry = (ring: Ring, grow = 0) => ({
    ...radii(ring, grow),
    startAngle: start,
    endAngle: start + sweep * fraction(ring),
    cornerRadius,
  })

  const hitFor = (ring: Ring): Hit => {
    const [x, y] = arcCentroid(geometry(ring))
    const item: HitItem = {
      name: ring.data.name,
      seriesIndex: ring.index,
      value: ring.value,
      text: `${value(ring.value)} (${share.format(fraction(ring))})`,
      x: cx + x,
      y: cy + y,
    }
    if (ring.data.color) item.color = ring.data.color
    return {
      index: ring.position,
      label: ring.data.name,
      title: '',
      x: cx + x,
      area: { x: cx - outer, y: cy - outer, width: outer * 2, height: outer * 2 },
      items: [item],
      seriesIndex: ring.index,
      // The value arc, slightly enlarged.
      mark: { d: arcPathStable(geometry(ring, 2)), x: cx, y: cy },
    }
  }

  const interaction: Interaction = {
    count: rings.length,
    hitIndex: (position) => {
      const ring = rings[position]
      return ring ? hitFor(ring) : null
    },
    hitTest(px, py) {
      const r = Math.hypot(px - cx, py - cy)
      const ring = rings.find((ring) => {
        const { innerRadius, outerRadius } = radii(ring, 2)
        return r >= innerRadius && r <= outerRadius
      })
      return ring ? hitFor(ring) : null
    },
  }
  ctx.onHitTest(interaction)

  const groups = rings.map((ring) =>
    h(
      'g',
      {
        key: ringKey(ring.data),
        class: ['tc-series', `tc-series-${ring.index + 1}`, ring.data.class],
        'data-series': ring.data.name,
        style: { '--tc-series-color': ring.data.color },
      },
      h('path', {
        class: 'tc-gauge-track',
        d: arcPathStable({ ...geometry(ring), endAngle: start + sweep }),
      }),
      // Fixed path structure, so CSS can transition the arc between values.
      h('path', { class: 'tc-gauge-arc', d: arcPathStable(geometry(ring)) }),
    ),
  )

  const centerValue = showCenter ? (center?.value ?? share.format(fraction(first))) : ''

  return [
    // Rings sit in their own group: the entrance animation transforms it, not the translated parent.
    h(
      'g',
      { class: 'tc-gauge', style: `transform:translate(${cx}px,${cy}px)` },
      h('g', { class: 'tc-gauge-rings' }, groups),
    ),
    showCenter &&
      h(
        'g',
        { class: 'tc-gauge-center', 'aria-hidden': 'true' },
        h(
          'text',
          {
            class: 'tc-gauge-value',
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
            { class: 'tc-gauge-label', x: cx, y: cy, dy: '1.6em', 'text-anchor': 'middle' },
            centerLabel,
          ),
      ),
  ]
}

function gaugeLegend(options: GaugeOptions): LegendItem[] {
  return ringsOf(options).map((ring, index) => {
    const item: LegendItem = { key: ringKey(ring), name: ring.name, index }
    if (ring.color) item.color = ring.color
    if (ring.hidden) item.hidden = true
    return item
  })
}

function gaugeTable(options: GaugeOptions, ctx: RenderContext): DataTable {
  const value = formatNumber(options.format, ctx.locale)
  const share = getNumberFormat(ctx.locale, { style: 'percent', maximumFractionDigits: 1 })
  return {
    columns: ['', 'Value', 'Share'],
    rows: layoutRings(options, ctx.hidden).map((ring) => [
      ring.data.name,
      value(ring.value),
      share.format(ring.max > 0 ? ring.value / ring.max : 0),
    ]),
  }
}

/**
 * Gauge (radial bar): progress towards a maximum as an arc on a track, with
 * the share in the middle. Several rings nest from the outside in.
 *
 * ```ts
 * new Chart('#el', { type: gauge, data: 58 })
 * new Chart('#el', { type: gauge, data: { name: 'completed', value: 1392, max: 2400 } })
 * ```
 */
export const gauge: ChartType<GaugeOptions> = {
  name: 'gauge',
  render: renderGauge,
  legend: gaugeLegend,
  table: gaugeTable,
}
