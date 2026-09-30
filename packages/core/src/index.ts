/**
 * `@tabler/charts`: everything from `@tabler/charts/core`, with a `Chart`
 * that installs the built-in plugins (tooltip, legend, keyboard, …) and
 * every optional feature registered (time and log axes, decimation).
 */

export { Chart } from './chart-default.ts'
export * from './core.ts'
// Importing these entries registers the features; keep them as value imports.
export { lttb, lttbIndices } from './decimate.ts'
export type { LogScaleOptions } from './log.ts'
export { log } from './log.ts'
export type { TimeScale, TimeScaleOptions, TimeValue } from './time.ts'
export { time, timePointScale } from './time.ts'
