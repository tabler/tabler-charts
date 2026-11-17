import type { DataTable } from '../a11y.ts'
import type { ChartType, RenderContext } from '../chart.ts'
import { formatNumber, getNumberFormat, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import { estimateTextWidth, type InsetsInput, innerRect, insets, round } from '../layout.ts'
import { type ChildInput, type ClassValue, h } from '../vnode.ts'
import { cleanData, finite, named, records } from './clean.ts'
import { fit } from './fit.ts'
import { keyOf } from './named.ts'

/** One stage of a funnel. */
export interface FunnelStage {
  name: string
  /** How many reached the stage. Stages without a number, or with a negative one, are left out. */
  value: number
  /** Stable identity for keyed updates. Defaults to `name`. */
  id?: string
  /**
   * Custom color, drawn as it is instead of the stage's shade of `--tc-funnel-color`.
   * Values that could inject CSS (`;`, quotes, `url()` …) are ignored, so colors from user data are safe.
   */
  color?: string
  /** Extra classes on the stage's shape. */
  class?: ClassValue
}

export interface FunnelOptions {
  /** Stages in the order of the process; they are drawn as they come, not sorted. */
  data: readonly FunnelStage[]
  /** Name, value and share of the first stage written above every stage. Defaults to `true`. */
  labels?: boolean
  /** Radius of the top corners of the stages. Defaults to `4`. */
  radius?: number
  /** Format of the values (labels, tooltip, table). */
  format?: NumberFormat
  /** Extra space around the chart, in pixels. */
  padding?: InsetsInput
}

/** Space between a column's left edge and its text (none in the first column). */
const INSET = 10

/** Share of the full color in the first stage; the last one takes all of it. */
const PALEST = 0.3

const COLOR = 'var(--tc-funnel-color,var(--tc-color-1))'

/** A stage with its conversion rates, `0…1` (`1` for the first stage). */
interface Stage {
  data: FunnelStage
  value: number
  ofFirst: number
  ofPrevious: number
}

const share = (value: number, of: number): number => (of > 0 ? value / of : 0)

function stagesOf(options: FunnelOptions): Stage[] {
  const first = options.data[0]?.value ?? 0
  return options.data.map((data, i) => ({
    data,
    value: data.value,
    ofFirst: i === 0 ? 1 : share(data.value, first),
    ofPrevious: i === 0 ? 1 : share(data.value, (options.data[i - 1] as FunnelStage).value),
  }))
}

/** Share of the full color in stage `i` of `count`: paler where the funnel is wide. */
const shadeOf = (i: number, count: number): number =>
  round((count > 1 ? PALEST + ((1 - PALEST) * i) / (count - 1) : 1) * 100)

/** Corner of radius `r` that takes at most half of either edge it sits on. */
const corner = (r: number, edgeX: number, edgeY: number): number =>
  Math.max(0, Math.min(r, edgeX / 2, edgeY / 2))

/**
 * A stage from `x0` to `x1`, standing on `floor`: its top runs from its own
 * height `y0` to the next stage's `y1`, with both top corners rounded.
 */
function stagePath(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  floor: number,
  radius: number,
): string {
  const dx = x1 - x0
  const dy = y1 - y0
  const near = corner(radius, dx, floor - y0)
  const far = corner(radius, dx, floor - y1)
  // How far along the sloped top each corner reaches.
  const tn = dx > 0 ? near / dx : 0
  const tf = dx > 0 ? far / dx : 0
  const n = round
  return (
    `M${n(x0)},${n(y0 + near)}Q${n(x0)},${n(y0)},${n(x0 + dx * tn)},${n(y0 + dy * tn)}` +
    `L${n(x1 - dx * tf)},${n(y1 - dy * tf)}Q${n(x1)},${n(y1)},${n(x1)},${n(y1 + far)}` +
    `L${n(x1)},${n(floor)}L${n(x0)},${n(floor)}Z`
  )
}

function renderFunnel(options: FunnelOptions, ctx: RenderContext): ChildInput {
  const { width, height, fontSize, locale } = ctx
  const radius = Math.max(0, options.radius ?? 4)
  const area = innerRect(width, height, insets(options.padding, 0))
  const stages = stagesOf(options)
  const count = stages.length
  if (count === 0) return null

  const value = formatNumber(options.format, locale)
  const percent = getNumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })

  // Three lines of text above the shapes: name, value, share of the first stage.
  const line = fontSize * 1.3
  const header = options.labels === false ? 0 : Math.min(area.height, line * 3 + 8)
  const floor = area.y + area.height
  const plot = area.height - header
  const column = area.width / count
  const columnX = (i: number) => area.x + i * column
  // Every stage is measured against the largest, so a funnel that only loses fills the plot.
  const max = Math.max(0, ...stages.map((stage) => stage.value))
  const top = (v: number) => floor - (max > 0 ? (v / max) * plot : 0)

  const colorOf = (i: number): string =>
    (stages[i] as Stage).data.color ??
    `color-mix(in oklab,${COLOR} ${shadeOf(i, count)}%,var(--tc-surface))`

  const hitFor = (i: number): Hit => {
    const stage = stages[i] as Stage
    const x = columnX(i) + column / 2
    const items: HitItem[] = [
      {
        name: stage.data.name,
        seriesIndex: 0,
        value: stage.value,
        text: value(stage.value),
        x,
        y: top(stage.value),
        color: colorOf(i),
      },
    ]
    // Conversion rates as notes below the value: no swatch, no value label.
    const rate = (seriesIndex: number, of: Stage, v: number) =>
      items.push({
        name: `of ${of.data.name}`,
        seriesIndex,
        value: v,
        text: percent.format(v),
        x,
        y: null,
        color: 'transparent',
      })
    if (i > 0) rate(1, stages[0] as Stage, stage.ofFirst)
    // The second stage's previous one is the first: the same rate again.
    if (i > 1) rate(2, stages[i - 1] as Stage, stage.ofPrevious)
    return {
      index: i,
      label: stage.data.name,
      title: '',
      x,
      area,
      // The whole column is highlighted, as it is the whole hit area.
      band: { x: columnX(i), y: area.y, width: column, height: area.height },
      items,
    }
  }

  const interaction: Interaction = {
    count,
    hitIndex: (i) => (i >= 0 && i < count ? hitFor(i) : null),
    hitTest(px, py) {
      if (px < area.x || px > area.x + area.width || py < area.y || py > floor) return null
      return hitFor(Math.min(count - 1, Math.floor((px - area.x) / (column || 1))))
    },
  }
  ctx.onHitTest(interaction)

  const dividers = stages.slice(1).map((stage, i) =>
    h('line', {
      key: keyOf(stage.data),
      class: 'tc-grid-line tc-funnel-divider',
      x1: round(columnX(i + 1)),
      x2: round(columnX(i + 1)),
      y1: round(area.y),
      y2: round(floor),
    }),
  )

  const shapes = stages.map((stage, i) =>
    h('path', {
      key: keyOf(stage.data),
      class: ['tc-funnel-stage', stage.data.class],
      'data-series': stage.data.name,
      // The last stage stays level: a slope would draw a loss the data does not report.
      d: stagePath(
        columnX(i),
        columnX(i + 1),
        top(stage.value),
        top((stages[i + 1] ?? stage).value),
        floor,
        radius,
      ),
      // A map, so values from data cannot inject CSS (see normalizeStyle).
      style: {
        '--tc-funnel-color': stage.data.color,
        '--tc-funnel-shade': `${stage.data.color ? 100 : shadeOf(i, count)}%`,
      },
    }),
  )

  const labels =
    header >= line * 3 &&
    stages.flatMap((stage, i) => {
      const inset = i === 0 ? 0 : INSET
      const room = column - inset - INSET
      const x = round(columnX(i) + inset)
      const y = area.y + fontSize * 0.85
      const key = keyOf(stage.data)
      const fits = (text: string) => estimateTextWidth(text, fontSize) <= room
      const name = fit(stage.data.name, room, fontSize)
      const amount = value(stage.value)
      // Nothing to convert from at the top of the funnel.
      const rate = i > 0 ? percent.format(stage.ofFirst) : ''
      return [
        name && h('text', { key, class: 'tc-funnel-name', x, y: round(y) }, name),
        fits(amount) &&
          h(
            'text',
            { key: `${key}/value`, class: 'tc-funnel-value', x, y: round(y + line) },
            amount,
          ),
        rate &&
          fits(rate) &&
          h(
            'text',
            { key: `${key}/share`, class: 'tc-funnel-share', x, y: round(y + line * 2) },
            rate,
          ),
      ]
    })

  return [
    h('g', { class: 'tc-funnel-dividers', 'aria-hidden': 'true' }, dividers),
    h('g', { class: 'tc-funnel-stages' }, shapes),
    labels && h('g', { class: 'tc-funnel-labels', 'aria-hidden': 'true' }, labels),
  ]
}

function funnelTable(options: FunnelOptions, ctx: RenderContext, limit: number): DataTable {
  const value = formatNumber(options.format, ctx.locale)
  const percent = getNumberFormat(ctx.locale, { style: 'percent', maximumFractionDigits: 1 })
  const rows = stagesOf(options).map((stage) => [
    stage.data.name,
    value(stage.value),
    percent.format(stage.ofFirst),
    percent.format(stage.ofPrevious),
  ])
  const table: DataTable = { columns: ['', 'Value', 'Of first', 'Of previous'], rows }
  if (rows.length > limit) {
    table.rows = rows.slice(0, limit)
    table.total = rows.length
  }
  return table
}

/**
 * Stages with text for names. A stage that reports no number did not report
 * a zero, and the stage after it would be measured against it: such stages
 * are left out, as are negative counts.
 */
const cleanStages = (data: unknown): unknown =>
  records(data, (r) => ({ ...named(r), value: finite(r.value) })).filter(
    (stage) => stage.value !== null && stage.value >= 0,
  )

/**
 * Funnel: how many get from one stage of a process to the next. Every stage
 * is a column with its name, its value and its share of the first stage on
 * top; the shapes below step down from each stage's height to the next, in
 * one color that deepens as the funnel narrows (`--tc-funnel-color`).
 *
 * ```ts
 * new Chart('#el', {
 *   type: funnel,
 *   data: [
 *     { name: 'Visits', value: 12400 },
 *     { name: 'Signups', value: 3100 },
 *     { name: 'Purchases', value: 620 },
 *   ],
 * })
 * ```
 */
export const funnel: ChartType<FunnelOptions> = {
  name: 'funnel',
  clean: cleanData(cleanStages),
  render: renderFunnel,
  table: funnelTable,
}
