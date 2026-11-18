import type { DataTable } from '../a11y.ts'
import type { ChartType, RenderContext } from '../chart.ts'
import { formatNumber, getNumberFormat, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import { type InsetsInput, innerRect, insets, round } from '../layout.ts'
import { type ChildInput, type ClassValue, h } from '../vnode.ts'
import { cleanItems } from './clean.ts'
import { groupAttrs, keyOf } from './named.ts'
import { type Grouped, groupLegend, groupSlices } from './others.ts'

/** One segment of a percentage bar. */
export interface PercentageBarSegment {
  name: string
  /** Non-negative value; negative values count as zero. */
  value: number
  /** Stable identity for keyed updates and legend toggles. Defaults to `name`. */
  id?: string
  /**
   * Custom color; overrides the palette slot via `--tc-series-color`.
   * Values that could inject CSS (`;`, quotes, `url()` …) are ignored, so colors from user data are safe.
   */
  color?: string
  /** Extra classes on the segment group. */
  class?: ClassValue
  /** Start hidden (toggle it back from the legend). */
  hidden?: boolean
}

export interface PercentageBarOptions {
  data: readonly PercentageBarSegment[]
  /**
   * Order of the segments along the bar: as in the data (`'data'`, the
   * default) or the largest first (`'size'`). Colors follow the data either
   * way, and the segment of the rest always comes last.
   */
  order?: 'data' | 'size'
  /**
   * The most segments drawn, the one for the rest included: with more entries
   * than that, the largest `maxSlices - 1` keep a segment of their own and
   * the others share one, named by `othersLabel`, at the end of the bar.
   * Defaults to `9` (the eight palette colors and the rest); `0` never
   * groups.
   */
  maxSlices?: number
  /** Name of the segment that groups the rest. Defaults to `'Others'`. */
  othersLabel?: string
  /** Space between segments in pixels, drawn as surface. Defaults to `2`. */
  gap?: number
  /** Corner radius of the segments. Defaults to `4`. */
  radius?: number
  /** Format of the values (tooltip, table). */
  format?: NumberFormat
  /** Extra space around the bar, in pixels. */
  padding?: InsetsInput
}

/** Height of the chart when neither `height` nor `aspectRatio` is set: a strip. */
const HEIGHT = 16

type Segment = Grouped<PercentageBarSegment>

/** The segments of the data: nine at most by default, the one for the rest included. */
const group = (options: PercentageBarOptions): Segment[] =>
  groupSlices(options.data, options.maxSlices, options.othersLabel)

/** The visible segments in their order along the bar, and their sum. */
function segmentsOf(
  options: PercentageBarOptions,
  hidden: ReadonlySet<string>,
): { segments: Segment[]; total: number } {
  const count = options.data.length
  const segments = group(options).filter((segment) => !hidden.has(keyOf(segment.data)))
  if (options.order === 'size') {
    // (The rest stays last, whatever its size.)
    segments.sort(
      (a, b) =>
        Number(a.index >= count) - Number(b.index >= count) ||
        b.value - a.value ||
        a.index - b.index,
    )
  }
  return { segments, total: segments.reduce((sum, segment) => sum + segment.value, 0) }
}

function renderPercentageBar(options: PercentageBarOptions, ctx: RenderContext): ChildInput {
  const { width, height, locale } = ctx
  const gap = Math.max(0, options.gap ?? 2)
  const radius = Math.max(0, options.radius ?? 4)
  const area = innerRect(width, height, insets(options.padding, 0))
  const { segments, total } = segmentsOf(options, ctx.hidden)
  const drawn = segments.filter((segment) => segment.value > 0)

  // Every segment gives up half a gap on each side but the ends of the bar.
  let offset = area.x
  const boxes = drawn.map((segment, position) => {
    const length = (segment.value / total) * area.width
    const left = position === 0 ? 0 : gap / 2
    const right = position === drawn.length - 1 ? 0 : gap / 2
    const boxWidth = Math.max(0, length - left - right)
    const start = offset + left
    const box = {
      // Right to left, the bar starts from the right: every segment takes its mirror place.
      x: ctx.rtl ? area.x * 2 + area.width - start - boxWidth : start,
      y: area.y,
      width: boxWidth,
      height: area.height,
    }
    offset += length
    return box
  })

  const value = formatNumber(options.format, locale)
  const share = getNumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })
  const hitFor = (position: number): Hit => {
    const segment = drawn[position] as Segment
    const box = boxes[position] as (typeof boxes)[number]
    const x = box.x + box.width / 2
    const item: HitItem = {
      name: segment.data.name,
      seriesIndex: segment.index,
      value: segment.value,
      text: `${value(segment.value)} (${share.format(segment.value / total)})`,
      x,
      y: box.y + box.height / 2,
      box,
    }
    if (segment.data.color) item.color = segment.data.color
    const n = round
    return {
      index: position,
      label: segment.data.name,
      title: '',
      x,
      area,
      items: [item],
      seriesIndex: segment.index,
      // A ring just inside the hovered segment.
      mark: {
        d: `M${n(box.x + 1)},${n(box.y + 1)}h${n(box.width - 2)}v${n(box.height - 2)}h${n(2 - box.width)}Z`,
        x: 0,
        y: 0,
      },
    }
  }

  const interaction: Interaction = {
    count: drawn.length,
    reversed: ctx.rtl === true,
    hitIndex: (position) => (drawn[position] ? hitFor(position) : null),
    hitTest(px, py) {
      if (py < area.y || py > area.y + area.height) return null
      const position = boxes.findIndex(
        (box) => px >= box.x - gap / 2 && px <= box.x + box.width + gap / 2,
      )
      return position < 0 ? null : hitFor(position)
    },
  }
  ctx.onHitTest(interaction)

  return h(
    'g',
    { class: 'tc-percentage-bar' },
    // Empty: the track alone, so the chart keeps its place.
    drawn.length === 0 &&
      h('rect', {
        key: 'track',
        class: 'tc-percentage-bar-track',
        x: round(area.x),
        y: round(area.y),
        width: round(area.width),
        height: round(area.height),
        rx: round(Math.min(radius, area.width / 2, area.height / 2)),
      }),
    segments.map((segment) => {
      const box = boxes[drawn.indexOf(segment)]
      return h(
        'g',
        groupAttrs(segment.data, segment.index),
        box &&
          h('rect', {
            class: 'tc-segment',
            x: round(box.x),
            y: round(box.y),
            width: round(box.width),
            height: round(box.height),
            rx: round(Math.min(radius, box.width / 2, box.height / 2)),
          }),
      )
    }),
  )
}

function percentageBarTable(options: PercentageBarOptions, ctx: RenderContext): DataTable {
  const { segments, total } = segmentsOf(options, ctx.hidden)
  const value = formatNumber(options.format, ctx.locale)
  const share = getNumberFormat(ctx.locale, { style: 'percent', maximumFractionDigits: 1 })
  return {
    columns: ['', 'Value', 'Share'],
    rows: segments.map((segment) => [
      segment.data.name,
      value(segment.value),
      share.format(total > 0 ? segment.value / total : 0),
    ]),
  }
}

/**
 * Percentage bar: parts of a whole as segments of one horizontal bar, each as
 * wide as its share (a donut's ring unrolled, for a strip under a number).
 * The chart is a strip 16 pixels tall unless `height` or `aspectRatio` is set.
 *
 * ```ts
 * new Chart('#el', {
 *   type: percentageBar,
 *   data: [{ name: 'Paid', value: 62 }, { name: 'Open', value: 27 }, { name: 'Overdue', value: 11 }],
 * })
 * ```
 */
export const percentageBar: ChartType<PercentageBarOptions> = {
  name: 'percentage-bar',
  // (The options come with the whole config: its size is defaulted here.)
  clean: (options) => {
    const config = options as PercentageBarOptions & { height?: unknown; aspectRatio?: unknown }
    return {
      ...config,
      data: cleanItems(config.data),
      height: config.height ?? (config.aspectRatio ? undefined : HEIGHT),
    }
  },
  render: renderPercentageBar,
  legend: (options) => groupLegend(group(options)),
  table: percentageBarTable,
  valueLabels: { marks: 'cell' },
}
