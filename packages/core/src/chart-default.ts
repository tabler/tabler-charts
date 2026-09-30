import { type ChartConfig, Chart as CoreChart } from './chart.ts'
import { defaultPlugins } from './plugins/index.ts'

/**
 * A chart with every built-in plugin installed: hover highlight, legend,
 * tooltip, data table and keyboard navigation. Each can be switched off in
 * the config (`tooltip: false`, …). For the smallest bundle, use the bare
 * `Chart` from `@tabler/charts/core` and pick plugins explicitly.
 *
 * ```ts
 * const chart = new Chart('#sales', { type: line, data })
 * ```
 */
export class Chart<O extends object = object> extends CoreChart<O> {
  constructor(target: Element | string, config: ChartConfig<O>) {
    super(target, config, defaultPlugins())
  }
}
