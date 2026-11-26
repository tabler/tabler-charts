import type { RenderContext } from '../chart.ts'
import { axisSize, bandTicks, type Tick, thinTicks } from '../components/axis.ts'
import { estimateTextWidth, plotFrame } from '../layout.ts'
import { type BandKey, band } from '../scales/band.ts'
import {
  type CartesianLayout,
  type CartesianLayoutOptions,
  type CartesianOptions,
  EDGE,
  finishLayout,
  type Label,
  labelFormatter,
  labelKey,
  resolveLabels,
  TICK_SPACING_X,
  valueAxis,
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
  const { fontSize, width } = ctx
  const overhang = layout.overhang ?? 0
  const labels = resolveLabels(options.data)
  const format = labelFormatter(options, ctx)
  const value = valueAxis(options, ctx, layout, Math.round(width / TICK_SPACING_X))
  const probeValues = value.probe
  const showValues = yOptions.show !== false
  const showCategories = xOptions.show !== false && labels.length > 0

  const probeCategories: Tick[] = labels.map((label, i) => ({
    value: labelKey(label),
    position: 0,
    label: format(label, i),
  }))
  const edgeLabel = (tick: Tick | undefined) =>
    showValues && tick ? Math.ceil(estimateTextWidth(tick.label, fontSize) / 2) : 0

  const { area, side, range } = plotFrame(ctx, options.padding, (pad) => ({
    top: pad.top + Math.max(overhang, EDGE / 2),
    bottom:
      pad.bottom +
      Math.max(showValues ? axisSize('bottom', probeValues, fontSize) : 0, overhang, EDGE / 2),
    start:
      pad.start +
      Math.max(
        showCategories ? axisSize('left', probeCategories, fontSize) : 0,
        edgeLabel(probeValues[0]),
        overhang,
        EDGE,
      ),
    end: pad.end + Math.max(edgeLabel(probeValues[probeValues.length - 1]), overhang, EDGE),
  }))

  const keys = labels.map(labelKey)
  const x = band(keys, [area.y, area.y + area.height], {
    paddingInner: layout.paddingInner ?? 0.3,
    paddingOuter: layout.paddingOuter ?? 0.15,
  })
  // Values grow away from the categories, from the start side.
  const y = value.scale(range())
  const yTicks = thinTicks(value.ticks(y), 'bottom', fontSize)
  const xTicks = showCategories
    ? thinTicks(
        bandTicks(x, (_: BandKey, i) => format(labels[i] as Label, i)),
        'left',
        fontSize,
      )
    : []

  // The value axis runs along x here, categories along y.
  return finishLayout(
    options,
    ctx,
    side,
    overhang,
    { area, labels, x, y, horizontal: true, xTicks, yTicks },
    keys,
  )
}
