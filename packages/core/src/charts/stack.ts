import { type Series, seriesKey } from './cartesian.ts'

/** Stack series on top of each other; `'percent'` normalizes every category to 100%. */
export type StackMode = boolean | 'percent'

/** A stacked segment from `y0` to `y1` (in data units). */
export interface Segment {
  y0: number
  y1: number
}

export interface StackOptions {
  /** Normalize each category by the sum of absolute values. */
  percent?: boolean
  /** Count missing values as zero (areas) instead of leaving no segment (bars). */
  nullAsZero?: boolean
  /** Keys of hidden series, which get no segment and do not stack. */
  hidden?: ReadonlySet<string>
}

/**
 * Stack series per category: positive values grow up from zero and
 * negative values down from zero, each on their own running total (like
 * d3's diverging offset), so gains and losses never interleave. Returns one
 * array per series with a segment per category, or `null` for no segment.
 */
export function stackSeries(
  series: readonly Series[],
  count: number,
  options: StackOptions = {},
): (Segment | null)[][] {
  const { percent = false, nullAsZero = false, hidden } = options
  const visible = series.map((s) => !hidden?.has(seriesKey(s)))
  const out = series.map(() => new Array<Segment | null>(count).fill(null))

  for (let i = 0; i < count; i++) {
    let total = 0
    if (percent) {
      series.forEach((s, j) => {
        const v = s.values[i]
        if (visible[j] && v != null && Number.isFinite(v)) total += Math.abs(v)
      })
    }
    let up = 0
    let down = 0
    series.forEach((s, j) => {
      if (!visible[j]) return
      const raw = s.values[i]
      const valid = raw != null && Number.isFinite(raw)
      if (!valid && !nullAsZero) return
      let v = valid ? (raw as number) : 0
      // Rounded so shares sum to exactly 1 (floating point would give 1.0000000000000002
      // and nice() would then stretch the axis to 120%).
      if (percent) v = total === 0 ? 0 : Math.round((v / total) * 1e9) / 1e9
      const row = out[j] as (Segment | null)[]
      if (v < 0) {
        row[i] = { y0: down, y1: down + v }
        down += v
      } else {
        row[i] = { y0: up, y1: up + v }
        up += v
      }
    })
  }
  return out
}

/** Every segment boundary, for the value domain. */
export function stackBounds(stacks: readonly (Segment | null)[][]): number[] {
  const values: number[] = []
  for (const row of stacks) {
    for (const segment of row) if (segment) values.push(segment.y0, segment.y1)
  }
  return values
}
