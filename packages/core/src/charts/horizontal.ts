import type { RenderContext } from '../chart.ts'
import { axis, axisSize, bandTicks, type Tick, thinTicks } from '../components/axis.ts'
import { grid } from '../components/grid.ts'
import { estimateTextWidth, innerRect, insets } from '../layout.ts'
import { type BandKey, band } from '../scales/band.ts'
import type { VNode } from '../vnode.ts'
import {
  type CartesianLayout,
  type CartesianLayoutOptions,
  type CartesianOptions,
  EDGE,
  type Label,
  labelFormatter,
  labelKey,
  plotClip,
  resolveLabels,
  TICK_SPACING_X,
  valueDomain,
  valueScale,
  valueTicks,
} from './cartesian.ts'

/**
 * Cartesian layout with categories along y (labels on the left) and values
 * along x (labels at the bottom), for horizontal bars. Only bar charts use
 * it, so it lives outside `cartesianLayout()` and stays out of other bundles.
 */
export function horizontalLayout(
  options: CartesianOptions,
  ctx: RenderContext,
  layout: CartesianLayoutOptions,
): CartesianLayout {
  const yOptions = options.y ?? {}
  const xOptions = options.x ?? {}
  const { fontSize, locale, width, height } = ctx
  const overhang = layout.overhang ?? 0
  const pad = insets(options.padding)
  const labels = resolveLabels(options.data)
  const format = labelFormatter(options, ctx)
  const count = yOptions.ticks ?? Math.max(2, Math.round(width / TICK_SPACING_X))
  const domain = valueDomain(options.data, yOptions, layout.zero, count, ctx.hidden, layout.values)
  const tickFormat = layout.tickFormat ?? yOptions.format
  const showValues = yOptions.show !== false
  const showCategories = xOptions.show !== false && labels.length > 0

  const probeValues = valueTicks(
    valueScale(domain, [0, 1], yOptions),
    yOptions,
    count,
    tickFormat,
    locale,
  )
  const probeCategories: Tick[] = labels.map((label, i) => ({
    value: labelKey(label),
    position: 0,
    label: format(label, i),
  }))
  const edgeLabel = (tick: Tick | undefined) =>
    showValues && tick ? Math.ceil(estimateTextWidth(tick.label, fontSize) / 2) : 0

  const margins = {
    top: pad.top + Math.max(overhang, EDGE / 2),
    right: pad.right + Math.max(edgeLabel(probeValues[probeValues.length - 1]), overhang, EDGE),
    bottom:
      pad.bottom +
      Math.max(showValues ? axisSize('bottom', probeValues, fontSize) : 0, overhang, EDGE / 2),
    left:
      pad.left +
      Math.max(
        showCategories ? axisSize('left', probeCategories, fontSize) : 0,
        edgeLabel(probeValues[0]),
        overhang,
        EDGE,
      ),
  }
  const area = innerRect(width, height, margins)

  const x = band(labels.map(labelKey), [area.y, area.y + area.height], {
    paddingInner: layout.paddingInner ?? 0.3,
    paddingOuter: layout.paddingOuter ?? 0.15,
  })
  const y = valueScale(domain, [area.x, area.x + area.width], yOptions)
  const yTicks = valueTicks(y, yOptions, count, tickFormat, locale)
  const xTicks = showCategories
    ? thinTicks(
        bandTicks(x, (_: BandKey, i) => format(labels[i] as Label, i)),
        'left',
        fontSize,
      )
    : []

  const background: VNode[] = []
  if (yOptions.grid !== false) background.push(grid({ direction: 'x', ticks: yTicks, area }))
  if (xOptions.grid) background.push(grid({ direction: 'y', ticks: xTicks, area }))

  const foreground: VNode[] = []
  if (showCategories || xOptions.line) {
    foreground.push(axis({ position: 'left', ticks: xTicks, area, line: xOptions.line === true }))
  }
  if (showValues) foreground.push(axis({ position: 'bottom', ticks: yTicks, area }))

  return {
    area,
    labels,
    x,
    y,
    horizontal: true,
    xTicks,
    yTicks,
    background,
    foreground,
    clip: plotClip(ctx, area, overhang),
  }
}
