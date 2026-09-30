import type { ChartType } from '../chart.ts'
import { barPath } from '../shapes/bar.ts'
import { h } from '../vnode.ts'
import {
  type CartesianOptions,
  cartesianLayout,
  categoryInteraction,
  seriesAttrs,
  seriesKey,
  seriesLegend,
  seriesTable,
} from './cartesian.ts'

export interface BarOptions extends CartesianOptions {
  /** Corner radius of the data end of each bar. Defaults to `4`. */
  radius?: number
  /** Maximum bar thickness in pixels; leftover band space stays empty. Defaults to `24`. */
  maxBarWidth?: number
  /** Gap between bars of the same category, in pixels. Defaults to `2`. */
  gap?: number
  /** Share of each category left empty between groups, `0…1`. Defaults to `0.3`. */
  groupPadding?: number
}

/**
 * Bar chart: vertical bars per category, one per series side by side,
 * growing from zero (negative values grow down).
 *
 * ```ts
 * new Chart('#el', {
 *   type: bar,
 *   data: { labels: ['Q1', 'Q2'], series: [{ name: '2025', values: [3, 5] }] },
 * })
 * ```
 */
export const bar: ChartType<BarOptions> = {
  name: 'bar',
  render(options, ctx) {
    const { radius = 4, maxBarWidth = 24, gap = 2, groupPadding = 0.3 } = options
    const layout = cartesianLayout(options, ctx, {
      scale: 'band',
      zero: true,
      paddingInner: groupPadding,
      paddingOuter: groupPadding / 2,
    })
    const { x, y, labels } = layout
    const { series } = options.data
    // Hidden series keep their color slot but give up their place in the group.
    const slots = new Map<number, number>()
    series.forEach((s, index) => {
      if (!ctx.hidden.has(seriesKey(s))) slots.set(index, slots.size)
    })
    const order = [...slots.keys()]
    const n = Math.max(1, slots.size)
    const baseline = y(Math.min(Math.max(0, y.domain[0]), y.domain[1]))

    const barWidth = Math.max(0, Math.min(maxBarWidth, (x.bandwidth - gap * (n - 1)) / n))
    const groupWidth = barWidth * n + gap * (n - 1)
    const offset = (x.bandwidth - groupWidth) / 2

    const barLeft = (seriesIndex: number, i: number) =>
      x.at(i) + offset + (slots.get(seriesIndex) ?? 0) * (barWidth + gap)

    ctx.onHitTest(
      categoryInteraction(
        layout,
        options,
        ctx,
        (seriesIndex, i, value) => ({ x: barLeft(seriesIndex, i) + barWidth / 2, y: y(value) }),
        (px, _, i) => {
          // The bar under the pointer, gaps included, so thin bars are easy to hit.
          const slot = Math.floor((px - (x.at(i) + offset) + gap / 2) / (barWidth + gap))
          const seriesIndex = order[slot]
          return seriesIndex !== undefined && series[seriesIndex]?.values[i] != null
            ? seriesIndex
            : undefined
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
            const value = s.values[i]
            if (value == null || !Number.isFinite(value)) return null
            const left = barLeft(index, i)
            return h('path', {
              key: label,
              class: ['tc-bar', value < 0 && 'tc-bar-negative'],
              d: barPath(left, barWidth, baseline, y(value), radius),
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
