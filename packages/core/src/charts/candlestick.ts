import type { ChartType } from '../chart.ts'
import type { Hit, Interaction } from '../interaction.ts'
import type { InsetsInput } from '../layout.ts'
import { h } from '../vnode.ts'
import type { Annotation } from './annotations.ts'
import {
  type CartesianData,
  type CartesianOptions,
  type CategoryAxisOptions,
  cartesianLayout,
  categoryInteraction,
  type Label,
  labelKey,
  plottable,
  seriesTable,
  type ValueAxisOptions,
} from './cartesian.ts'
import { cleanAxes, finite, label, records } from './clean.ts'

/** One period: where the price opened, its range and where it closed. */
export interface Candle {
  /** The period (a date for `x: { type: 'time' }`, or any label). */
  x: Label
  open: number
  high: number
  low: number
  close: number
}

/**
 * A rounded rectangle with the same commands whatever its size and radius
 * (a zero radius draws square corners), so CSS can morph one into another.
 */
const bodyPath = (x: number, y: number, w: number, h: number, r: number): string => {
  const a = `A${r},${r},0,0,1,`
  return `M${round(x + r)},${y}H${round(x + w - r)}${a}${round(x + w)},${round(y + r)}V${round(y + h - r)}${a}${round(x + w - r)},${round(y + h)}H${round(x + r)}${a}${x},${round(y + h - r)}V${round(y + r)}${a}${round(x + r)},${y}Z`
}

export interface CandlestickOptions {
  data: readonly Candle[]
  /** Maximum candle body width in pixels. Defaults to `16`. */
  maxCandleWidth?: number
  /** Share of each period left empty between candles, `0…1`. Defaults to `0.3`. */
  groupPadding?: number
  /** Extra space around the plot area, in pixels. */
  padding?: InsetsInput
  /** Corner radius of the bodies. Defaults to `1`. */
  radius?: number
  x?: CategoryAxisOptions
  y?: ValueAxisOptions
  /** Reference lines and bands, e.g. a price target or a trading halt. */
  annotations?: readonly Annotation[]
}

const round = (value: number): number => Math.round(value * 100) / 100

const UP = 'var(--tc-up-color,var(--tc-color-6))'
const DOWN = 'var(--tc-negative-color,var(--tc-color-8))'

/** Whether every price can be placed on the value axis (positive ones only on a log axis). */
const valid = (c: Candle, axis: ValueAxisOptions | undefined): boolean =>
  [c.open, c.high, c.low, c.close].every((v) => plottable(v, axis))

/** The candles as four series, for the shared axes, tooltip and table. */
function asCartesian(options: CandlestickOptions): CartesianOptions {
  const pick = (key: 'open' | 'high' | 'low' | 'close') =>
    options.data.map((c) => (valid(c, options.y) ? c[key] : null))
  const data: CartesianData = {
    labels: options.data.map((c) => c.x),
    series: [
      { name: 'Open', values: pick('open') },
      { name: 'High', values: pick('high') },
      { name: 'Low', values: pick('low') },
      { name: 'Close', values: pick('close') },
    ],
  }
  const out: CartesianOptions = { data }
  if (options.x) out.x = options.x
  if (options.y) out.y = options.y
  if (options.padding !== undefined) out.padding = options.padding
  if (options.annotations) out.annotations = options.annotations
  return out
}

/**
 * Candlestick (OHLC) chart: per period a wick from low to high and a body
 * from open to close, green when it closed higher (`--tc-up-color`) and red
 * when lower (`--tc-negative-color`).
 *
 * ```ts
 * new Chart('#el', {
 *   type: candlestick,
 *   data: [{ x: '2026-01-01', open: 98, high: 102, low: 89, close: 94 }],
 *   x: { type: 'time' },
 * })
 * ```
 */
export const candlestick: ChartType<CandlestickOptions> = {
  name: 'candlestick',
  clean: cleanAxes((data) =>
    records(data, (c) => ({
      ...c,
      x: label(c.x),
      open: finite(c.open),
      high: finite(c.high),
      low: finite(c.low),
      close: finite(c.close),
    })),
  ),
  render(options, ctx) {
    const { maxCandleWidth = 16, groupPadding = 0.3, radius = 1 } = options
    const cartesian = asCartesian(options)
    const layout = cartesianLayout(cartesian, ctx, {
      scale: 'band',
      zero: false,
      paddingInner: groupPadding,
      paddingOuter: groupPadding / 2,
    })
    const { x, y, labels } = layout
    const width = Math.max(1, Math.min(maxCandleWidth, x.bandwidth))
    const center = (i: number) => x.at(i) + x.bandwidth / 2
    const up = (c: Candle) => c.close >= c.open

    const base = categoryInteraction(layout, cartesian, ctx, (_, i, v) => ({
      x: center(i),
      y: y(v),
    }))
    // Tooltip swatches take the color of the candle, not four palette slots.
    const paint = (hit: Hit | null): Hit | null => {
      const candle = hit ? options.data[hit.index] : undefined
      if (!hit || !candle) return hit
      const color = up(candle) ? UP : DOWN
      return { ...hit, items: hit.items.map((item) => ({ ...item, color })) }
    }
    const interaction: Interaction = {
      count: base.count,
      hitIndex: (i, s) => paint(base.hitIndex(i, s)),
      hitTest: (px, py) => paint(base.hitTest(px, py)),
    }
    ctx.onHitTest(interaction)

    const candles = options.data.map((c, i) => {
      if (!valid(c, options.y)) return null
      const cx = round(center(i))
      const top = y(Math.max(c.open, c.close))
      // A flat period still shows a 1px body.
      const bottom = Math.max(y(Math.min(c.open, c.close)), top + 1)
      const left = round(center(i) - width / 2)
      const r = round(Math.min(radius, width / 2, (bottom - top) / 2))
      return h(
        'g',
        {
          key: labelKey(labels[i] as Label),
          class: ['tc-candle', up(c) ? 'tc-candle-up' : 'tc-candle-down'],
        },
        h('path', {
          class: 'tc-candle-wick',
          d: `M${cx},${round(y(c.high))}V${round(y(c.low))}`,
        }),
        // A path, not a rect, so it morphs between updates (d), in Safari too.
        h('path', {
          class: 'tc-candle-body',
          d: bodyPath(left, round(top), round(width), round(bottom - top), r),
        }),
      )
    })

    return [
      h('defs', { key: 'defs' }, layout.clip.def),
      layout.background,
      h(
        'g',
        { key: 'series', class: 'tc-series-list tc-candles', 'clip-path': layout.clip.url },
        candles,
      ),
      layout.foreground,
    ]
  },
  table: (options, ctx, limit) => seriesTable(asCartesian(options), ctx, limit),
}
