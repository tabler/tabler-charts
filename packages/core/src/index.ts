/**
 * `@tabler/charts`: everything from `@tabler/charts/core`, with a `Chart`
 * that installs the built-in plugins (tooltip, legend, keyboard, …) and
 * every optional feature registered (time and log axes, decimation,
 * annotations, pattern fills, value labels, point shapes). The one exception
 * is the `download` menu's saver: `import '@tabler/charts/export'` adds it,
 * so charts that never offer a download do not carry the export code.
 */

import { annotationLayers, annotationValues } from './charts/annotations.ts'
import { dateLabels } from './charts/dates.ts'
import { logDomain, logTicks } from './charts/log-axis.ts'
import { patternFills } from './charts/patterns.ts'
import { markerClip, markerPath, shapesStep } from './charts/point-shapes.ts'
import { timeAxis } from './charts/time-axis.ts'
import { labelsStep } from './charts/value-labels.ts'
import { addPost, register } from './features.ts'
import { hydrate } from './render/hydrate.ts'
import { morph } from './render/morph.ts'
import { log } from './scales/log.ts'
import { time, timePointScale } from './scales/time.ts'
import { lttb, lttbIndices } from './shapes/decimate.ts'
import { areaPath, linePath } from './shapes/path.ts'

// Registered here, in the entry itself, so no bundler can shake it away.
register({
  time: { scale: time, points: timePointScale, axis: timeAxis },
  dates: dateLabels,
  log: { scale: log, domain: logDomain, ticks: logTicks },
  decimate: lttbIndices,
  line: { linePath, areaPath },
  annotations: { layers: annotationLayers, values: annotationValues },
  patterns: patternFills,
  'point-shapes': markerPath,
  swatch: markerClip,
  hydrate,
  morph,
})

// Steps that finish the content: shapes first, then the labels over them.
addPost(shapesStep)
addPost(labelsStep)

export { Chart } from './chart-default.ts'
export { types } from './chart-types.ts'
export * from './core.ts'
export type { DownloadOptions, ExportOptions, ExportTarget, ImageOptions } from './export-chart.ts'
export { downloadChart, exportImage, exportSVG } from './export-chart.ts'
export type { LogScaleOptions } from './scales/log.ts'
export type { TimeScale, TimeScaleOptions, TimeValue } from './scales/time.ts'
export { log, lttb, lttbIndices, time, timePointScale }
