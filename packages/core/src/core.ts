import { version } from '../package.json'

/** Version of the `@tabler/charts` package. */
export const VERSION: string = version

export type { DataTable } from './a11y.ts'
export { describeHit, tableContent } from './a11y.ts'
export type {
  BaseOptions,
  ChartConfig,
  ChartEvents,
  ChartType,
  RenderContext,
  ResolvedLegend,
  Size,
} from './chart.ts'
export {
  buildChart,
  Chart,
  chartToString,
  renderContext,
  resolveLegend,
  resolveSize,
} from './chart.ts'
export type { AreaOptions } from './charts/area.ts'
export { area } from './charts/area.ts'
export type { BarOptions } from './charts/bar.ts'
export { bar } from './charts/bar.ts'
export type {
  CartesianData,
  CartesianOptions,
  CategoryAxisOptions,
  Label,
  Series,
  ValueAxisOptions,
} from './charts/cartesian.ts'
export { categoryInteraction, seriesKey, seriesLegend, seriesTable } from './charts/cartesian.ts'
export type { LineOptions } from './charts/line.ts'
export { line } from './charts/line.ts'
export type { AxisOptions, AxisPosition, LinearTicksOptions, Tick } from './components/axis.ts'
export { axis, axisSize, bandTicks, linearTicks, thinTicks } from './components/axis.ts'
export type { GridOptions } from './components/grid.ts'
export { grid } from './components/grid.ts'
export { hoverOverlay, hoverUnderlay } from './components/hover.ts'
export type { DateFormat, Locale, NumberFormat } from './format.ts'
export {
  formatDate,
  formatNumber,
  formatTicks,
  getDateFormat,
  getNumberFormat,
  stepPrecision,
} from './format.ts'
export type { Hit, HitItem, HitTester, Interaction } from './interaction.ts'
export type { Insets, InsetsInput, Rect } from './layout.ts'
export { estimateTextWidth, innerRect, insets, LINE_HEIGHT } from './layout.ts'
export type { LegendItem, LegendOptions } from './legend.ts'
export { defaultHidden, legendContent } from './legend.ts'
export type {
  AfterRenderState,
  BeforeRenderState,
  ChartPlugin,
  PluginInstance,
} from './plugin.ts'
export { dataTable, defaultPlugins, highlight, keyboard, legend, tooltip } from './plugins/index.ts'
export { render } from './render/dom.ts'
export type { RenderToStringOptions } from './render/string.ts'
export { escapeAttr, escapeText, renderToString } from './render/string.ts'
export type { BandKey, BandScale, BandScaleOptions } from './scales/band.ts'
export { band, point } from './scales/band.ts'
export { extent } from './scales/extent.ts'
export type { LinearScale, LinearScaleOptions } from './scales/linear.ts'
export { linear } from './scales/linear.ts'
export { niceDomain, tickIncrement, tickStep, ticks } from './scales/ticks.ts'
export { cancel, flush, schedule } from './scheduler.ts'
export { barPath } from './shapes/bar.ts'
export type { Curve, PathOptions, Point } from './shapes/path.ts'
export { areaPath, linePath } from './shapes/path.ts'
export type { TooltipOptions, TooltipPlacement } from './tooltip.ts'
export { placeTooltip, tooltipContent } from './tooltip.ts'
export type {
  Attrs,
  AttrValue,
  Child,
  ChildInput,
  ClassValue,
  Key,
  Props,
  StyleValue,
  VNode,
} from './vnode.ts'
export { h, normalizeClass, normalizeStyle } from './vnode.ts'
