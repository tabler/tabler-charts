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
        if (visible[j] && v != null) total += Math.abs(v)
      })
    }
    let up = 0
    let down = 0
    let lastUp: Segment | undefined
    let lastDown: Segment | undefined
    for (let j = 0; j < series.length; j++) {
      const s = series[j] as Series
      if (!visible[j]) continue
      const raw = s.values[i]
      const valid = raw != null
      if (!valid && !nullAsZero) continue
      let v = valid ? (raw as number) : 0
      if (percent) v = total === 0 ? 0 : v / total
      const row = out[j] as (Segment | null)[]
      if (v < 0) {
        const segment: Segment = { y0: down, y1: down + v }
        row[i] = segment
        down += v
        lastDown = segment
      } else {
        const segment: Segment = { y0: up, y1: up + v }
        row[i] = segment
        up += v
        lastUp = segment
      }
    }
    // Shares must end exactly at ±100%: floating point drift (1.0000000000000002)
    // would otherwise make nice() stretch the axis to 120%, or leave a hairline gap.
    if (percent) {
      if (lastUp && Math.abs(up - 1) < 1e-9) lastUp.y1 = 1
      if (lastDown && Math.abs(down + 1) < 1e-9) lastDown.y1 = -1
    }
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
