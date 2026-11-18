import type { ChartType, RenderContext } from '../chart.ts'
import { linearTicks } from '../components/axis.ts'
import { formatDetail, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import {
  estimateTextWidth,
  type InsetsInput,
  innerRect,
  insets,
  LINE_HEIGHT,
  round,
} from '../layout.ts'
import { linear } from '../scales/linear.ts'
import { type ChildInput, h } from '../vnode.ts'
import {
  type CartesianData,
  domainOf,
  type Label,
  labelKey,
  resolveLabels,
  seriesAttrs,
  seriesKey,
  seriesLegend,
  seriesTable,
  tickCount,
} from './cartesian.ts'
import { cleanData, cleanSeries } from './clean.ts'

/** Options for the radial value axis. */
export interface RadialAxisOptions {
  /** Render the value labels along the first spoke. Defaults to `true`. */
  show?: boolean
  /** Value at the center. Defaults to `0` (or the data minimum when it is negative). */
  min?: number
  /** Value at the outer ring. Defaults to the niced data maximum. */
  max?: number
  /** Extend the domain to round values. Defaults to `true`. */
  nice?: boolean
  /** Approximate number of rings. Defaults to one per ~40px of radius. */
  ticks?: number
  format?: NumberFormat
}

export interface RadarOptions {
  /** One spoke per label, one polygon per series. */
  data: CartesianData
  /** The radial value axis. */
  r?: RadialAxisOptions
  /** Format of the spoke labels (axis, tooltips and the table). */
  format?: (label: Label, index: number) => string
  /** Shape of the rings. Defaults to `'polygon'`. */
  grid?: 'polygon' | 'circle'
  /** Fill each polygon. Defaults to `true`. */
  fill?: boolean
  /** Draw a dot on every value. Defaults to `false`. */
  points?: boolean
  /** Dot radius in pixels. Defaults to `4`. */
  pointRadius?: number
  /**
   * Widest spoke label, in pixels: a longer one wraps at its spaces onto up
   * to three lines. Defaults to a quarter of the chart's width.
   */
  labelWidth?: number
  /** Extra space around the chart, in pixels. */
  padding?: InsetsInput
}

/** Space between the outer ring and the spoke labels. */
const LABEL_GAP = 8
/** Pixels around the outer ring that still count as hovering it. */
const HOVER_SLOP = 8

/** Smallest radius, as a share of the space, however long the labels. */
const MIN_RADIUS = 0.5
/** Most lines a wrapped spoke label takes. */
const MAX_LINES = 3

/** `text`, cut short with an ellipsis to fit `width` pixels. */
function truncate(text: string, width: number, fontSize: number): string {
  if (estimateTextWidth(text, fontSize) <= width) return text
  let end = text.length
  while (end > 0 && estimateTextWidth(`${text.slice(0, end)}…`, fontSize) > width) end--
  return end > 0 ? `${text.slice(0, end).trimEnd()}…` : ''
}

/**
 * `text` split at its spaces into lines no wider than `width` pixels (a word
 * wider than that gets a line of its own), at most `MAX_LINES` of them: what
 * is left joins the last line.
 */
function wrap(text: string, width: number, fontSize: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (!line || estimateTextWidth(next, fontSize) <= width) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  lines.push(line)
  if (lines.length > MAX_LINES)
    lines.splice(MAX_LINES - 1, lines.length, lines.slice(MAX_LINES - 1).join(' '))
  return lines
}

/** Text anchor of a spoke label on the side its spoke points to. */
const side = (sin: number): -1 | 0 | 1 => (sin > 0.1 ? 1 : sin < -0.1 ? -1 : 0)

/**
 * The largest radius at which every spoke label still fits in `area`:
 * labels sit beyond the outer ring, on the side their spoke points to.
 */
function fitRadius(
  area: { width: number; height: number },
  angles: readonly number[],
  labels: readonly (readonly string[])[],
  fontSize: number,
): number {
  let radius = Math.min(area.width, area.height) / 2
  angles.forEach((angle, i) => {
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)
    const lines = labels[i] ?? []
    const w = Math.max(0, ...lines.map((line) => estimateTextWidth(line, fontSize)))
    const height = blockHeight(lines.length, fontSize)
    const s = side(sin)
    // Horizontal: the label runs outwards from the spoke end (or is centered on it).
    const across = s === 0 ? w / 2 : w + LABEL_GAP
    if (Math.abs(sin) > 1e-6) radius = Math.min(radius, (area.width / 2 - across) / Math.abs(sin))
    // Vertical: the lines of text above the top spokes, below the bottom ones,
    // centered on the ones at the sides.
    if (Math.abs(cos) > 1e-6) {
      const along = (s === 0 ? height + LABEL_GAP : height / 2) / Math.abs(cos)
      radius = Math.min(radius, area.height / 2 / Math.abs(cos) - along)
    }
  })
  return Math.max(0, radius)
}

/** Height of `lines` lines of text, in pixels. */
const blockHeight = (lines: number, fontSize: number) =>
  fontSize * (1 + Math.max(0, lines - 1) * LINE_HEIGHT)

function renderRadar(options: RadarOptions, ctx: RenderContext): ChildInput {
  const { width, height, fontSize, locale } = ctx
  const axis = options.r ?? {}
  const { fill = true, points = false, pointRadius = 4 } = options
  const series = options.data.series
  const labels = resolveLabels(options.data)
  const n = labels.length
  const visible = series.filter((s) => !ctx.hidden.has(seriesKey(s)))
  const formatLabel = options.format ?? ((label: Label) => String(label))
  const formatValue = formatDetail(axis.format, locale)

  const pad = insets(options.padding)
  const area = innerRect(width, height, {
    top: pad.top + LABEL_GAP,
    right: pad.right + LABEL_GAP,
    bottom: pad.bottom + LABEL_GAP,
    left: pad.left + LABEL_GAP,
  })
  const cx = area.x + area.width / 2
  const cy = area.y + area.height / 2
  const angles = labels.map((_, i) => (i / Math.max(1, n)) * Math.PI * 2)
  const texts = labels.map((label, i) => formatLabel(label, i))
  // Long labels wrap onto a few lines, then the radius fits them, but never
  // shrinks below a share of the space: lines that still do not fit are cut
  // short (the tooltip and the table keep the labels whole).
  const labelWidth = options.labelWidth ?? area.width / 4
  const wrapped = texts.map((text) => wrap(text, labelWidth, fontSize))
  const radius = Math.max(
    fitRadius(area, angles, wrapped, fontSize),
    (Math.min(area.width, area.height) / 2) * MIN_RADIUS,
  )
  const shown = wrapped.map((lines, i) => {
    const sin = Math.sin(angles[i] as number)
    const room = side(sin) === 0 ? area.width : area.width / 2 - radius * Math.abs(sin) - LABEL_GAP
    return lines.map((line) => truncate(line, room, fontSize))
  })

  const count = tickCount(axis, Math.max(2, Math.round(radius / 40)))
  const values = visible.flatMap((s) => s.values)
  const domain = domainOf(values, axis, true, count)
  const scale = linear(domain, [0, radius], { clamp: true })
  const ticks = linearTicks(scale, { count, format: axis.format, locale })

  /** Point at `r` pixels from the center along spoke `i`. */
  const at = (i: number, r: number): [number, number] => [
    cx + r * Math.sin(angles[i] as number),
    cy - r * Math.cos(angles[i] as number),
  ]
  /** A closed path through one radius per spoke (the same commands for any values). */
  const polygon = (radii: readonly number[]) =>
    `${radii.map((r, i) => `${i ? 'L' : 'M'}${at(i, r).map(round).join(',')}`).join('')}Z`
  const ring = (r: number) =>
    options.grid === 'circle'
      ? `M${round(cx)},${round(cy - r)}A${round(r)},${round(r)},0,1,1,${round(cx)},${round(cy + r)}A${round(r)},${round(r)},0,1,1,${round(cx)},${round(cy - r)}Z`
      : polygon(labels.map(() => r))
  /** Pixel radius of a value; missing values sit at the center. */
  const radiusOf = (v: number | null | undefined) =>
    v != null && Number.isFinite(v) ? scale(v) : 0

  const hitAt = (index: number): Hit => {
    const items: HitItem[] = []
    series.forEach((s, seriesIndex) => {
      if (ctx.hidden.has(seriesKey(s))) return
      const raw = s.values[index]
      const value = raw != null && Number.isFinite(raw) ? raw : null
      const [x, y] = at(index, radiusOf(value))
      const item: HitItem = {
        name: s.name,
        seriesIndex,
        value,
        text: value === null ? '–' : formatValue(value),
        x,
        y: value === null ? null : y,
      }
      if (s.color) item.color = s.color
      items.push(item)
    })
    const [x2, y2] = at(index, radius)
    return {
      index,
      label: labelKey(labels[index] as Label),
      title: texts[index] as string,
      x: x2,
      area: { x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 },
      items,
      guide: { x1: cx, y1: cy, x2, y2 },
    }
  }

  const interaction: Interaction = {
    count: n,
    hitTest(px, py) {
      if (n === 0 || Math.hypot(px - cx, py - cy) > radius + HOVER_SLOP) return null
      // The nearest spoke by angle, clockwise from 12 o'clock.
      const angle = Math.atan2(px - cx, cy - py)
      const turn = (angle < 0 ? angle + Math.PI * 2 : angle) / (Math.PI * 2)
      return hitAt(Math.round(turn * n) % n)
    },
    hitIndex(index, seriesIndex) {
      if (index < 0 || index >= n) return null
      const hit = hitAt(index)
      if (seriesIndex !== undefined && hit.items.some((item) => item.seriesIndex === seriesIndex)) {
        hit.seriesIndex = seriesIndex
      }
      return hit
    },
  }
  ctx.onHitTest(interaction)

  const grid = h(
    'g',
    { key: 'grid', class: 'tc-radar-grid', 'aria-hidden': 'true' },
    ticks
      .filter((tick) => tick.position > 0)
      .map((tick) =>
        h('path', { key: tick.value, class: 'tc-radar-ring', d: ring(tick.position) }),
      ),
    labels.map((label, i) => {
      const [x2, y2] = at(i, radius)
      return h('line', {
        key: labelKey(label),
        class: 'tc-radar-spoke',
        x1: round(cx),
        y1: round(cy),
        x2: round(x2),
        y2: round(y2),
      })
    }),
  )

  const groups = series.map((s, index) => {
    if (ctx.hidden.has(seriesKey(s))) return null
    const d = polygon(labels.map((_, i) => radiusOf(s.values[i])))
    return h(
      'g',
      seriesAttrs(s, index),
      fill && h('path', { class: 'tc-area', d }),
      h('path', { class: 'tc-line', d }),
      points &&
        h(
          'g',
          { class: 'tc-points' },
          labels.map((label, i) => {
            const v = s.values[i]
            if (v == null || !Number.isFinite(v)) return null
            const [x, y] = at(i, scale(v))
            return h('circle', {
              key: labelKey(label),
              class: 'tc-point',
              cx: round(x),
              cy: round(y),
              r: pointRadius,
            })
          }),
        ),
    )
  })

  const spokeLabels = h(
    'g',
    { key: 'labels', class: 'tc-radar-labels', 'aria-hidden': 'true' },
    labels.map((label, i) => {
      const angle = angles[i] as number
      const s = side(Math.sin(angle))
      const cos = Math.cos(angle)
      const [x, y] = at(i, radius + LABEL_GAP)
      const [first = '', ...rest] = shown[i] ?? []
      // Above the top spokes, below the bottom ones, centered on the sides:
      // the first line moves up to leave room for the ones under it.
      const up = rest.length * LINE_HEIGHT
      const dy = s !== 0 ? `${round(0.35 - up / 2)}em` : cos > 0 ? `${round(-up)}em` : '0.71em'
      return h(
        'text',
        {
          key: labelKey(label),
          class: 'tc-tick-label tc-radar-label',
          x: round(x),
          y: round(y),
          'text-anchor': s > 0 ? 'start' : s < 0 ? 'end' : 'middle',
          dy,
        },
        first,
        rest.map((line, j) => h('tspan', { key: j, x: round(x), dy: `${LINE_HEIGHT}em` }, line)),
      )
    }),
  )

  const valueLabels =
    axis.show !== false &&
    h(
      'g',
      { key: 'values', class: 'tc-radar-values', 'aria-hidden': 'true' },
      ticks
        .filter((tick) => tick.position > 0)
        .map((tick) =>
          h(
            'text',
            {
              key: tick.value,
              class: 'tc-tick-label tc-radar-value',
              x: round(cx + 4),
              y: round(cy - tick.position),
              dy: '0.35em',
            },
            tick.label,
          ),
        ),
    )

  return [
    grid,
    // Series grow from the center: the transform origin is set here, in pixels.
    h(
      'g',
      {
        key: 'series',
        class: 'tc-series-list tc-radar-series',
        style: `transform-origin:${round(cx)}px ${round(cy)}px`,
      },
      groups,
    ),
    spokeLabels,
    valueLabels,
  ]
}

/**
 * Radar (spider) chart: one spoke per label, the values of each series
 * joined into a polygon around the center. Good for comparing a few series
 * over the same handful of measures.
 *
 * ```ts
 * new Chart('#el', {
 *   type: radar,
 *   data: {
 *     labels: ['Speed', 'Range', 'Comfort', 'Price', 'Safety'],
 *     series: [{ name: 'Model A', values: [80, 60, 70, 40, 90] }],
 *   },
 * })
 * ```
 */
export const radar: ChartType<RadarOptions> = {
  name: 'radar',
  clean: cleanData(cleanSeries),
  render: renderRadar,
  legend: (options) => seriesLegend(options.data),
  table: (options, ctx, limit) =>
    seriesTable(
      {
        data: options.data,
        ...(options.r?.format ? { y: { format: options.r.format } } : {}),
        ...(options.format ? { x: { format: options.format } } : {}),
      },
      ctx,
      limit,
    ),
}
