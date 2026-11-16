/**
 * Arcs that turn to their new angles: a transition of `d` moves each point
 * of a path along a straight line, which bends a slice out of its ring on
 * the way. A path that says which arc it draws (`data-arc`, see `arcData`)
 * is redrawn frame by frame instead, with the angles and radii in between,
 * so slices grow and shrink around the center. Timed by the path's
 * `transition-duration` (`--tc-duration`), with an ease-out curve.
 */

import { type ArcOptions, arcPathStable } from '../shapes/arc.ts'
import type { Attrs } from '../vnode.ts'
import { stop, tween } from './tween.ts'

/** The `data-arc` of a path drawn with these options: radii, angles, pad angle, corner radius. */
export const arcData = (arc: ArcOptions): string =>
  [
    arc.innerRadius,
    arc.outerRadius,
    arc.startAngle,
    arc.endAngle,
    arc.padAngle ?? 0,
    arc.cornerRadius ?? 0,
  ]
    .map((value) => Math.round(value * 1e4) / 1e4)
    .join(' ')

const read = (attrs: Attrs): number[] => {
  const data = attrs['data-arc']
  return typeof data === 'string' ? data.split(' ').map(Number) : []
}

/**
 * Change the `d` of `el` from the arc of `prev` to the arc of `next`.
 * Returns `false` when there is nothing to animate (no arc on either side,
 * or a chart without transitions): the caller then just sets the attribute.
 */
export function sweep(el: Element, prev: Attrs, next: Attrs): boolean {
  const end = read(next)
  // An interrupted sweep continues from where the arc is now.
  const origin = stop(el) ?? read(prev)
  if (end.length !== 6 || origin.length !== 6 || typeof requestAnimationFrame !== 'function') {
    return false
  }
  // Zero in a chart without transitions (static, resizing, reduced motion).
  const duration = Number.parseFloat(getComputedStyle(el).transitionDuration) * 1000
  if (!(duration > 0)) return false
  tween(
    el,
    origin,
    end,
    duration,
    ([innerRadius, outerRadius, startAngle, endAngle, padAngle, cornerRadius]) =>
      arcPathStable({
        innerRadius,
        outerRadius,
        startAngle,
        endAngle,
        padAngle,
        cornerRadius,
      } as ArcOptions),
    String(next.d),
  )
  return true
}
