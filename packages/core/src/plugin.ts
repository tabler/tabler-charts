import type { Chart, ChartConfig, ResolvedLegend, Size } from './chart.ts'
import type { Hit } from './interaction.ts'
import type { ChildInput, Props } from './vnode.ts'

/** What a plugin sees before the chart measures itself and renders. */
export interface BeforeRenderState {
  config: ChartConfig<object>
  legend: ResolvedLegend
  hidden: ReadonlySet<string>
}

/** What a plugin sees after the chart rendered into the DOM. */
export interface AfterRenderState extends BeforeRenderState {
  size: Size
  /** Whether the chart content was rebuilt (config, size or hidden series changed). */
  stale: boolean
}

/** Hooks of an installed plugin; every one is optional. */
export interface PluginInstance {
  /** Runs first on every render, e.g. to render a legend that takes up space. */
  beforeRender?(state: BeforeRenderState): void
  /** Vertical space the plugin takes from the container in `height: 'container'` mode. */
  reservedHeight?(): number
  /** Extra attributes for the root `<svg>`. */
  svgAttrs?(config: ChartConfig<object>): Props | undefined
  /** SVG drawn below (`under`) and above (`over`) the chart content for the active hit. */
  layers?(hit: Hit, config: ChartConfig<object>): { under?: ChildInput; over?: ChildInput }
  /** Runs after the SVG is in the DOM, e.g. to place a tooltip. */
  afterRender?(state: AfterRenderState): void
  /** Clean up DOM and listeners. */
  destroy?(): void
}

/**
 * A chart feature that can be left out of the bundle: tooltip, legend, data
 * table, keyboard navigation, hover highlight. `install` runs once per chart.
 *
 * ```ts
 * import { Chart, tooltip } from '@tabler/charts/core'
 * new Chart(el, { type: line, data, plugins: [tooltip()] })
 * ```
 */
export interface ChartPlugin {
  readonly name: string
  install(chart: Chart<object>): PluginInstance
}
