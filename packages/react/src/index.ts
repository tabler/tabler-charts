/**
 * `@tabler/charts-react`: React components and a hook for `@tabler/charts`.
 * Charts render on the server and the browser takes the SVG over without
 * re-creating it. Import `@tabler/charts/style.css` once in your app.
 *
 * ```tsx
 * import { LineChart } from '@tabler/charts-react'
 * import '@tabler/charts/style.css'
 *
 * <LineChart data={{ labels, series }} aspectRatio={3} locale="en-US" />
 * ```
 */
import {
  type AreaOptions,
  area,
  type BarOptions,
  bar,
  type CalendarOptions,
  type CandlestickOptions,
  calendar,
  candlestick,
  donut,
  type FunnelOptions,
  funnel,
  type GaugeOptions,
  gauge,
  type HeatmapOptions,
  heatmap,
  type LineOptions,
  line,
  type MapOptions,
  map,
  type ParliamentOptions,
  type PercentageBarOptions,
  type PieOptions,
  parliament,
  percentageBar,
  pie,
  type RadarOptions,
  radar,
  type SankeyOptions,
  type ScatterOptions,
  type SparklineOptions,
  sankey,
  scatter,
  sparkline,
  type TreemapOptions,
  treemap,
} from '@tabler/charts'
import { type ChartComponent, chartComponent } from './chart.tsx'

export type { ChartComponent, ChartEventProps, ChartProps, UseChart } from './chart.tsx'
export { chartComponent, TablerChart, useChart } from './chart.tsx'

// Each component is created by a pure call, so unused ones (and their chart types) tree-shake.
export const LineChart: ChartComponent<LineOptions> = /* @__PURE__ */ chartComponent(
  line,
  'LineChart',
)
export const AreaChart: ChartComponent<AreaOptions> = /* @__PURE__ */ chartComponent(
  area,
  'AreaChart',
)
export const BarChart: ChartComponent<BarOptions> = /* @__PURE__ */ chartComponent(bar, 'BarChart')
export const PieChart: ChartComponent<PieOptions> = /* @__PURE__ */ chartComponent(pie, 'PieChart')
export const DonutChart: ChartComponent<PieOptions> = /* @__PURE__ */ chartComponent(
  donut,
  'DonutChart',
)
export const ScatterChart: ChartComponent<ScatterOptions> = /* @__PURE__ */ chartComponent(
  scatter,
  'ScatterChart',
)
export const Sparkline: ChartComponent<SparklineOptions> = /* @__PURE__ */ chartComponent(
  sparkline,
  'Sparkline',
)
export const GaugeChart: ChartComponent<GaugeOptions> = /* @__PURE__ */ chartComponent(
  gauge,
  'GaugeChart',
)
export const HeatmapChart: ChartComponent<HeatmapOptions> = /* @__PURE__ */ chartComponent(
  heatmap,
  'HeatmapChart',
)
export const CalendarChart: ChartComponent<CalendarOptions> = /* @__PURE__ */ chartComponent(
  calendar,
  'CalendarChart',
)
export const MapChart: ChartComponent<MapOptions> = /* @__PURE__ */ chartComponent(map, 'MapChart')
export const CandlestickChart: ChartComponent<CandlestickOptions> = /* @__PURE__ */ chartComponent(
  candlestick,
  'CandlestickChart',
)
export const RadarChart: ChartComponent<RadarOptions> = /* @__PURE__ */ chartComponent(
  radar,
  'RadarChart',
)
export const SankeyChart: ChartComponent<SankeyOptions> = /* @__PURE__ */ chartComponent(
  sankey,
  'SankeyChart',
)
export const ParliamentChart: ChartComponent<ParliamentOptions> = /* @__PURE__ */ chartComponent(
  parliament,
  'ParliamentChart',
)
export const TreemapChart: ChartComponent<TreemapOptions> = /* @__PURE__ */ chartComponent(
  treemap,
  'TreemapChart',
)
export const PercentageBarChart: ChartComponent<PercentageBarOptions> =
  /* @__PURE__ */ chartComponent(percentageBar, 'PercentageBarChart')
export const FunnelChart: ChartComponent<FunnelOptions> = /* @__PURE__ */ chartComponent(
  funnel,
  'FunnelChart',
)
