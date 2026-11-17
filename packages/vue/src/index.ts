/**
 * `@tabler/charts-vue`: Vue 3 components and a composable for `@tabler/charts`.
 * Charts render on the server (Nuxt included) and the browser takes the SVG
 * over. Import `@tabler/charts/style.css` once in your app.
 *
 * ```vue
 * <script setup>
 * import { LineChart } from '@tabler/charts-vue'
 * import '@tabler/charts/style.css'
 * </script>
 *
 * <template>
 *   <LineChart :data="data" :aspect-ratio="3" locale="en-US" @hover="onHover" />
 * </template>
 * ```
 */
import {
  type AreaOptions,
  area,
  type BarOptions,
  bar,
  type CandlestickOptions,
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
  type ParliamentOptions,
  type PieOptions,
  parliament,
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
import { type ChartComponent, chartComponent } from './chart.ts'

export type { ChartComponent, ChartEmits, ChartProps } from './chart.ts'
export { chartComponent, TablerChart, useChart } from './chart.ts'

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
export const FunnelChart: ChartComponent<FunnelOptions> = /* @__PURE__ */ chartComponent(
  funnel,
  'FunnelChart',
)
