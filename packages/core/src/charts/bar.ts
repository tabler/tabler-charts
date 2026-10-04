import type { ChartType } from '../chart.ts'
import { feature } from '../features.ts'
import { barPath, hbarPath } from '../shapes/bar.ts'
import type { Curve, Point } from '../shapes/path.ts'
import { h } from '../vnode.ts'
import {
  type CartesianLayoutOptions,
  type CartesianOptions,
  cartesianLayout,
  categoryInteraction,
  labelKey,
  plottable,
  resolveLabels,
  seriesAttrs,
  seriesKey,
  seriesLegend,
  seriesTable,
} from './cartesian.ts'
import { cleanData, cleanSeries } from './clean.ts'
import { horizontalLayout } from './horizontal.ts'
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
  /**
   * `'horizontal'` lays categories out along y with bars growing right
   * (left for negative values). The `x` / `y` options keep describing the
   * category / value axis. Defaults to `'vertical'`.
   */
  orientation?: 'vertical' | 'horizontal'
  /** Interpolation of series drawn as lines (`series.type`). Defaults to `'monotone'`. */
  curve?: Curve
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
  clean: cleanData(cleanSeries),
  render(options, ctx) {
    const {
      radius = 4,
      maxBarWidth = 24,
      gap = 2,
      groupPadding = 0.3,
      stacked = false,
      orientation = 'vertical',
      curve = 'monotone',
    } = options
    const horizontal = orientation === 'horizontal'
    const { series } = options.data
    const count = resolveLabels(options.data).length
    // Series drawn as lines sit on top of the bars and stay out of the stacks.
    const isLine = (index: number) => (series[index]?.type ?? 'bar') !== 'bar'
    const lineKeys = series.filter((_, index) => isLine(index)).map(seriesKey)
    const stackHidden = lineKeys.length ? new Set([...ctx.hidden, ...lineKeys]) : ctx.hidden
    const stacks = stacked
      ? stackSeries(series, count, { percent: stacked === 'percent', hidden: stackHidden })
      : null

    const layoutOptions: CartesianLayoutOptions = {
      scale: 'band',
      zero: true,
      paddingInner: groupPadding,
      paddingOuter: groupPadding / 2,
      ...(stacks
        ? {
            values: [
              ...stackBounds(stacks),
              ...series.flatMap((s, index) => (isLine(index) ? s.values : [])),
            ],
          }
        : {}),
      ...(stacked === 'percent' ? { tickFormat: { style: 'percent' } } : {}),
    }
    const layout = horizontal
      ? horizontalLayout(options, ctx, layoutOptions)
      : cartesianLayout(options, ctx, layoutOptions)
    const { x, y, labels } = layout

    // Hidden series keep their color slot but give up their place in the group.
    const slots = new Map<number, number>()
    series.forEach((s, index) => {
      if (!ctx.hidden.has(seriesKey(s)) && !isLine(index)) slots.set(index, slots.size)
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
      return plottable(v, options.y) ? { y0: 0, y1: v } : null
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
        (seriesIndex, i, v) => {
          const across = isLine(seriesIndex)
            ? x.at(i) + x.bandwidth / 2
            : barLeft(seriesIndex, i) + barWidth / 2
          const end = y(isLine(seriesIndex) ? v : (segment(seriesIndex, i)?.y1 ?? 0))
          return horizontal ? { x: end, y: across } : { x: across, y: end }
        },
        (px, py, i) => {
          // Pointer position across the categories and along the values.
          const across = horizontal ? py : px
          const along = horizontal ? px : py
          if (stacks) {
            // The segment under the pointer, within the column (gaps included).
            const left = barLeft(0, i)
            if (across < left - gap / 2 || across > left + barWidth + gap / 2) return undefined
            return order.find((index) => {
              const seg = segment(index, i)
              if (!seg) return false
              const a = y(seg.y0)
              const b = y(seg.y1)
              return along >= Math.min(a, b) - gap / 2 && along <= Math.max(a, b) + gap / 2
            })
          }
          // The bar under the pointer, gaps included, so thin bars are easy to hit.
          const slot = Math.floor((across - (x.at(i) + offset) + gap / 2) / (barWidth + gap))
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
            // Leave a surface-colored gap where this segment sits on another one;
            // positive values grow toward smaller y, but toward larger x.
            const away = (negative ? 1 : -1) * (horizontal ? -1 : 1)
            const inner = seg.y0 === 0 ? 0 : away * gap
            const rounded = !stacks || (negative ? outer[i]?.down : outer[i]?.up) === index
            const draw = horizontal ? hbarPath : barPath
            return h('path', {
              key: labelKey(label),
              class: ['tc-bar', negative && 'tc-bar-negative', horizontal && 'tc-bar-horizontal'],
              d: draw(
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

    // Lines through the band centers, drawn after (over) every bar. The path
    // generators come with the line module, so plain bar charts do not ship them.
    const paths = lineKeys.length ? feature('line') : null
    const baseline = y(Math.min(Math.max(0, y.domain[0]), y.domain[1]))
    const lines = series.map((s, index) => {
      if (!paths) return null
      if (!isLine(index) || ctx.hidden.has(seriesKey(s))) return null
      const points = labels.map((_, i): Point => {
        const v = s.values[i]
        if (!plottable(v, options.y)) return null
        const center = x.at(i) + x.bandwidth / 2
        return horizontal ? [y(v), center] : [center, y(v)]
      })
      // Areas need a vertical baseline; sideways they fall back to a line.
      const filled = s.type === 'area' && !horizontal
      return h(
        'g',
        seriesAttrs(s, index),
        filled && h('path', { class: 'tc-area', d: paths.areaPath(points, baseline, { curve }) }),
        h('path', { class: 'tc-line', d: paths.linePath(points, { curve }) }),
      )
    })

    return [
      h('defs', { key: 'defs' }, layout.clip.def),
      layout.background,
      // Layers are keyed: an annotation band or a grid that comes and goes must not
      // shift the series list onto another node (that would recreate every series).
      h(
        'g',
        { key: 'series', class: 'tc-series-list', 'clip-path': layout.clip.url },
        groups,
        lines,
      ),
      layout.foreground,
    ]
  },
  legend: (options) => seriesLegend(options.data),
  table: (options, ctx, limit) => seriesTable(options, ctx, limit),
}
