import type { ChartType } from '../chart.ts'
import { barPath } from '../shapes/bar.ts'
import { h } from '../vnode.ts'
import {
  type CartesianOptions,
  cartesianLayout,
  categoryInteraction,
  resolveLabels,
  seriesAttrs,
  seriesKey,
  seriesLegend,
  seriesTable,
} from './cartesian.ts'
import { type Segment, type StackMode, stackBounds, stackSeries } from './stack.ts'

export interface BarOptions extends CartesianOptions {
  /** Corner radius of the data end of each bar (or stack). Defaults to `4`. */
  radius?: number
  /** Maximum bar thickness in pixels; leftover band space stays empty. Defaults to `24`. */
  maxBarWidth?: number
  /** Gap between bars of a group, or between stacked segments, in pixels. Defaults to `2`. */
  gap?: number
  /** Share of each category left empty between groups, `0…1`. Defaults to `0.3`. */
  groupPadding?: number
  /**
   * Stack series in one bar per category instead of side by side; `'percent'`
   * shows each category as 100%. Negative values stack down from zero.
   */
  stacked?: StackMode
}

/**
 * Bar chart: vertical bars per category, grouped side by side or stacked,
 * growing from zero (negative values grow down).
 *
 * ```ts
 * new Chart('#el', {
 *   type: bar,
 *   data: { labels: ['Q1', 'Q2'], series: [{ name: '2025', values: [3, 5] }] },
 *   stacked: true,
 * })
 * ```
 */
export const bar: ChartType<BarOptions> = {
  name: 'bar',
  render(options, ctx) {
    const { radius = 4, maxBarWidth = 24, gap = 2, groupPadding = 0.3, stacked = false } = options
    const { series } = options.data
    const count = resolveLabels(options.data).length
    const stacks = stacked
      ? stackSeries(series, count, { percent: stacked === 'percent', hidden: ctx.hidden })
      : null

    const layout = cartesianLayout(options, ctx, {
      scale: 'band',
      zero: true,
      paddingInner: groupPadding,
      paddingOuter: groupPadding / 2,
      ...(stacks ? { values: stackBounds(stacks) } : {}),
      ...(stacked === 'percent' ? { tickFormat: { style: 'percent' } } : {}),
    })
    const { x, y, labels } = layout

    // Hidden series keep their color slot but give up their place in the group.
    const slots = new Map<number, number>()
    series.forEach((s, index) => {
      if (!ctx.hidden.has(seriesKey(s))) slots.set(index, slots.size)
    })
    const order = [...slots.keys()]
    const columns = stacks ? 1 : Math.max(1, slots.size)

    const barWidth = Math.max(
      0,
      Math.min(maxBarWidth, (x.bandwidth - (stacks ? 0 : gap * (columns - 1))) / columns),
    )
    const groupWidth = barWidth * columns + (stacks ? 0 : gap * (columns - 1))
    const offset = (x.bandwidth - groupWidth) / 2
    const barLeft = (seriesIndex: number, i: number) =>
      x.at(i) + offset + (stacks ? 0 : (slots.get(seriesIndex) ?? 0) * (barWidth + gap))

    /** Data extent of a bar: from zero to the value, or its stacked segment. */
    const segment = (seriesIndex: number, i: number): Segment | null => {
      if (stacks) return stacks[seriesIndex]?.[i] ?? null
      const v = series[seriesIndex]?.values[i]
      return v == null || !Number.isFinite(v) ? null : { y0: 0, y1: v }
    }

    // In a stack only the outermost segment of each sign gets rounded.
    const outer = labels.map((_, i) => {
      let up = -1
      let down = -1
      for (const index of order) {
        const seg = segment(index, i)
        if (!seg) continue
        if (seg.y1 > seg.y0) up = index
        else if (seg.y1 < seg.y0) down = index
      }
      return { up, down }
    })

    ctx.onHitTest(
      categoryInteraction(
        layout,
        options,
        ctx,
        (seriesIndex, i) => ({
          x: barLeft(seriesIndex, i) + barWidth / 2,
          y: y(segment(seriesIndex, i)?.y1 ?? 0),
        }),
        (px, py, i) => {
          if (stacks) {
            // The segment under the pointer, within the column (gaps included).
            const left = barLeft(0, i)
            if (px < left - gap / 2 || px > left + barWidth + gap / 2) return undefined
            return order.find((index) => {
              const seg = segment(index, i)
              if (!seg) return false
              const a = y(seg.y0)
              const b = y(seg.y1)
              return py >= Math.min(a, b) - gap / 2 && py <= Math.max(a, b) + gap / 2
            })
          }
          // The bar under the pointer, gaps included, so thin bars are easy to hit.
          const slot = Math.floor((px - (x.at(i) + offset) + gap / 2) / (barWidth + gap))
          const seriesIndex = order[slot]
          return seriesIndex !== undefined && segment(seriesIndex, i) ? seriesIndex : undefined
        },
      ),
    )

    const groups = series.map(
      (s, index) =>
        slots.has(index) &&
        h(
          'g',
          seriesAttrs(s, index),
          labels.map((label, i) => {
            const seg = segment(index, i)
            if (!seg) return null
            const negative = seg.y1 < seg.y0
            // Leave a surface-colored gap where this segment sits on another one.
            const inner = seg.y0 === 0 ? 0 : negative ? gap : -gap
            const rounded = !stacks || (negative ? outer[i]?.down : outer[i]?.up) === index
            return h('path', {
              key: label,
              class: ['tc-bar', negative && 'tc-bar-negative'],
              d: barPath(
                barLeft(index, i),
                barWidth,
                y(seg.y0) + inner,
                y(seg.y1),
                rounded ? radius : 0,
              ),
            })
          }),
        ),
    )

    return [
      h('defs', null, layout.clip.def),
      layout.background,
      h('g', { class: 'tc-series-list', 'clip-path': layout.clip.url }, groups),
      layout.foreground,
    ]
  },
  legend: (options) => seriesLegend(options.data),
  table: (options, ctx) => seriesTable(options, ctx),
}
