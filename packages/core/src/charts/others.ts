import type { LegendItem } from '../legend.ts'
import { keyOf, type Named } from './named.ts'

/** Legend key of the slice that groups the rest. */
const OTHERS = '__others__'

/** A slice or segment with its size, in color slot `index` (past the data for the rest). */
export interface Grouped<T> {
  data: T
  index: number
  value: number
}

/**
 * The slices of the data in its order: every entry, or with more of them
 * than `maxSlices`, the largest ones and one slice for the rest (in the
 * color of the slots past the palette), named by `label`. `maxSlices` is nine
 * by default (the eight palette colors and the rest) and zero never groups.
 * Hidden entries count here, so hiding one does not pull another out of the
 * rest.
 */
export function groupSlices<T extends Named & { value: number }>(
  data: readonly T[],
  maxSlices: number | undefined,
  label = 'Others',
): Grouped<T>[] {
  const all = data.map((entry, index) => ({
    data: entry,
    index,
    value: Math.max(0, entry.value || 0),
  }))
  const max = Number.isFinite(maxSlices) && (maxSlices as number) >= 0 ? maxSlices : 9
  const limit = max ? Math.max(1, Math.round(max)) : Number.POSITIVE_INFINITY
  if (all.length <= limit) return all
  const kept = new Set(
    [...all].sort((a, b) => b.value - a.value || a.index - b.index).slice(0, limit - 1),
  )
  const value = all.reduce((sum, slice) => (kept.has(slice) ? sum : sum + slice.value), 0)
  return [
    ...all.filter((slice) => kept.has(slice)),
    { data: { name: label, id: OTHERS, value } as T, index: Math.max(8, all.length), value },
  ]
}

/** Legend entries of the slices as drawn, the rest included. */
export function groupLegend<T extends Named>(slices: readonly Grouped<T>[]): LegendItem[] {
  return slices.map(({ data, index }) => {
    const item: LegendItem = { key: keyOf(data), name: data.name, index }
    if (data.color) item.color = data.color
    if (data.hidden) item.hidden = true
    return item
  })
}

/** What the options of a chart with grouped slices hold. */
interface Sliced<T> {
  data: readonly T[]
  maxSlices?: number
  othersLabel?: string
}

/** A chart model of grouped slices: the options, with their slices as drawn. */
export type WithSlices<O extends Sliced<unknown>> = O & { slices: Grouped<O['data'][number]>[] }

/** The chart model of a chart with grouped slices: the options and their slices, worked out once. */
export const withSlices = <T extends Named & { value: number }, O extends Sliced<T>>(
  options: O,
): WithSlices<O> => ({
  ...options,
  slices: groupSlices(options.data as readonly T[], options.maxSlices, options.othersLabel),
})

/** Legend entries of a chart model of grouped slices. */
export const slicesLegend = <T extends Named>(model: {
  slices: readonly Grouped<T>[]
}): LegendItem[] => groupLegend(model.slices)
