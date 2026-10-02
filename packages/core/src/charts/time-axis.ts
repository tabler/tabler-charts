import type { Tick } from '../components/axis.ts'
import type { Locale } from '../format.ts'
import type { BandKey } from '../scales/band.ts'
import { type TimeScale, timePointScale } from '../scales/time.ts'
import { type CategoryAxis, type CategoryAxisOptions, type Label, toMs } from './cartesian.ts'

/**
 * A time category axis: points at their real distance in time, ticks on
 * calendar boundaries labelled for the span (or with `x.format`).
 */
export function timeAxis(
  labels: readonly Label[],
  keys: readonly BandKey[],
  options: CategoryAxisOptions,
  count: number,
  locale: Locale,
): CategoryAxis {
  const stamps = labels.map(toMs)
  const points = (range: readonly [number, number]) =>
    timePointScale(stamps, keys, range, options.utc === true)
  const probe = points([0, 1]).time
  const { format } = options
  const label = format ? (d: Date) => format(d, -1) : probe.tickFormat(count, locale)
  let time: TimeScale = probe
  return {
    // Time ticks come from the scale; their labels are what sits at the edges.
    edges: probe.ticks(count).map(label),
    scale(range) {
      const scaled = points(range)
      time = scaled.time
      return scaled.scale
    },
    ticks: (): Tick[] =>
      time.ticks(count).map((d) => ({ value: d.getTime(), position: time(d), label: label(d) })),
    get time() {
      return time
    },
  }
}
