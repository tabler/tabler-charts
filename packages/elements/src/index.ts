/**
 * `@tabler/charts-elements`: `<tabler-chart>` with every chart type and the
 * built-in plugins (tooltip, legend, keyboard, data table).
 *
 * ```ts
 * import { defineChartElement } from '@tabler/charts-elements'
 * import '@tabler/charts/style.css'
 *
 * defineChartElement()
 * ```
 *
 * ```html
 * <tabler-chart type="line" label="Visitors">
 *   <script type="application/json">
 *     { "labels": ["Mon", "Tue", "Wed"], "series": [{ "name": "Visitors", "values": [3, 5, 4] }] }
 *   </script>
 * </tabler-chart>
 * ```
 */
import {
  area,
  bar,
  Chart,
  type ChartType,
  candlestick,
  donut,
  gauge,
  heatmap,
  line,
  pie,
  scatter,
  sparkline,
} from '@tabler/charts'
import { type DefineOptions, define } from './element.ts'

export type { ChartElement, ChartElementSetup, DefineOptions, ShadowMode } from './element.ts'
export { createChartElement } from './element.ts'

/** Every built-in chart type, by its `type` attribute name. */
export const types: Readonly<Record<string, ChartType<never>>> = {
  line,
  area,
  bar,
  pie,
  donut,
  scatter,
  sparkline,
  gauge,
  heatmap,
  candlestick,
} as Record<string, ChartType<never>>

export interface FullDefineOptions extends DefineOptions {
  /** Extra or replacement chart types, merged over the built-in ones. */
  types?: Readonly<Record<string, ChartType<never>>>
}

/** Register `<tabler-chart>` (or `options.tag`) with every chart type and built-in plugin. */
export function defineChartElement(options: FullDefineOptions = {}): void {
  // The default Chart installs the built-in plugins itself.
  const setup = { Chart, types: { ...types, ...options.types } }
  define(options.shadow ? { ...setup, shadow: options.shadow } : setup, options.tag)
}
