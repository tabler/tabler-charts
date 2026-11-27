/**
 * End labels: each line named at its end, with its last value, in a column
 * past the edge of the plot. Labels of lines that end close together are
 * moved apart, and a thin line in the series color joins a moved label to
 * its point, so a chart reads without its legend.
 */
import type { RenderContext } from '../chart.ts'
import { formatDetail, formatNumber, type NumberFormat } from '../format.ts'
import { estimateTextWidth, insets, LINE_HEIGHT, type Rect, round } from '../layout.ts'
import type { Point } from '../shapes/path.ts'
import { h, type VNode } from '../vnode.ts'
import { type CartesianOptions, plottable, seriesAxes, seriesKey } from './cartesian.ts'

export interface EndLabelOptions {
  /** Format of the values. Defaults to the format of the series' value axis. */
  format?: NumberFormat
  /** Write the last value after the name. Defaults to `true`. */
  value?: boolean
}

/** The text of one label: the series (by index), its name and its last value. */
export interface EndLabelText {
  index: number
  key: string
  name: string
  value: string
  /** The series' own color, if it has one. */
  color?: string
}

/** Space between a point and its label (the joining line runs through it), and between name and value. */
const LEAD = 14
const GAP = 6

/** The labels of a chart: one per visible series that has a value. */
function endLabelTexts(
  options: CartesianOptions & { endLabels?: boolean | EndLabelOptions },
  ctx: RenderContext,
): EndLabelText[] {
  const own: EndLabelOptions = typeof options.endLabels === 'object' ? options.endLabels : {}
  const axisOf = seriesAxes(options)
  return options.data.series.flatMap((series, index) => {
    const { axis } = axisOf(series)
    const last = series.values.filter((v) => plottable(v, axis)).pop()
    if (last == null || ctx.hidden.has(seriesKey(series))) return []
    const format = own.format
      ? formatNumber(own.format, ctx.locale)
      : formatDetail(axis.format, ctx.locale)
    return {
      index,
      key: seriesKey(series),
      name: series.name,
      value: own.value === false ? '' : format(last),
      color: series.color,
    }
  })
}

const width = (label: EndLabelText, fontSize: number): number => {
  // The value is set in a heavier weight: a little wider than estimated.
  const value = label.value ? GAP + estimateTextWidth(label.value, fontSize) * 1.06 : 0
  return estimateTextWidth(label.name, fontSize) + value
}

/** Width the labels need beside the plot, in pixels (0 without labels). */
const endLabelRoom = (labels: readonly EndLabelText[], fontSize: number): number =>
  labels.length ? Math.ceil(LEAD + Math.max(...labels.map((label) => width(label, fontSize)))) : 0

/**
 * The labels layer: every label beside the `point` its line ends at, on the
 * left of the plot when the lines run that way (`left`). `overhang` is what
 * the marks take beyond the plot's edge.
 */
function endLabelLayer(
  labels: readonly (EndLabelText & { point: readonly [number, number] | null })[],
  area: Rect,
  left: boolean,
  fontSize: number,
  overhang: number,
): VNode | null {
  const step = Math.ceil(fontSize * LINE_HEIGHT)
  const placed = labels
    .flatMap((label) => (label.point ? { ...label, point: label.point, y: label.point[1] } : []))
    .sort((a, b) => a.point[1] - b.point[1])
  if (!placed.length) return null
  // Top to bottom, each a line below the one before; then back up from the bottom of the plot.
  let floor = area.y
  for (const label of placed) {
    label.y = Math.max(label.y, floor)
    floor = label.y + step
  }
  let ceiling = Math.max(area.y + area.height, (placed[0]?.y ?? 0) + (placed.length - 1) * step)
  for (const label of placed.slice().reverse()) {
    label.y = Math.min(label.y, ceiling)
    ceiling = label.y - step
  }
  const sign = left ? -1 : 1
  const edge = left ? area.x - overhang : area.x + area.width + overhang
  const at = edge + sign * LEAD
  return h(
    'g',
    { key: 'end-labels', class: 'tc-end-labels', 'aria-hidden': 'true' },
    placed.map((label) => {
      const [px, py] = label.point
      const moved = Math.abs(label.y - py) > 1
      return h(
        'g',
        {
          key: label.key,
          class: ['tc-end-label', 'tc-series', `tc-series-${label.index + 1}`],
          // A map, so values from data cannot inject CSS (see normalizeStyle).
          style: { '--tc-series-color': label.color },
        },
        // From past the point's dot to just before the text.
        moved &&
          h('path', {
            class: 'tc-end-label-line',
            d: `M${round(px + sign * (overhang + 2))},${round(py)}L${round(at - sign * 3)},${round(label.y)}`,
          }),
        h(
          'text',
          {
            class: 'tc-end-label-text',
            style: `transform:translate(${round(at)}px,${round(label.y)}px)`,
            'text-anchor': left ? 'end' : 'start',
            dy: '0.35em',
          },
          left
            ? [
                label.value && h('tspan', { class: 'tc-end-label-value' }, label.value),
                h('tspan', { dx: label.value ? GAP : undefined }, label.name),
              ]
            : [
                label.name,
                label.value && h('tspan', { class: 'tc-end-label-value', dx: GAP }, label.value),
              ],
        ),
      )
    }),
  )
}

type Options = CartesianOptions & { endLabels?: boolean | EndLabelOptions }

/**
 * The end labels of a line chart: its `options` with room for the labels
 * beside the plot (on the side the lines end at), and the `layer` that
 * draws them once the points of every series (`null` for gaps) and the plot
 * area are known. `overhang` is what the marks take beyond the plot's edge.
 */
export function endLabels<O extends Options>(
  options: O,
  ctx: RenderContext,
  overhang: number,
): { options: O; layer: (points: readonly (readonly Point[])[], area: Rect) => VNode | null } {
  const texts = endLabelTexts(options, ctx)
  const left = options.x?.reverse ?? ctx.rtl === true
  const side = left ? 'left' : 'right'
  const pad = insets(options.padding)
  return {
    options: {
      ...options,
      padding: { ...pad, [side]: pad[side] + endLabelRoom(texts, ctx.fontSize) },
    },
    layer: (points, area) =>
      endLabelLayer(
        texts.map((label) => ({
          ...label,
          point: (points[label.index] ?? []).filter((p) => p != null).pop() ?? null,
        })),
        area,
        left,
        ctx.fontSize,
        overhang,
      ),
  }
}
