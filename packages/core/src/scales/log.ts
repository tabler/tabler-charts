import type { LinearScale, LinearScaleOptions } from './linear.ts'

export interface LogScaleOptions extends LinearScaleOptions {
  /** Logarithm base. Defaults to `10`. */
  base?: number
}

/**
 * Create a logarithmic scale. The domain must not cross zero: both ends
 * positive (or both negative, mirrored). Same interface as {@link linear},
 * so layouts can use either.
 *
 * ```ts
 * const y = log([1, 10000], [300, 0])
 * y.ticks() // 1, 10, 100, 1000, 10000
 * ```
 */
export function log(
  domain: readonly [number, number],
  range: readonly [number, number],
  options: LogScaleOptions = {},
): LinearScale {
  const base = options.base && options.base > 1 ? options.base : 10
  const clamp = options.clamp === true
  const negative = domain[0] < 0 || domain[1] < 0
  const sign = negative ? -1 : 1
  // Values at or below zero cannot be shown; treat them as the smallest positive step.
  const safe = (v: number): number => Math.max(Number.MIN_VALUE, v * sign)
  const ln = Math.log(base)
  // Exact for the common bases, so powers map to whole numbers.
  const logBase =
    base === 10 ? Math.log10 : base === 2 ? Math.log2 : (v: number) => Math.log(v) / ln
  const transform = (v: number): number => logBase(safe(v))
  const untransform = (t: number): number => sign * base ** t
  const t0 = transform(domain[0])
  const t1 = transform(domain[1])
  const [r0, r1] = range
  const span = t1 - t0
  const k = span === 0 ? 0 : (r1 - r0) / span
  const rMin = Math.min(r0, r1)
  const rMax = Math.max(r0, r1)

  const scale = (value: number): number => {
    if (span === 0) return (r0 + r1) / 2
    const px = r0 + (transform(value) - t0) * k
    return clamp ? Math.min(rMax, Math.max(rMin, px)) : px
  }

  return Object.assign(scale, {
    domain: [domain[0], domain[1]] as const,
    range: [r0, r1] as const,
    invert(pixel: number): number {
      if (span === 0 || r1 === r0) return domain[0]
      return untransform(t0 + (pixel - r0) / k)
    },
    ticks(count = 5): number[] {
      const lo = Math.min(t0, t1)
      const hi = Math.max(t0, t1)
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return []
      const first = Math.floor(lo)
      const last = Math.ceil(hi)
      const decades = last - first
      const inside = (v: number) => {
        const t = transform(v)
        return t >= lo - 1e-9 && t <= hi + 1e-9
      }
      let out: number[] = []
      if (decades <= count && Number.isInteger(base)) {
        // Few decades: integer multiples inside each (1, 2, 3 … 9 × 10ⁿ), thinned when crowded.
        const at = (keep: (m: number) => boolean) => {
          const ticks: number[] = []
          for (let p = first; p <= last; p++) {
            for (let m = 1; m < base; m++) {
              const v = sign * m * base ** p
              if (keep(m) && inside(v)) ticks.push(v)
            }
          }
          return ticks
        }
        out = at(() => true)
        if (out.length > count * 2) out = at((m) => m === 1 || m === 2 || m === 5)
        if (out.length > count * 2) out = at((m) => m === 1)
      } else {
        // Many decades: one tick per power (or per few powers).
        const step = Math.max(1, Math.ceil(decades / Math.max(1, count)))
        for (let p = Math.ceil(lo / step) * step; p <= hi + 1e-9; p += step) {
          const v = sign * base ** p
          if (inside(v)) out.push(v)
        }
      }
      return t1 < t0 ? out.reverse() : out
    },
    nice(): LinearScale {
      const lo = untransform(Math.floor(Math.min(t0, t1)))
      const hi = untransform(Math.ceil(Math.max(t0, t1)))
      return log(t1 < t0 ? [hi, lo] : [lo, hi], range, options)
    },
  })
}
