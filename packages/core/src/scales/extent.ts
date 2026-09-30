/**
 * Minimum and maximum of `values`, skipping `null`, `undefined` and
 * non-finite numbers. Returns `undefined` when nothing is left.
 */
export function extent(values: Iterable<number | null | undefined>): [number, number] | undefined {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const value of values) {
    if (value == null || !Number.isFinite(value)) continue
    if (value < min) min = value
    if (value > max) max = value
  }
  return min <= max ? [min, max] : undefined
}
