import { formatTicks, type Locale, type NumberFormat } from '../format.ts'
import { estimateTextWidth, LINE_HEIGHT, type Rect } from '../layout.ts'
import type { BandKey, BandScale } from '../scales/band.ts'
import type { LinearScale } from '../scales/linear.ts'
import { tickStep } from '../scales/ticks.ts'
import { h, type VNode } from '../vnode.ts'

export type AxisPosition = 'top' | 'right' | 'bottom' | 'left'

/** A single axis tick: its data value, pixel position along the axis and label. */
export interface Tick {
  value: number | BandKey
  position: number
  label: string
}

export interface LinearTicksOptions {
  /** Approximate number of ticks. Defaults to `5`. */
  count?: number
  format?: NumberFormat
  locale?: Locale
}

/** Ticks for a linear scale, labelled with a shared precision. */
export function linearTicks(scale: LinearScale, options: LinearTicksOptions = {}): Tick[] {
  const { count = 5, format, locale } = options
  const [d0, d1] = scale.domain
  const fmt = formatTicks(tickStep(d0, d1, count), format, locale)
  return scale.ticks(count).map((value) => ({ value, position: scale(value), label: fmt(value) }))
}

/** Ticks at the center of every band. */
export function bandTicks(
  scale: BandScale,
  format: (key: BandKey, index: number) => string = String,
): Tick[] {
  return scale.domain.map((key, i) => ({
    value: key,
    position: scale.at(i) + scale.bandwidth / 2,
    label: format(key, i),
  }))
}

/** Whether labels are laid out along x (horizontal axes). */
const isHorizontal = (position: AxisPosition): boolean =>
  position === 'top' || position === 'bottom'

/**
 * Keep every n-th tick (smallest n) so labels do not overlap along the axis.
 * The first tick is always kept.
 */
export function thinTicks(
  ticks: readonly Tick[],
  position: AxisPosition,
  fontSize: number,
  gap = 8,
): Tick[] {
  if (ticks.length < 2) return ticks.slice()
  const size = (tick: Tick) =>
    isHorizontal(position) ? estimateTextWidth(tick.label, fontSize) : fontSize * LINE_HEIGHT
  const sizes = ticks.map(size)
  for (let step = 1; step < ticks.length; step++) {
    let fits = true
    for (let i = step; i < ticks.length && fits; i += step) {
      const a = ticks[i - step] as Tick
      const b = ticks[i] as Tick
      const needed = ((sizes[i - step] as number) + (sizes[i] as number)) / 2 + gap
      fits = Math.abs(b.position - a.position) >= needed
    }
    if (fits) return ticks.filter((_, i) => i % step === 0)
  }
  return ticks.slice(0, 1)
}

export interface AxisOptions {
  position: AxisPosition
  ticks: readonly Tick[]
  /** Plot area the axis is attached to. */
  area: Rect
  /** Length of tick marks. Defaults to `0` (labels only). */
  tickSize?: number
  /** Distance between tick marks and labels. Defaults to `8`. */
  tickPadding?: number
  /** Draw the axis line along the plot edge. Defaults to `false`. */
  line?: boolean
}

/** Pixels an axis occupies perpendicular to the plot edge (for margins). */
export function axisSize(
  position: AxisPosition,
  ticks: readonly Tick[],
  fontSize: number,
  options: { tickSize?: number; tickPadding?: number } = {},
): number {
  const { tickSize = 0, tickPadding = 8 } = options
  if (ticks.length === 0) return 0
  const labels = isHorizontal(position)
    ? fontSize * LINE_HEIGHT
    : Math.max(...ticks.map((t) => estimateTextWidth(t.label, fontSize)))
  return Math.ceil(labels + tickSize + tickPadding)
}

/**
 * Render an axis as `<g class="tc-axis tc-axis-{x|y} tc-axis-{position}">`
 * with one `<g class="tc-tick">` per tick, keyed by value so ticks can
 * transition when the scale changes.
 */
export function axis(options: AxisOptions): VNode {
  const { position, ticks, area, tickSize = 0, tickPadding = 8, line = false } = options
  const horizontal = isHorizontal(position)
  const sign = position === 'top' || position === 'left' ? -1 : 1
  const offset = sign * (tickSize + tickPadding)

  // Edge of the plot the axis sits on.
  const edge =
    position === 'top'
      ? area.y
      : position === 'bottom'
        ? area.y + area.height
        : position === 'left'
          ? area.x
          : area.x + area.width

  const label = horizontal
    ? { y: offset, dy: position === 'top' ? '0em' : '0.71em', 'text-anchor': 'middle' }
    : { x: offset, dy: '0.32em', 'text-anchor': position === 'left' ? 'end' : 'start' }

  const tickLine = horizontal ? { y2: sign * tickSize } : { x2: sign * tickSize }

  return h(
    'g',
    {
      class: ['tc-axis', horizontal ? 'tc-axis-x' : 'tc-axis-y', `tc-axis-${position}`],
      'aria-hidden': 'true',
    },
    line &&
      h(
        'line',
        horizontal
          ? { class: 'tc-axis-line', x1: area.x, x2: area.x + area.width, y1: edge, y2: edge }
          : { class: 'tc-axis-line', x1: edge, x2: edge, y1: area.y, y2: area.y + area.height },
      ),
    ticks.map((tick) =>
      h(
        'g',
        {
          key: tick.value,
          class: 'tc-tick',
          transform: horizontal
            ? `translate(${round(tick.position)},${round(edge)})`
            : `translate(${round(edge)},${round(tick.position)})`,
        },
        tickSize > 0 && h('line', { class: 'tc-tick-line', ...tickLine }),
        h('text', { class: 'tc-tick-label', ...label }, tick.label),
      ),
    ),
  )
}

const round = (value: number): number => Math.round(value * 100) / 100
