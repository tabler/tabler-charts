const E10 = Math.sqrt(50)
const E5 = Math.sqrt(10)
const E2 = Math.sqrt(2)

/**
 * Integer tick indices `[i1, i2]` and an increment `inc`. A negative `inc`
 * means "divide by -inc", which keeps decimal ticks exact (0.3, not
 * 0.30000000000000004).
 */
function tickSpec(start: number, stop: number, count: number): [number, number, number] {
  const step = (stop - start) / Math.max(0, count)
  const power = Math.floor(Math.log10(step))
  const error = step / 10 ** power
  const factor = error >= E10 ? 10 : error >= E5 ? 5 : error >= E2 ? 2 : 1
  let i1: number
  let i2: number
  let inc: number
  if (power < 0) {
    inc = 10 ** -power / factor
    i1 = Math.round(start * inc)
    i2 = Math.round(stop * inc)
    if (i1 / inc < start) ++i1
    if (i2 / inc > stop) --i2
    inc = -inc
  } else {
    inc = 10 ** power * factor
    i1 = Math.round(start / inc)
    i2 = Math.round(stop / inc)
    if (i1 * inc < start) ++i1
    if (i2 * inc > stop) --i2
  }
  if (i2 < i1 && count >= 0.5 && count < 2) return tickSpec(start, stop, count * 2)
  return [i1, i2, inc]
}

/**
 * Roughly `count` evenly spaced, "nice" values (multiples of 1, 2 or 5 × 10ⁿ)
 * between `start` and `stop`, inclusive. Order follows `start → stop`.
 */
export function ticks(start: number, stop: number, count = 5): number[] {
  if (!(count > 0) || !Number.isFinite(start) || !Number.isFinite(stop)) return []
  if (start === stop) return [start]
  const reverse = stop < start
  const [i1, i2, inc] = reverse ? tickSpec(stop, start, count) : tickSpec(start, stop, count)
  if (!(i2 >= i1)) return []
  const n = i2 - i1 + 1
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const index = reverse ? i2 - i : i1 + i
    out[i] = inc < 0 ? index / -inc : index * inc
  }
  return out
}

/**
 * Signed tick increment: positive values are the step, negative values `-k`
 * mean a step of `1 / k`.
 */
export function tickIncrement(start: number, stop: number, count: number): number {
  return tickSpec(start, stop, count)[2]
}

/** Distance between ticks produced by {@link ticks} for the same arguments. */
export function tickStep(start: number, stop: number, count = 5): number {
  const reverse = stop < start
  const inc = reverse ? tickIncrement(stop, start, count) : tickIncrement(start, stop, count)
  return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc)
}

/**
 * Extend `[start, stop]` to round tick values, e.g. `[0.2, 9.7] → [0, 10]`.
 * Iterates because rounding can change the ideal step; if the step does not
 * settle (e.g. very low `count` around zero keeps doubling the domain), the
 * domain is returned unchanged, matching d3.
 */
export function niceDomain(start: number, stop: number, count = 5): [number, number] {
  if (!Number.isFinite(start) || !Number.isFinite(stop) || start === stop || !(count > 0)) {
    return [start, stop]
  }
  const reverse = stop < start
  let lo = reverse ? stop : start
  let hi = reverse ? start : stop
  let prev: number | undefined
  for (let i = 0; i < 10; i++) {
    const step = tickIncrement(lo, hi, count)
    if (step === prev) return reverse ? [hi, lo] : [lo, hi]
    if (step > 0) {
      lo = Math.floor(lo / step) * step
      hi = Math.ceil(hi / step) * step
    } else if (step < 0) {
      lo = Math.ceil(lo * step) / step
      hi = Math.floor(hi * step) / step
    } else {
      break
    }
    prev = step
  }
  return [start, stop]
}
