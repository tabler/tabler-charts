import type { Tick } from '../components/axis.ts'
import { formatNumber, type Locale, type NumberFormat } from '../format.ts'
import { extent } from '../scales/extent.ts'
import type { LinearScale } from '../scales/linear.ts'
import { log } from '../scales/log.ts'
import type { ValueAxisOptions } from './cartesian.ts'

/** Domain of a log axis: positive values only, niced to whole powers of ten. */
export function logDomain(
  values: readonly (number | null | undefined)[],
  options: ValueAxisOptions,
): [number, number] {
  const positive = values.filter((v): v is number => v != null && v > 0 && Number.isFinite(v))
  let [lo, hi] = extent(positive) ?? [1, 10]
  if (options.min !== undefined && options.min > 0) lo = options.min
  if (options.max !== undefined && options.max > 0) hi = options.max
  if (lo === hi) hi = lo * 10
  if (options.nice !== false) {
    const niced = log([lo, hi], [0, 1]).nice().domain
    if (options.min === undefined) lo = niced[0]
    if (options.max === undefined) hi = niced[1]
  }
  return [lo, hi]
}

/** Ticks of a log axis, each power formatted as is. */
export function logTicks(
  scale: LinearScale,
  count: number,
  format: NumberFormat | undefined,
  locale: Locale,
): Tick[] {
  const fmt = formatNumber(format, locale)
  return scale.ticks(count).map((value) => ({ value, position: scale(value), label: fmt(value) }))
}
