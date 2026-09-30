import type { LinearScale, LinearScaleOptions } from './scales/linear.ts'
import type { time, timePointScale } from './scales/time.ts'
import type { Point } from './shapes/path.ts'

/**
 * Optional features that chart types look up at render time. Each lives in
 * its own module (`@tabler/charts/time`, `/log`, `/decimate`) and registers
 * itself when imported; `@tabler/charts` registers all of them, while
 * `@tabler/charts/core` starts empty so unused code never ships.
 */
export interface Features {
  /** Time scale (and the point scale over it) behind `x: { type: 'time' }`. */
  time?: { scale: typeof time; points: typeof timePointScale }
  /** Log scale behind `scale: 'log'`. */
  log?: (
    domain: readonly [number, number],
    range: readonly [number, number],
    options?: LinearScaleOptions,
  ) => LinearScale
  /** Downsampling behind `decimate: N`: indices of the points to keep. */
  decimate?: (points: readonly Point[], threshold: number) => number[]
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
      `@tabler/charts: "${name}" is not registered. Import "@tabler/charts/${name}" (or "@tabler/charts" for everything).`,
    )
  }
  return found
}
