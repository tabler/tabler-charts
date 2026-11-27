/**
 * Slice labels: every slice of a pie or donut named beside the chart, with
 * its share, in a column on the side the slice is on. A thin line joins each
 * label to its slice; labels of neighboring slices are moved apart so none
 * overlap, and the pie gets smaller to leave them room.
 */
import { estimateTextWidth, LINE_HEIGHT, type Rect, round } from '../layout.ts'
import { h, type VNode } from '../vnode.ts'

export interface SliceLabelOptions {
  /** What follows the name: the slice's share of the whole (the default), its value, or nothing. */
  value?: 'share' | 'value' | false
}

/** One label: the slice (by key and color slot), its texts, and the angle of its middle. */
export interface SliceLabel {
  key: string
  index: number
  name: string
  /** Text after the name; empty for the name alone. */
  value: string
  /** Middle of the slice, in radians clockwise from 12 o'clock. */
  angle: number
  /** Size of the slice: when there is no room for every label, the smallest go first. */
  weight: number
}

/** How far past the slice a line bends, how far it then runs sideways, and the space before the text. */
const ELBOW = 12
const RUN = 12
const GAP = 6
/** How far into the slice a line starts. */
const INSIDE = 6
/** The smallest radius a pie is worth labelling at: below it the labels are left out. */
const MIN_RADIUS = 32
const SEPARATOR = ' — '

const textWidth = (label: SliceLabel, fontSize: number): number =>
  // The name is set in a heavier weight: a little wider than estimated.
  estimateTextWidth(label.name, fontSize) * 1.08 +
  (label.value ? estimateTextWidth(SEPARATOR + label.value, fontSize) : 0)

const onRight = (label: SliceLabel): boolean => Math.sin(label.angle) >= 0

/**
 * The slice labels of a pie drawn in `area`: the smaller area left for the
 * pie itself, and the `layer` that draws the labels once its center and
 * radius are known. `null` when the chart is too small to label.
 */
export function sliceLabels(
  labels: readonly SliceLabel[],
  area: Rect,
  fontSize: number,
): { area: Rect; layer: (cx: number, cy: number, radius: number) => VNode } | null {
  const step = Math.ceil(fontSize * LINE_HEIGHT)
  // A column holds a label per line of the chart's height: the smallest slices go without.
  const lines = Math.max(1, Math.floor(area.height / step))
  const sides = [false, true].map((right) =>
    labels
      .filter((label) => onRight(label) === right)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, lines),
  ) as [SliceLabel[], SliceLabel[]]
  const room = sides.map((side) =>
    side.length
      ? Math.ceil(ELBOW + RUN + GAP + Math.max(...side.map((label) => textWidth(label, fontSize))))
      : 0,
  ) as [number, number]
  const above = ELBOW + Math.ceil(step / 2)
  const inner: Rect = {
    x: area.x + room[0],
    y: area.y + above,
    width: area.width - room[0] - room[1],
    height: area.height - above * 2,
  }
  if (Math.min(inner.width, inner.height) / 2 < MIN_RADIUS) return null

  return {
    area: inner,
    layer: (cx, cy, radius) =>
      h(
        'g',
        { key: 'slice-labels', class: 'tc-slice-labels', 'aria-hidden': 'true' },
        sides.flatMap((side, s) => {
          const sign = s ? 1 : -1
          const placed = side
            .map((label) => ({ label, y: cy - Math.cos(label.angle) * (radius + ELBOW) }))
            .sort((a, b) => a.y - b.y)
          // Top to bottom, each a line below the one before; then back up from the bottom.
          let floor = area.y + step / 2
          for (const item of placed) {
            item.y = Math.max(item.y, floor)
            floor = item.y + step
          }
          let ceiling = area.y + area.height - step / 2
          for (const item of placed.slice().reverse()) {
            item.y = Math.min(item.y, ceiling)
            ceiling = item.y - step
          }
          const column = cx + sign * (radius + ELBOW + RUN)
          return placed.map(({ label, y }) => {
            const sin = Math.sin(label.angle)
            const cos = Math.cos(label.angle)
            const from = radius - INSIDE
            return h(
              'g',
              {
                key: label.key,
                class: ['tc-slice-label', 'tc-series', `tc-series-${label.index + 1}`],
              },
              // From inside the slice out to the label's line, then along it to the text.
              h('path', {
                class: 'tc-slice-label-line',
                d: `M${round(cx + sin * from)},${round(cy - cos * from)}L${round(cx + sin * (radius + ELBOW))},${round(y)}H${round(column)}`,
              }),
              h(
                'text',
                {
                  class: 'tc-slice-label-text',
                  style: `transform:translate(${round(column + sign * GAP)}px,${round(y)}px)`,
                  'text-anchor': s ? 'start' : 'end',
                  dy: '0.35em',
                },
                h('tspan', { class: 'tc-slice-label-name' }, label.name),
                label.value && SEPARATOR + label.value,
              ),
            )
          })
        }),
      ),
  }
}
