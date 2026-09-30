import type { ChartType } from '../chart.ts'
import { type LineOptions, renderLines } from './line.ts'

/** Options of the area chart: line options with the fill always on. */
export type AreaOptions = Omit<LineOptions, 'area'>

/**
 * Area chart: filled lines over category labels, with zero in the y domain
 * by default and a vertical fade (`fill: 'gradient'`).
 *
 * ```ts
 * new Chart('#el', {
 *   type: area,
 *   data: { labels: ['Jan', 'Feb', 'Mar'], series: [{ name: 'Sales', values: [3, 5, 4] }] },
 * })
 * ```
 */
export const area: ChartType<AreaOptions> = {
  name: 'area',
  render: (options, ctx) => renderLines(options, ctx, true),
}
