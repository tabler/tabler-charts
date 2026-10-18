/**
 * Path morphing for browsers that cannot transition `d` in CSS (Safari):
 * when a patch changes the `d` of a path whose style asks for a `d`
 * transition, the numbers in the path are interpolated frame by frame
 * instead, over the transition's duration with an ease-out curve. Chart
 * paths keep their commands between renders, so only the numbers move; a
 * path whose commands changed jumps, as it would in CSS too.
 *
 * Arcs around the origin (pie slices, gauge arcs) morph in every browser:
 * CSS moves each point along a straight line, which cuts through the circle
 * and bends the ring out of shape mid-way. Their points move by angle and
 * radius instead, so the ring stays round.
 */

import { round } from '../layout.ts'
import { DEG } from '../shapes/arc.ts'

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi

/** The running morph of each path: its frame request and the numbers drawn now. */
const running = /* @__PURE__ */ new WeakMap<Element, { frame: number; now: number[] }>()

let native: boolean | undefined

/** Paths centered on the origin whose points turn around it. */
const POLAR = '.tc-slice,.tc-gauge-arc,.tc-gauge-track'
const TAU = Math.PI * 2

/** Indices of the x of each point of an absolute M/L/A path, and whether it ends an arc. */
function pointsOf(text: readonly string[], count: number): [number, boolean][] {
  const points: [number, boolean][] = []
  let arc = false
  let index = 0
  for (let i = 0; i < count; i++) {
    const command = (text[i] as string).match(/[A-Z]/)
    if (command) {
      arc = command[0] === 'A'
      index = 0
    }
    if (index++ === (arc ? 5 : 0)) points.push([i, arc])
  }
  return points
}

/**
 * The numbers of a path with its points as radius and angle. Angles unwind
 * along the path, the first one within a turn after `start`, so two paths
 * agree on which way round each point goes.
 */
function toPolar(values: readonly number[], points: [number, boolean][], start: number): number[] {
  const out = values.slice()
  let previous = start
  points.forEach(([i, arc], n) => {
    const x = values[i] as number
    const y = values[i + 1] as number
    const r = Math.hypot(x, y)
    // The center has no angle of its own: it keeps the one before.
    let delta = r > 1e-6 ? Math.atan2(y, x) - previous : 0
    delta -= TAU * (n ? Math.round(delta / TAU) : Math.floor(delta / TAU))
    // A half ring can be close to half a turn: its sweep flag decides the way.
    if (arc && Math.abs(delta) > 3) delta = values[i - 1] ? Math.abs(delta) : -Math.abs(delta)
    previous += delta
    out[i] = r
    out[i + 1] = previous
  })
  return out
}

/**
 * Change `el`'s `d` from `from` to `to` over its CSS transition, frame by
 * frame. Returns `false` when the browser transitions `d` itself, or the
 * path is not meant to move (the caller then just sets the attribute).
 */
export function morph(el: Element, from: string, to: string): boolean {
  native ??= typeof CSS === 'undefined' || CSS.supports('d', 'path("M0 0")')
  const current = running.get(el)
  if (current) {
    cancelAnimationFrame(current.frame)
    ;(el as SVGElement).style.removeProperty('transition')
  }
  running.delete(el)
  // A chart without transitions (too big to animate, or resizing) has nothing to
  // morph: said here, before asking for the style of each of its paths.
  const polar = el.matches(POLAR)
  if ((native && !polar) || el.closest('.tc-static,[data-resizing]')) return false

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
  const now = current?.now.length === end.length ? current.now : start
  const points = polar ? pointsOf(text, end.length) : []
  // Angles count from where the pie starts (12 o'clock unless it says otherwise).
  const turn = ((Number.parseFloat(style.getPropertyValue?.('--tc-arc-start')) || 0) - 90) * DEG
  const origin = polar ? toPolar(now, points, turn) : now
  const target = polar ? toPolar(end, points, turn) : end
  // CSS would chase every frame with a transition of its own.
  if (native) (el as SVGElement).style.transition = 'none'
  const state = { frame: 0, now: now.slice() }
  const begin = performance.now()
  const step = (time: number) => {
    const t = Math.min(1, Math.max(0, (time - begin) / duration))
    // Ease out, close to the default --tc-easing (a custom easing is approximated).
    const k = 1 - (1 - t) ** 3
    target.forEach((value, i) => {
      state.now[i] = (origin[i] as number) + (value - (origin[i] as number)) * k
    })
    for (const [i] of points) {
      const r = state.now[i] as number
      const angle = state.now[i + 1] as number
      state.now[i] = r * Math.cos(angle)
      state.now[i + 1] = r * Math.sin(angle)
    }
    let d = text[0] as string
    state.now.forEach((v, i) => {
      d += round(v) + (text[i + 1] as string)
    })
    el.setAttribute('d', t < 1 ? d : to)
    if (t < 1) state.frame = requestAnimationFrame(step)
    else {
      running.delete(el)
      if (native) (el as SVGElement).style.removeProperty('transition')
    }
  }
  running.set(el, state)
  state.frame = requestAnimationFrame(step)
  return true
}
