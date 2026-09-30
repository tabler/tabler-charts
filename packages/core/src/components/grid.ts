import type { Rect } from '../layout.ts'
import { h, type VNode } from '../vnode.ts'
import type { Tick } from './axis.ts'

export interface GridOptions {
  /** `'y'` draws horizontal lines at y ticks, `'x'` vertical lines at x ticks. */
  direction: 'x' | 'y'
  ticks: readonly Tick[]
  area: Rect
}

/**
 * Render grid lines as `<g class="tc-grid tc-grid-{x|y}">`. The line at
 * value `0` also gets `tc-grid-line-zero`, so the baseline can be emphasized.
 */
export function grid(options: GridOptions): VNode {
  const { direction, ticks, area } = options
  return h(
    'g',
    { class: ['tc-grid', `tc-grid-${direction}`], 'aria-hidden': 'true' },
    ticks.map((tick) => {
      const p = Math.round(tick.position * 100) / 100
      return h('line', {
        key: tick.value,
        class: ['tc-grid-line', tick.value === 0 && 'tc-grid-line-zero'],
        // Positioned with a transitionable transform, so lines glide when the scale changes.
        ...(direction === 'y'
          ? {
              x1: area.x,
              x2: area.x + area.width,
              y1: 0,
              y2: 0,
              style: `transform:translateY(${p}px)`,
            }
          : {
              x1: 0,
              x2: 0,
              y1: area.y,
              y2: area.y + area.height,
              style: `transform:translateX(${p}px)`,
            }),
      })
    }),
  )
}
