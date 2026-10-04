import type { LegendItem } from '../legend.ts'
import type { ClassValue, Props } from '../vnode.ts'

/** What series, slices and rings have in common: a name, and how they look in a legend. */
export interface Named {
  name: string
  id?: string
  color?: string
  class?: ClassValue
  hidden?: boolean
}

/** Stable key of a series, slice or ring: its `id`, or its name. */
export const keyOf = (item: Named): string => item.id ?? item.name

/** Legend entries for series, slices or rings, in their order (which is their color slot). */
export function legendItems(list: readonly Named[]): LegendItem[] {
  return list.map((entry, index) => {
    const item: LegendItem = { key: keyOf(entry), name: entry.name, index }
    if (entry.color) item.color = entry.color
    if (entry.hidden) item.hidden = true
    return item
  })
}

/** Attributes of the group of a series, slice or ring in color slot `index`. */
export function groupAttrs(item: Named, index: number): Props {
  return {
    key: keyOf(item),
    class: ['tc-series', `tc-series-${index + 1}`, item.class],
    'data-series': item.name,
    // A map, so values from data cannot inject CSS (see normalizeStyle).
    style: { '--tc-series-color': item.color },
  }
}
