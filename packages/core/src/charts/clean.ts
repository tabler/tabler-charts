/**
 * Data from users, APIs and JSON is often not what the types say. Each chart
 * type cleans its data as it comes in, annotations as they render, axis bounds where read
 * (`ChartType.clean`): numbers
 * that are not finite become gaps, names become text, colors that are not
 * strings are dropped, and lists or records of the wrong kind are left out.
 * What is already clean keeps its identity, so large arrays are not copied.
 */
import type { Label } from './cartesian.ts'

type Rec = Record<string, unknown>

/**
 * A number the chart can draw, or `null`: finite and at most 1e300 in size, so
 * spans stay finite; below 1e-300 it is 0, so tick steps do not underflow.
 */
export const finite = (v: unknown): number | null =>
  typeof v === 'number' && Math.abs(v) <= 1e300 ? (Math.abs(v) < 1e-300 ? 0 : v) : null

/** A finite number, or `undefined` (an option left out). */
const optional = (v: unknown): number | undefined => finite(v) ?? undefined

export const isRecord = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v)

/** The array, or an empty one. */
export const list = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : [])

/** Strings as they are, finite numbers as digits, anything else as ''. */
export const text = (v: unknown): string =>
  typeof v === 'string' ? v : finite(v) === null ? '' : String(v)

/** A category label: a string, a finite number or a valid date; else ''. */
export const label = (v: unknown): Label =>
  typeof v === 'string' || finite(v instanceof Date ? +v : v) !== null ? (v as Label) : ''

/** Values with gaps for anything that is not a finite number (the same array when clean). */
export const numbers = (v: unknown): readonly (number | null)[] => {
  const values = list(v)
  return (
    values.every((x) => x == null || finite(x) === x) ? values : values.map(finite)
  ) as readonly (number | null)[]
}

/** The records of a list, each fixed by `fix`; other items are left out. */
export const records = <T>(v: unknown, fix: (r: Rec) => T): T[] => list(v).filter(isRecord).map(fix)

/** What every named item has: text for its name, a string id and color. */
export const named = (r: Rec): Rec => ({
  ...r,
  name: text(r.name),
  id: typeof r.id === 'string' ? r.id : undefined,
  color: typeof r.color === 'string' ? r.color : undefined,
})

/** Labels and series of the cartesian types (line, area, bar, heatmap, radar). */
export const cleanSeries = (data: unknown): unknown => {
  const d = isRecord(data) ? data : {}
  return {
    ...d,
    labels: Array.isArray(d.labels) ? d.labels.map(label) : undefined,
    series: records(d.series, (s) => ({
      ...named(s),
      values: numbers(s.values),
    })),
  }
}

/** Options with their data cleaned by `data` (axis bounds are checked where they are read). */
export const cleanData =
  (data: (v: unknown) => unknown) =>
  <O>(options: O): O => ({ ...options, data: data((options as Rec).data) })

/** Slices or rings: records with a finite value (0 when it is not). */
export const cleanItems = (data: unknown): unknown =>
  records(data, (r) => ({ ...named(r), value: finite(r.value) ?? 0, max: optional(r.max) }))
