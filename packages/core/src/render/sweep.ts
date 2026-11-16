/**
 * Arcs that turn to their new angles: a transition of `d` moves each point
 * of a path along a straight line, which bends a slice out of its ring on
 * the way. A path that knows which arc it draws (the `arc` of its node, see
 * `arcNode`) is redrawn frame by frame instead, with the angles and radii
 * in between, so slices grow and shrink around the center. Timed by the
 * path's `transition-duration` (`--tc-duration`), with an ease-out curve.
 */

import { type ArcOptions, arcPathStable } from '../shapes/arc.ts'
import { type Attrs, h, type VNode } from '../vnode.ts'
import { stop, tween } from './tween.ts'

/**
 * A path drawing this arc, which keeps the arc with it (radii, angles, pad
 * angle, corner radius): out of the markup, for the next render to sweep from.
 */
export function arcNode(name: string, arc: ArcOptions): VNode {
  const node = h('path', { class: name, d: arcPathStable(arc) })
  node.arc = [
    arc.innerRadius,
    arc.outerRadius,
    arc.startAngle,
    arc.endAngle,
    arc.padAngle ?? 0,
    arc.cornerRadius ?? 0,
  ]
  return node
}

/**
 * Take `el` from the arc of its last render, `prev`, to the arc of `next`.
 * Returns the attributes left for the caller to patch (all but `d`, set
 * here frame by frame), or nothing when there is no sweep: not an arc, the
 * same path, no arc to come from, or a chart without transitions.
 */
export function sweep(el: Element, prev: VNode, next: VNode): Attrs | undefined {
  const { arc, attrs } = next
  if (!arc || prev.attrs.d === attrs.d) return
  // An interrupted sweep continues from where the arc is now.
  const origin = stop(el) ?? prev.arc
  // Zero in a chart without transitions (static, resizing, reduced motion).
  const duration = Number.parseFloat(getComputedStyle(el).transitionDuration) * 1000
  if (!origin || !(duration > 0)) return
  tween(
    el,
    origin,
    arc,
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
    String(attrs.d),
  )
  return { ...attrs, d: prev.attrs.d as string }
}
