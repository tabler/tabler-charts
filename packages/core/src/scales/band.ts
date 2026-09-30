/** Category identifier used by band and point scales. */
export type BandKey = string | number

export interface BandScaleOptions {
  /** Share of each step left empty between bands, `0…1`. Defaults to `0`. */
  paddingInner?: number
  /** Space before the first and after the last band, in steps. Defaults to `0`. */
  paddingOuter?: number
  /** Where leftover space goes: `0` start, `0.5` center, `1` end. Defaults to `0.5`. */
  align?: number
}

/** Discrete scale splitting a range into equal bands, one per category. */
export interface BandScale {
  /** Start of the band for `key`, or `undefined` for unknown keys. */
  (key: BandKey): number | undefined
  readonly domain: readonly BandKey[]
  readonly range: readonly [number, number]
  /** Width of a single band. */
  readonly bandwidth: number
  /** Distance between the starts of adjacent bands. */
  readonly step: number
  /** Start of the band at `index`. */
  at(index: number): number
  /** Center of the band for `key`. */
  center(key: BandKey): number | undefined
  /** Index of the band nearest to `pixel` (for hit testing), or `-1` when empty. */
  indexAt(pixel: number): number
}

/**
 * Create a band scale, e.g. for bar charts.
 *
 * ```ts
 * const x = band(['Jan', 'Feb', 'Mar'], [0, 300], { paddingInner: 0.2 })
 * x('Feb')      // start of the "Feb" band
 * x.bandwidth   // bar width
 * ```
 */
export function band(
  domain: readonly BandKey[],
  range: readonly [number, number],
  options: BandScaleOptions = {},
): BandScale {
  const { paddingInner = 0, paddingOuter = 0, align = 0.5 } = options
  const inner = Math.min(1, Math.max(0, paddingInner))
  const n = domain.length
  const [r0, r1] = range
  const reverse = r1 < r0
  const lo = reverse ? r1 : r0
  const hi = reverse ? r0 : r1

  const step = (hi - lo) / Math.max(1, n - inner + paddingOuter * 2)
  const start = lo + (hi - lo - step * (n - inner)) * align
  const bandwidth = step * (1 - inner)

  const index = new Map<BandKey, number>()
  for (let i = 0; i < n; i++) {
    const key = domain[i] as BandKey
    if (!index.has(key)) index.set(key, i)
  }

  const at = (i: number): number => start + step * (reverse ? n - 1 - i : i)

  const scale = (key: BandKey): number | undefined => {
    const i = index.get(key)
    return i === undefined ? undefined : at(i)
  }

  return Object.assign(scale, {
    domain: domain.slice(),
    range: [r0, r1] as const,
    bandwidth,
    step,
    at,
    center(key: BandKey): number | undefined {
      const px = scale(key)
      return px === undefined ? undefined : px + bandwidth / 2
    },
    indexAt(pixel: number): number {
      if (n === 0) return -1
      const raw = step === 0 ? 0 : Math.round((pixel - start - bandwidth / 2) / step)
      const i = Math.min(n - 1, Math.max(0, raw))
      return reverse ? n - 1 - i : i
    },
  })
}

/**
 * Create a point scale: a band scale with zero-width bands, placing each
 * category on a single point (e.g. line charts over labels).
 * `padding` is the space before the first and after the last point, in steps.
 */
export function point(
  domain: readonly BandKey[],
  range: readonly [number, number],
  options: { padding?: number; align?: number } = {},
): BandScale {
  const { padding = 0, align } = options
  return band(domain, range, {
    paddingInner: 1,
    paddingOuter: padding,
    ...(align === undefined ? {} : { align }),
  })
}
