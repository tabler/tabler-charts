import type { Rect } from './layout.ts'

/** One series' value at a hovered position. */
export interface HitItem {
  /** Series name. */
  name: string
  /** Position of the series in `data.series`. */
  seriesIndex: number
  /** Custom series color, if one was set. */
  color?: string
  value: number | null
  /** Value formatted for display (tooltips). */
  text: string
  /** Anchor of the value in chart pixels (point, bar end); `y` is `null` for gaps. */
  x: number
  y: number | null
}

/** What lies under the pointer. */
export interface Hit {
  /** Category index. */
  index: number
  /** Category label. */
  label: string | number
  /** Label formatted for display (tooltips). */
  title: string
  /** Anchor x of the category in chart pixels (for crosshairs and tooltips); the plot center for horizontal bars. */
  x: number
  /** Plot area, in chart pixels. */
  area: Rect
  /** Axis the categories run along; `'y'` for horizontal bars. Defaults to `'x'`. */
  axis?: 'x' | 'y'
  /** Center of the category along y, when categories run along y. */
  y?: number
  /** The category's band in chart pixels, for band scales (bars). */
  band?: { x: number; y: number; width: number; height: number }
  /** Every series' value at this category. */
  items: HitItem[]
  /** Series of the mark directly under the pointer (e.g. a bar), if any. */
  seriesIndex?: number
}

/** Maps a point in chart pixels to what lies there. */
export type HitTester = (x: number, y: number) => Hit | null

/** How a rendered chart answers pointer and keyboard interaction. */
export interface Interaction {
  /** What lies at a point in chart pixels. */
  hitTest: HitTester
  /** The hit for a category by index (keyboard navigation), optionally focused on a series. */
  hitIndex(index: number, seriesIndex?: number): Hit | null
  /** Number of categories. */
  count: number
}

/** Identity of a hit, used to emit hover changes only when it changes. */
export function hitKey(hit: Hit | null): string {
  return hit ? `${hit.index}:${hit.seriesIndex ?? ''}` : ''
}

/**
 * Convert a pointer position to chart pixels, accounting for the SVG being
 * scaled by CSS (e.g. `max-width: 100%`).
 */
export function toChartPoint(
  svg: Element,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect()
  const sx = rect.width > 0 ? width / rect.width : 1
  const sy = rect.height > 0 ? height / rect.height : 1
  return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy }
}
