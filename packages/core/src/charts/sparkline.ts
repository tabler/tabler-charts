import type { ChartType, RenderContext } from '../chart.ts'
import { fadeMask } from '../components/fade.ts'
import { formatNumber, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import { type InsetsInput, innerRect, insets, round } from '../layout.ts'
import { linear } from '../scales/linear.ts'
import { barPath } from '../shapes/bar.ts'
import { circlePath } from '../shapes/circle.ts'
import { areaPath, type Curve, linePath, type Point } from '../shapes/path.ts'
import { h } from '../vnode.ts'
import { domainOf, type Label, labelKey } from './cartesian.ts'
import { cleanData, label, numbers } from './clean.ts'

export interface SparklineOptions {
  /** The values; `null` leaves a gap. */
  data: readonly (number | null | undefined)[]
  /** Labels for the tooltip, one per value (e.g. dates). */
  labels?: readonly Label[]
  /** Name shown in the tooltip. Defaults to `'Value'`. */
  name?: string
  /**
   * `'line'` (default), `'area'`, `'bar'`, or `'tristate'`: only the sign
   * counts, as a full bar up (win), down (loss) or a tick on the middle (draw).
   */
  variant?: 'line' | 'area' | 'bar' | 'tristate'
  /** Interpolation for lines and areas. Defaults to `'monotone'`. */
  curve?: Curve
  /** Dot on the last value. Defaults to `'last'`. */
  point?: 'last' | 'none'
  /** Mark the minimum and maximum values. */
  markers?: 'minmax' | 'none'
  /** Dot radius in pixels. Defaults to `3`. */
  pointRadius?: number
  /** Include zero in the value range. Defaults to `true` for areas and bars, `false` for lines. */
  zero?: boolean
  /** Format of values in the tooltip. */
  format?: NumberFormat
  /** Extra space around the plot, in pixels. */
  padding?: InsetsInput
}

function renderSparkline(options: SparklineOptions, ctx: RenderContext) {
  const {
    variant = 'line',
    curve = 'monotone',
    point = 'last',
    markers = 'none',
    pointRadius = 3,
    name = 'Value',
  } = options
  const values = options.data.map((v) => (v == null || !Number.isFinite(v) ? null : v))
  // (No log option on sparklines, so finite is all that matters here.)
  const count = values.length
  const dots = point === 'last' || markers === 'minmax'
  // Room for the stroke and dots so nothing is clipped at the edges.
  const overhang = dots ? pointRadius + 2 : 2
  const pad = insets(options.padding, 0)
  const area = innerRect(ctx.width, ctx.height, {
    top: pad.top + overhang,
    right: pad.right + overhang,
    bottom: pad.bottom + overhang,
    left: pad.left + overhang,
  })
  const tristate = variant === 'tristate'
  const zero = options.zero ?? variant !== 'line'
  // Tristate bars span half the height each way, whatever the magnitude.
  const domain: [number, number] = tristate ? [-1, 1] : domainOf(values, { nice: false }, zero, 2)

  const bars = variant === 'bar' || tristate
  const gap = 1
  const slot = count > 0 ? area.width / count : 0
  const xAt = (i: number) =>
    bars
      ? area.x + slot * i + slot / 2
      : area.x + (count > 1 ? (area.width * i) / (count - 1) : area.width / 2)
  const y = linear(domain, [area.y + area.height, area.y])
  const baseline = y(Math.min(Math.max(0, domain[0]), domain[1]))
  const points: Point[] = values.map((v, i) => (v === null ? null : [xAt(i), y(v)]))

  const format = formatNumber(options.format, ctx.locale)
  const labelOf = (i: number) => {
    const label = options.labels?.[i]
    return label === undefined ? '' : String(label)
  }
  const hitFor = (i: number): Hit | null => {
    const value = values[i]
    if (value === undefined) return null
    const px = xAt(i)
    const item: HitItem = {
      name,
      seriesIndex: 0,
      value,
      text: value === null ? '–' : format(value),
      x: px,
      y: value === null ? null : y(value),
    }
    const hit: Hit = {
      index: i,
      label: labelKey(options.labels?.[i] ?? i + 1),
      title: labelOf(i),
      x: px,
      area,
      items: [item],
    }
    if (value !== null) hit.mark = { d: circlePath(pointRadius + 3), x: px, y: y(value) }
    return hit
  }
  const interaction: Interaction = {
    count,
    hitIndex: (i) => hitFor(i),
    hitTest(px, py) {
      if (count === 0 || py < area.y - overhang || py > area.y + area.height + overhang) return null
      const i = bars
        ? Math.floor((px - area.x) / slot)
        : Math.round(((px - area.x) / Math.max(1, area.width)) * (count - 1))
      return hitFor(Math.max(0, Math.min(count - 1, i)))
    },
  }
  ctx.onHitTest(interaction)

  const marks = []
  if (tristate) {
    const width = Math.max(1, slot - gap)
    marks.push(
      h('line', {
        class: 'tc-sparkline-zero',
        x1: area.x,
        x2: area.x + area.width,
        y1: round(baseline),
        y2: round(baseline),
      }),
    )
    values.forEach((v, i) => {
      if (v === null) return
      const sign = Math.sign(v)
      // A draw is a short tick centered on the middle line.
      const tick = Math.min(2, area.height / 2)
      const [from, to] =
        sign === 0 ? [baseline + tick / 2, baseline - tick / 2] : [baseline, y(sign)]
      marks.push(
        h('path', {
          key: i,
          class: [
            'tc-bar',
            sign < 0 && 'tc-bar-negative',
            sign < 0 ? 'tc-tristate-loss' : sign > 0 ? 'tc-tristate-win' : 'tc-tristate-draw',
          ],
          d: barPath(xAt(i) - width / 2, width, from, to, sign === 0 ? 0 : Math.min(2, width / 2)),
        }),
      )
    })
  } else if (bars) {
    const width = Math.max(1, slot - gap)
    values.forEach((v, i) => {
      if (v === null) return
      marks.push(
        h('path', {
          key: i,
          class: ['tc-bar', v < 0 && 'tc-bar-negative'],
          d: barPath(xAt(i) - width / 2, width, baseline, y(v), Math.min(2, width / 2)),
        }),
      )
    })
  } else {
    if (variant === 'area') {
      marks.push(
        h('path', {
          class: 'tc-area tc-area-gradient',
          d: areaPath(points, baseline, { curve }),
          mask: `url(#${ctx.id}-fade)`,
        }),
      )
    }
    marks.push(h('path', { class: 'tc-line', d: linePath(points, { curve }) }))
  }

  const dotAt = (i: number, cls: string) => {
    const v = values[i]
    return v == null
      ? null
      : h('circle', {
          key: `${cls}-${i}`,
          class: ['tc-point', cls],
          cx: round(xAt(i)),
          cy: round(y(v)),
          r: pointRadius,
        })
  }
  const extremes = []
  if (markers === 'minmax') {
    let min = -1
    let max = -1
    values.forEach((v, i) => {
      if (v === null) return
      if (min === -1 || v < (values[min] as number)) min = i
      if (max === -1 || v > (values[max] as number)) max = i
    })
    if (min !== -1) extremes.push(dotAt(min, 'tc-point-min'))
    if (max !== -1 && max !== min) extremes.push(dotAt(max, 'tc-point-max'))
  }
  let last = -1
  if (point === 'last') {
    for (let i = count - 1; i >= 0; i--) {
      if (values[i] !== null) {
        last = i
        break
      }
    }
  }

  return [
    variant === 'area' && h('defs', null, fadeMask(`${ctx.id}-fade`)),
    h(
      'g',
      { class: 'tc-series tc-series-1 tc-sparkline' },
      marks,
      extremes,
      last !== -1 && !bars && dotAt(last, 'tc-point-last'),
    ),
  ]
}

/**
 * Sparkline: a tiny line, area or bar chart without axes, for stat tiles.
 *
 * ```ts
 * new Chart('#el', { type: sparkline, data: [3, 5, 4, 7, 6], height: 40 })
 * ```
 */
export const sparkline: ChartType<SparklineOptions> = {
  name: 'sparkline',
  // The labels too: they come from outside like the values.
  clean: (options) => ({
    ...cleanData(numbers)(options),
    labels: Array.isArray(options.labels) ? options.labels.map(label) : undefined,
  }),
  render: renderSparkline,
  // Decorative by default: opt in with `keyboard: true`.
  keyboard: false,
}
