import { niceDomain, ticks } from './ticks.ts'

export interface LinearScaleOptions {
  /** Clamp output to the range (and `invert()` output to the domain). */
  clamp?: boolean
}

/** Continuous scale mapping a numeric domain to a pixel range. */
export interface LinearScale {
  (value: number): number
  readonly domain: readonly [number, number]
  readonly range: readonly [number, number]
  /** Map a pixel back to a domain value. */
  invert(pixel: number): number
  /** Nice tick values inside the domain. */
  ticks(count?: number): number[]
  /** A copy of the scale with its domain extended to round values. */
  nice(count?: number): LinearScale
}

/**
 * Create a linear scale.
 *
 * ```ts
 * const y = linear([0, 120], [300, 0]).nice()
 * y(60) // 150
 * ```
 *
 * A zero-width domain (e.g. a single data point) maps to the middle of the range.
 */
export function linear(
  domain: readonly [number, number],
  range: readonly [number, number],
  options: LinearScaleOptions = {},
): LinearScale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0
  const k = span === 0 ? 0 : (r1 - r0) / span
  const mid = (r0 + r1) / 2
  const { clamp = false } = options
  const rMin = Math.min(r0, r1)
  const rMax = Math.max(r0, r1)
  const dMin = Math.min(d0, d1)
  const dMax = Math.max(d0, d1)

  const scale = (value: number): number => {
    if (span === 0) return mid
    const px = r0 + (value - d0) * k
    return clamp ? Math.min(rMax, Math.max(rMin, px)) : px
  }

  return Object.assign(scale, {
    domain: [d0, d1] as const,
    range: [r0, r1] as const,
    invert(pixel: number): number {
      if (span === 0 || r1 === r0) return d0
      const value = d0 + (pixel - r0) / k
      return clamp ? Math.min(dMax, Math.max(dMin, value)) : value
    },
    ticks(count?: number): number[] {
      return ticks(d0, d1, count)
    },
    nice(count?: number): LinearScale {
      return linear(niceDomain(d0, d1, count), range, options)
    },
  })
}
