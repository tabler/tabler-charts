/**
 * Value labels: the value written on each mark, for charts read at a
 * glance. They are worked out from the chart's interaction, so every type
 * gets them the same way: bars at their end (inside when there is no room
 * outside), stacked segments and heatmap cells in their middle, lines and
 * points above their point (the last one by default), slices in their
 * middle with their share. A label that does not fit its mark or the plot,
 * or that would cover another one, is left out: labels never overlap.
 */
import type { ChartConfig, RenderContext } from '../chart.ts'
import type { PostStep } from '../features.ts'
import { formatNumber, getNumberFormat, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import { estimateTextWidth, type Rect, round } from '../layout.ts'
import { h, type VNode } from '../vnode.ts'

export interface ValueLabelOptions {
  /** Format of the values. Defaults to the value axis format (slices: their share in percent). */
  format?: NumberFormat
  /** Which points of lines, areas and scatters get a label. Defaults to `'last'`. */
  points?: 'last' | 'all'
}

/** Space between a mark and its label, and around labels. */
const GAP = 4

interface Placed {
  key: string
  text: string
  x: number
  y: number
  inside: boolean
  box: Rect
}

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

const contains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x - 1 &&
  inner.y >= outer.y - 1 &&
  inner.x + inner.width <= outer.x + outer.width + 1 &&
  inner.y + inner.height <= outer.y + outer.height + 1

/** The labels layer of a chart, or `null` when nothing gets one. */
export function valueLabels(
  config: ChartConfig<object>,
  interaction: Interaction,
  ctx: RenderContext,
): VNode | null {
  const option = config.valueLabels
  const options: ValueLabelOptions = typeof option === 'object' ? option : {}
  const { fontSize, locale } = ctx
  const type = config.type.name
  const pie = type === 'pie' || type === 'donut'
  const stacked = !!(config as { stacked?: unknown }).stacked
  const format = options.format
    ? formatNumber(options.format, locale)
    : pie
      ? (v: number) =>
          getNumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(v)
      : type === 'heatmap'
        ? formatNumber((config as { format?: NumberFormat }).format, locale)
        : type === 'scatter'
          ? formatNumber((config as { y?: { format?: NumberFormat } }).y?.format, locale)
          : undefined
  // Numbers have no descenders: one em is their height, with room to spare.
  const height = fontSize

  // Candidates in order of priority: every hit's items, and for points only the
  // last one of each series unless all are asked for.
  const items: [string, HitItem, Hit][] = []
  const last = new Map<number, number>()
  let total = 0
  for (let i = 0; i < interaction.count; i++) {
    const hit = interaction.hitIndex(i)
    for (const item of hit?.items ?? []) {
      if (item.value === null || item.y === null || !hit) continue
      total += Math.abs(item.value)
      if (!pie && !item.box && options.points !== 'all') last.set(item.seriesIndex, items.length)
      items.push([`${i}-${item.seriesIndex}`, item, hit])
    }
  }

  // Marks a label must not cover: every bar and cell but its own.
  const marks = items.flatMap(([, item]) => (item.box ? [item.box] : []))
  const placed: Placed[] = []
  items.forEach(([key, item, hit], n) => {
    const { area } = hit
    if (!pie && !item.box && options.points !== 'all' && last.get(item.seriesIndex) !== n) return
    const value = item.value as number
    const share = value / (total || 1)
    const text = format ? format(pie ? share : value) : item.text
    const width = estimateTextWidth(text, fontSize)
    const at = (x: number, y: number, inside: boolean): Placed => {
      // A point's label at the plot's edge (the last point) moves in.
      if (!item.box && !pie) {
        x = Math.max(area.x + width / 2 + 2, Math.min(x, area.x + area.width - width / 2 - 2))
      }
      return {
        key,
        text,
        x,
        y,
        inside,
        box: { x: x - width / 2 - 2, y: y - height / 2, width: width + 4, height },
      }
    }
    const y = item.y as number
    const candidates: Placed[] = []
    const { box } = item
    if (pie) {
      candidates.push(at(item.x, y, true))
    } else if (box) {
      const horizontal = hit.axis === 'y'
      const down = value < 0
      if (!stacked && type !== 'heatmap') {
        // Beyond the bar's end, then just inside it.
        const reach = (horizontal ? width / 2 : height / 2) + GAP
        const sign = down ? 1 : -1
        const along = y + sign * reach
        candidates.push(
          horizontal ? at(item.x - sign * reach, y, false) : at(item.x, along, false),
          // A label wider than its bar may lean off a taller neighbour.
          ...(horizontal
            ? []
            : [
                at(box.x + width / 2 - 3, along, false),
                at(box.x + box.width - width / 2 + 3, along, false),
              ]),
          horizontal ? at(item.x + sign * reach, y, true) : at(item.x, y - sign * reach, true),
        )
      } else {
        candidates.push(at(box.x + box.width / 2, box.y + box.height / 2, true))
      }
    } else {
      // Above the point, below it, or beside it (the end of a line, at the plot's edge).
      const side = width / 2 + GAP + 4
      candidates.push(
        at(item.x, y - height / 2 - GAP - 2, false),
        at(item.x, y + height / 2 + GAP + 2, false),
        at(item.x - side, y, false),
        at(item.x + side, y, false),
      )
    }
    // Labels may rise into the margin above the plot, not over the axes.
    const room = { ...area, y: 0, height: area.y + area.height }
    // Glyphs leave a little room at their sides (`slim`): a label may brush a neighbour.
    const fits = (p: Placed, slim = { ...p.box, x: p.box.x + 5, width: p.box.width - 10 }) =>
      contains(pie ? area : room, p.box) &&
      (!p.inside || !box || contains(box, p.box)) &&
      (!pie || sliceFits(item, area, share, p.box)) &&
      !placed.some((other) => overlaps(other.box, p.box)) &&
      !marks.some((mark) => mark !== box && overlaps(mark, slim))
    const spot = candidates.find((p) => fits(p))
    if (spot) placed.push(spot)
  })

  if (!placed.length) return null
  return h(
    'g',
    { key: 'value-labels', class: 'tc-value-labels', 'aria-hidden': 'true' },
    placed.map((p) =>
      h(
        'text',
        {
          key: p.key,
          class: ['tc-value-label', p.inside && 'tc-value-label-inside'],
          style: `transform:translate(${round(p.x)}px,${round(p.y)}px)`,
          'text-anchor': 'middle',
          dy: '0.35em',
        },
        p.text,
      ),
    ),
  )
}

/**
 * Whether a label fits its slice: it sits at the slice's centroid, where the
 * slice is about its share of the circle wide and twice the distance to the
 * outer edge deep.
 */
function sliceFits(item: HitItem, area: Rect, share: number, label: Rect): boolean {
  const outer = area.width / 2
  const radius = Math.hypot(item.x - area.x - outer, (item.y as number) - area.y - outer)
  const depth = 2 * (outer - radius)
  return label.width <= share * 2 * Math.PI * radius && label.height <= depth
}

/** The step that adds the labels over the content of charts with `valueLabels`. */
export const labelsStep: PostStep = (config, content, interaction, ctx) =>
  config.valueLabels && interaction ? [content, valueLabels(config, interaction, ctx)] : content
