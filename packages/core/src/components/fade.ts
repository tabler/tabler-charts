import { h, type VNode } from '../vnode.ts'

/**
 * A vertical luminance mask shared by all gradient areas of a chart (line, area, sparkline). Areas keep their
 * series color from CSS; the mask only fades them, with stop opacities read
 * from `--tc-area-gradient-start` / `--tc-area-gradient-end`.
 */
export function fadeMask(id: string): VNode {
  return h(
    'mask',
    { id, maskContentUnits: 'objectBoundingBox' },
    h(
      'linearGradient',
      { id: `${id}-gradient`, x1: 0, y1: 0, x2: 0, y2: 1 },
      h('stop', { class: 'tc-fade-start', offset: 0 }),
      h('stop', { class: 'tc-fade-end', offset: 1 }),
    ),
    h('rect', { width: 1, height: 1, fill: `url(#${id}-gradient)` }),
  )
}
