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
  /** Anchor x of the category in chart pixels (for crosshairs and tooltips). */
  x: number
  /** Plot area, in chart pixels. */
  area: Rect
  /** Every series' value at this category. */
  items: HitItem[]
  /** Series of the mark directly under the pointer (e.g. a bar), if any. */
  seriesIndex?: number
}

/** Maps a point in chart pixels to what lies there. */
export type HitTester = (x: number, y: number) => Hit | null

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
