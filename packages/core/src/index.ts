/**
 * `@tabler/charts`: everything from `@tabler/charts/core`, with a `Chart`
 * that installs the built-in plugins (tooltip, legend, keyboard, …) and
 * every optional feature registered (time and log axes, decimation).
 */

import { annotationLayers, annotationValues } from './charts/annotations.ts'
import { register } from './features.ts'
import { log } from './scales/log.ts'
import { time, timePointScale } from './scales/time.ts'
import { lttb, lttbIndices } from './shapes/decimate.ts'
import { areaPath, linePath } from './shapes/path.ts'

// Registered here, in the entry itself, so no bundler can shake it away.
register({
  time: { scale: time, points: timePointScale },
  log,
  decimate: lttbIndices,
  line: { linePath, areaPath },
  annotations: { layers: annotationLayers, values: annotationValues },
})

export { Chart } from './chart-default.ts'
export * from './core.ts'
export type { LogScaleOptions } from './scales/log.ts'
export type { TimeScale, TimeScaleOptions, TimeValue } from './scales/time.ts'
export { log, lttb, lttbIndices, time, timePointScale }
