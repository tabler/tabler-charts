import type { Hit } from './interaction.ts'
import { type ChildInput, h, type VNode } from './vnode.ts'

/**
 * Where a tooltip for `hit` belongs, in chart pixels: the pointer when it
 * drives the highlight, otherwise the focused value (keyboard).
 */
export function hitAnchor(hit: Hit, pointer?: { x: number; y: number }): { x: number; y: number } {
  if (pointer) return pointer
  const item = hit.items.find((i) => i.seriesIndex === hit.seriesIndex) ?? hit.items[0]
  if (hit.guide && item?.y != null) return { x: item.x, y: item.y }
  if (hit.axis === 'y') return { x: item?.x ?? hit.x, y: hit.y ?? hit.area.y }
  return { x: hit.x, y: item?.y ?? hit.area.y + hit.area.height / 2 }
}

export interface TooltipOptions {
  /**
   * Colors of the tooltip: `'dark'` (the default) is a dark box with light
   * text, `'light'` a white one with dark text. Both keep their colors in
   * dark mode; the `--tc-tooltip-*` tokens tune them.
   */
  theme?: 'dark' | 'light'
  /**
   * Custom content for a hit: VNodes built with `h()` or plain text.
   * Rendered safely (no HTML parsing), inside `.tc-tooltip`.
   */
  format?: (hit: Hit) => ChildInput
  /** Extra content below the default rows (e.g. a total), in `.tc-tooltip-footer`. */
  footer?: (hit: Hit) => ChildInput
}

/** Default tooltip content: the category title and one row per series. */
export function tooltipContent(hit: Hit, options: TooltipOptions = {}): VNode {
  const body: ChildInput = options.format
    ? options.format(hit)
    : [
        hit.title && h('div', { class: 'tc-tooltip-title' }, hit.title),
        hit.items.map((item) =>
          h(
            'div',
            {
              key: item.seriesIndex,
              class: [
                'tc-tooltip-item',
                'tc-series',
                `tc-series-${item.seriesIndex + 1}`,
                hit.seriesIndex === item.seriesIndex && 'tc-tooltip-item-active',
              ],
              style: { '--tc-series-color': item.color },
            },
            h('span', { class: 'tc-tooltip-swatch' }),
            h('span', { class: 'tc-tooltip-name' }, item.name),
            h('span', { class: 'tc-tooltip-value' }, item.text),
          ),
        ),
        options.footer && h('div', { class: 'tc-tooltip-footer' }, options.footer(hit)),
      ]
  return h('div', { class: 'tc-tooltip-content' }, body)
}

export interface TooltipPlacement {
  x: number
  y: number
  side: 'left' | 'right'
}

/**
 * Place a `width × height` tooltip next to an anchor within `bounds` (from
 * `bounds.x`, `bounds.y`, 0 by default): right of the anchor, or left when it
 * would overflow, vertically centered on the pointer and clamped.
 */
export function placeTooltip(
  anchor: { x: number; y: number },
  size: { width: number; height: number },
  bounds: { x?: number; y?: number; width: number; height: number },
  offset = 12,
): TooltipPlacement {
  const { x: left = 0, y: top = 0 } = bounds
  const fitsRight = anchor.x + offset + size.width <= left + bounds.width
  const fitsLeft = anchor.x - offset - size.width >= left
  const side = fitsRight || !fitsLeft ? 'right' : 'left'
  const rawX = side === 'right' ? anchor.x + offset : anchor.x - offset - size.width
  const x = Math.max(left, Math.min(rawX, left + bounds.width - size.width))
  const y = Math.max(top, Math.min(anchor.y - size.height / 2, top + bounds.height - size.height))
  return { x: Math.round(x), y: Math.round(y), side }
}
