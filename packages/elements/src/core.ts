/**
 * `@tabler/charts-elements/core`: `<tabler-chart>` with only the chart types
 * and plugins you pass, on the bare `Chart` from `@tabler/charts/core`.
 *
 * ```ts
 * import { defineChartElement } from '@tabler/charts-elements/core'
 * import { line } from '@tabler/charts/line'
 * import { tooltip, highlight } from '@tabler/charts/core'
 *
 * defineChartElement({ types: { line }, plugins: () => [highlight(), tooltip()] })
 * ```
 */
import { Chart, type ChartPlugin, type ChartType } from '@tabler/charts/core'
import { type DefineOptions, define } from './element.ts'

export type { ChartElement, ChartElementSetup, DefineOptions } from './element.ts'
export { createChartElement } from './element.ts'

export interface CoreDefineOptions extends DefineOptions {
  /** Chart types by the name used in the `type` attribute. */
  types: Readonly<Record<string, ChartType<never>>>
  /** Plugins installed in every chart. */
  plugins?: () => ChartPlugin[]
}

/** Register `<tabler-chart>` (or `options.tag`) with the given types and plugins. */
export function defineChartElement(options: CoreDefineOptions): void {
  const setup = options.plugins
    ? { Chart, types: options.types, plugins: options.plugins }
    : { Chart, types: options.types }
  define(setup, options.tag)
}
