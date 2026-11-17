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
  chartEvents,
  chartLabel,
  chartToString,
  renderContext,
  resolveLegend,
  resolveSize,
} from './chart.ts'
export type { Annotation } from './charts/annotations.ts'
export type { AreaOptions } from './charts/area.ts'
export { area } from './charts/area.ts'
export type { BarOptions } from './charts/bar.ts'
export { bar } from './charts/bar.ts'
export type { Candle, CandlestickOptions } from './charts/candlestick.ts'
export { candlestick } from './charts/candlestick.ts'
export type {
  CartesianData,
  CartesianOptions,
  CategoryAxisOptions,
  Label,
  Series,
  ValueAxisOptions,
} from './charts/cartesian.ts'
export {
  categoryInteraction,
  domainOf,
  seriesKey,
  seriesLegend,
  seriesTable,
} from './charts/cartesian.ts'
export type { GaugeOptions, GaugeRing } from './charts/gauge.ts'
export { gauge } from './charts/gauge.ts'
export type { HeatmapOptions, HeatmapRange } from './charts/heatmap.ts'
export { heatmap } from './charts/heatmap.ts'
export type { LineOptions } from './charts/line.ts'
export { line } from './charts/line.ts'
export type { ParliamentOptions, ParliamentParty } from './charts/parliament.ts'
export { parliament } from './charts/parliament.ts'
export type { PercentageBarOptions, PercentageBarSegment } from './charts/percentage-bar.ts'
export { percentageBar } from './charts/percentage-bar.ts'
export type { PieOptions, PieSlice } from './charts/pie.ts'
export { donut, pie } from './charts/pie.ts'
export type { RadarOptions, RadialAxisOptions } from './charts/radar.ts'
export { radar } from './charts/radar.ts'
export type { SankeyData, SankeyLink, SankeyNode, SankeyOptions } from './charts/sankey.ts'
export { sankey } from './charts/sankey.ts'
export type { ScatterOptions, ScatterPoint, ScatterSeries } from './charts/scatter.ts'
export { scatter } from './charts/scatter.ts'
export type { SparklineOptions } from './charts/sparkline.ts'
export { sparkline } from './charts/sparkline.ts'
export type { TreemapNode, TreemapOptions } from './charts/treemap.ts'
export { treemap } from './charts/treemap.ts'
export type { AxisOptions, AxisPosition, LinearTicksOptions, Tick } from './components/axis.ts'
export { axis, axisSize, bandTicks, linearTicks, thinTicks } from './components/axis.ts'
export type { GridOptions } from './components/grid.ts'
export { grid } from './components/grid.ts'
export { hoverOverlay, hoverUnderlay } from './components/hover.ts'
export type { Features } from './features.ts'
export { feature, features, register } from './features.ts'
export type { DateFormat, Locale, NumberFormat, NumberFormatOptions } from './format.ts'
export {
  formatDate,
  formatDetail,
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
export type { DownloadFormat, DownloadMenuOptions, DownloadOption } from './plugins/download.ts'
export {
  dataTable,
  defaultPlugins,
  download,
  highlight,
  keyboard,
  legend,
  pointer,
  sync,
  tooltip,
} from './plugins/index.ts'
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
export type { ArcOptions } from './shapes/arc.ts'
export { arcCentroid, arcPathStable, padAngleForGap } from './shapes/arc.ts'
export { barPath, hbarPath } from './shapes/bar.ts'
export type { Curve, PathOptions, Point } from './shapes/path.ts'
export { areaPath, linePath } from './shapes/path.ts'
export type { TooltipOptions, TooltipPlacement } from './tooltip.ts'
export { hitAnchor, placeTooltip, tooltipContent } from './tooltip.ts'
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
