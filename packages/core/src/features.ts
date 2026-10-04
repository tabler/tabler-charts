import type { annotationLayers, annotationValues } from './charts/annotations.ts'
import type { dateLabels } from './charts/dates.ts'
import type { logDomain, logTicks } from './charts/log-axis.ts'
import type { patternFills } from './charts/patterns.ts'
import type { timeAxis } from './charts/time-axis.ts'
import type { hydrate } from './render/hydrate.ts'
import type { morph } from './render/morph.ts'
import type { log } from './scales/log.ts'
import type { time, timePointScale } from './scales/time.ts'
import type { areaPath, linePath, Point } from './shapes/path.ts'

/**
 * Optional features that chart types look up at render time. Each lives in
 * its own module (`@tabler/charts/time`, `/log`, `/decimate`, `/line`, `/annotations`) and registers
 * itself when imported; `@tabler/charts` registers all of them, while
 * `@tabler/charts/core` starts empty so unused code never ships.
 */
export interface Features {
  /** Time scale (and the point scale over it) behind `x: { type: 'time' }`. */
  time?: { scale: typeof time; points: typeof timePointScale; axis: typeof timeAxis }
  /** Date labels behind `x: { type: 'time' }` (also registered by `@tabler/charts/candlestick`). */
  dates?: typeof dateLabels
  /** Log scale and axis behind `scale: 'log'`. */
  log?: { scale: typeof log; domain: typeof logDomain; ticks: typeof logTicks }
  /** Downsampling behind `decimate: N`: indices of the points to keep. */
  decimate?: (points: readonly Point[], threshold: number) => number[]
  /**
   * Taking over server-rendered markup node by node (without it, the server
   * svg is replaced on the first render).
   */
  hydrate?: typeof hydrate
  /** Path morphing on data updates where CSS cannot transition `d` (Safari). */
  morph?: typeof morph
  /** Line and area paths behind `series.type: 'line' | 'area'` in bar charts. */
  line?: { linePath: typeof linePath; areaPath: typeof areaPath }
  /** Reference lines and bands behind `annotations` in cartesian charts. */
  annotations?: { layers: typeof annotationLayers; values: typeof annotationValues }
  /** Pattern fills behind `patterns` (and forced colors, with `'auto'`). */
  patterns?: typeof patternFills
}

export const features: Features = {}

/** Register optional features (idempotent). */
export function register(added: Features): void {
  Object.assign(features, added)
}

/** The registered feature, or a helpful error naming the import that provides it. */
export function feature<K extends keyof Features>(name: K): NonNullable<Features[K]> {
  const found = features[name]
  if (!found) {
    throw new Error(
      `@tabler/charts: Import "@tabler/charts/${name === 'dates' ? 'time' : name}" for ${name}.`,
    )
  }
  return found
}
