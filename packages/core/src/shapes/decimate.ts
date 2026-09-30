import type { Point } from './path.ts'

/**
 * Largest-Triangle-Three-Buckets downsampling (Sveinn Steinarsson, 2013):
 * keep roughly `threshold` points that preserve the visual shape of a line,
 * including its peaks and valleys.
 *
 * Returns the indices to keep, in order. Gaps (`null` points) are kept as
 * gap markers and every run between gaps is sampled on its own, so the
 * result lines up with any per-index data (e.g. stacked baselines).
 */
export function lttbIndices(points: readonly Point[], threshold: number): number[] {
  const n = points.length
  if (!(threshold >= 3) || n <= threshold) return points.map((_, i) => i)

  // Split into runs of valid points.
  const runs: [number, number][] = []
  let start = -1
  for (let i = 0; i < n; i++) {
    const valid = points[i] != null
    if (valid && start === -1) start = i
    if (!valid && start !== -1) {
      runs.push([start, i])
      start = -1
    }
  }
  if (start !== -1) runs.push([start, n])
  const valid = runs.reduce((sum, [a, b]) => sum + (b - a), 0)

  const out: number[] = []
  let last = 0
  for (const [a, b] of runs) {
    // One gap marker between runs; everything else in the gap is dropped.
    if (a > last) out.push(last)
    // Each run gets a share of the budget (at least its two ends).
    const budget = Math.max(2, Math.round((threshold * (b - a)) / valid))
    sampleRun(points, a, b, budget, out)
    last = b
  }
  if (last < n) out.push(last)
  return out
}

/** LTTB over `points[from, to)`, pushing kept indices to `out`. */
function sampleRun(
  points: readonly Point[],
  from: number,
  to: number,
  budget: number,
  out: number[],
): void {
  const n = to - from
  if (n <= budget) {
    for (let i = from; i < to; i++) out.push(i)
    return
  }
  const at = (i: number) => points[i] as readonly [number, number]
  const bucketSize = (n - 2) / (budget - 2)
  let a = from
  out.push(a)

  for (let bucket = 0; bucket < budget - 2; bucket++) {
    // Average of the next bucket is the third corner of every candidate triangle.
    const nextStart = from + 1 + Math.floor((bucket + 1) * bucketSize)
    const nextEnd = Math.min(to, from + 1 + Math.floor((bucket + 2) * bucketSize))
    let avgX = 0
    let avgY = 0
    for (let i = nextStart; i < nextEnd; i++) {
      avgX += at(i)[0]
      avgY += at(i)[1]
    }
    const count = Math.max(1, nextEnd - nextStart)
    avgX /= count
    avgY /= count

    // The point of this bucket forming the largest triangle with `a` and the average.
    const rangeStart = from + 1 + Math.floor(bucket * bucketSize)
    const rangeEnd = Math.min(to - 1, from + 1 + Math.floor((bucket + 1) * bucketSize))
    const [ax, ay] = at(a)
    let best = rangeStart
    let bestArea = -1
    for (let i = rangeStart; i < rangeEnd; i++) {
      const [x, y] = at(i)
      const area = Math.abs((ax - avgX) * (y - ay) - (ax - x) * (avgY - ay))
      if (area > bestArea) {
        bestArea = area
        best = i
      }
    }
    out.push(best)
    a = best
  }
  out.push(to - 1)
}

/** The points kept by {@link lttbIndices}, gaps included. */
export function lttb(points: readonly Point[], threshold: number): Point[] {
  return lttbIndices(points, threshold).map((i) => points[i])
}
