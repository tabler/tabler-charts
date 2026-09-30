import type { Hit } from './interaction.ts'
import { type ChildInput, h, type VNode } from './vnode.ts'

export interface TooltipOptions {
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
        h('div', { class: 'tc-tooltip-title' }, hit.title),
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
              style: item.color ? `--tc-series-color:${item.color}` : undefined,
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
 * Place a `width × height` tooltip next to an anchor inside a
 * `bounds.width × bounds.height` container: right of the anchor, or left
 * when it would overflow, vertically centered on the pointer and clamped.
 */
export function placeTooltip(
  anchor: { x: number; y: number },
  size: { width: number; height: number },
  bounds: { width: number; height: number },
  offset = 12,
): TooltipPlacement {
  const fitsRight = anchor.x + offset + size.width <= bounds.width
  const fitsLeft = anchor.x - offset - size.width >= 0
  const side = fitsRight || !fitsLeft ? 'right' : 'left'
  const rawX = side === 'right' ? anchor.x + offset : anchor.x - offset - size.width
  const x = Math.max(0, Math.min(rawX, bounds.width - size.width))
  const y = Math.max(0, Math.min(anchor.y - size.height / 2, bounds.height - size.height))
  return { x: Math.round(x), y: Math.round(y), side }
}
