import type { SwatchShape } from './features.ts'
import { h, type VNode } from './vnode.ts'

/** One legend entry: a series (or a slice, for part-to-whole charts). */
export interface LegendItem {
  /** Stable identity, used to toggle it. */
  key: string
  name: string
  /** Color slot: the entry wears `.tc-series-{index + 1}`. */
  index: number
  /** Custom color overriding the slot. */
  color?: string
  /** Hidden by default (e.g. `series.hidden`). */
  hidden?: boolean
}

export interface LegendOptions {
  /** Place the legend above or below the chart. Defaults to `'top'`. */
  position?: 'top' | 'bottom'
}

/**
 * Legend content: one toggle button per entry. Buttons are native, so they
 * are focusable and work with Enter/Space; `aria-pressed` reflects visibility.
 * `shape` gives the swatches the point shapes of their slots.
 */
export function legendContent(
  items: readonly LegendItem[],
  hidden: ReadonlySet<string>,
  shape?: SwatchShape,
): VNode {
  return h(
    'div',
    { class: 'tc-legend-items' },
    items.map((item) => {
      const off = hidden.has(item.key)
      return h(
        'button',
        {
          key: item.key,
          type: 'button',
          class: [
            'tc-legend-item',
            'tc-series',
            `tc-series-${item.index + 1}`,
            off && 'tc-legend-item-hidden',
          ],
          // A map, so values from data cannot inject CSS (see normalizeStyle).
          style: { '--tc-series-color': item.color, ...shape?.(item.index) },
          'aria-pressed': off ? 'false' : 'true',
          'data-key': item.key,
        },
        h('span', { class: 'tc-legend-swatch', 'aria-hidden': 'true' }),
        h('span', { class: 'tc-legend-name' }, item.name),
      )
    }),
  )
}

/** Keys hidden by default, from the entries' own `hidden` flags. */
export function defaultHidden(items: readonly LegendItem[]): Set<string> {
  return new Set(items.filter((item) => item.hidden).map((item) => item.key))
}
