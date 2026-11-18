/**
 * Path morphing for browsers that cannot transition `d` in CSS (Safari):
 * when a patch changes the `d` of a path whose style asks for a `d`
 * transition, the numbers in the path are interpolated frame by frame
 * instead, over the transition's duration with an ease-out curve. Chart
 * paths keep their commands between renders, so only the numbers move; a
 * path whose commands changed jumps, as it would in CSS too.
 */

import { round } from '../layout.ts'
import { stop, tween } from './tween.ts'

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi

let native: boolean | undefined

/**
 * Change `el`'s `d` from `from` to `to` over its CSS transition, frame by
 * frame. Returns `false` when the browser transitions `d` itself, or the
 * path is not meant to move (the caller then just sets the attribute).
 */
export function morph(el: Element, from: string, to: string): boolean {
  native ??= typeof CSS === 'undefined' || CSS.supports('d', 'path("M0 0")')
  const current = stop(el)
  // A chart without transitions (too big to animate, or resizing) has nothing to
  // morph: said here, before asking for the style of each of its paths.
  if (native || el.closest('.tc-static,[data-resizing]')) return false

  const style = getComputedStyle(el)
  const index = style.transitionProperty.split(', ').findIndex((p) => p === 'd' || p === 'all')
  const duration =
    index < 0 ? 0 : Number.parseFloat(style.transitionDuration.split(', ')[index] ?? '') * 1000
  const text = to.split(NUMBER)
  const end = to.match(NUMBER)?.map(Number) ?? []
  const start = from.match(NUMBER)?.map(Number) ?? []
  if (!(duration > 0) || start.length !== end.length || from.split(NUMBER).join() !== text.join()) {
    return false
  }

  // An interrupted morph continues from where the path is now.
  tween(
    el,
    current?.length === end.length ? current : start,
    end,
    duration,
    (now) =>
      now.reduce((d, value, i) => d + round(value) + (text[i + 1] as string), text[0] as string),
    to,
  )
  return true
}
