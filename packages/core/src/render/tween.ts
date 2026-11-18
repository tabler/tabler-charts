/**
 * Paths redrawn frame by frame, shared by `morph` and `sweep`: numbers go
 * from where they are to where they end with an ease-out curve, and each
 * frame draws the `d` of the numbers in between.
 */

/** The running tween of each path: its frame request and the numbers drawn now. */
const running = /* @__PURE__ */ new WeakMap<Element, { frame: number; now: number[] }>()

/** Stop the tween of `el`, if any; returns the numbers it had reached. */
export function stop(el: Element): number[] | undefined {
  const current = running.get(el)
  if (current) cancelAnimationFrame(current.frame)
  running.delete(el)
  return current?.now
}

/**
 * Take the numbers from `origin` to `end` over `duration` ms, setting the
 * `d` of `el` to `draw(numbers)` on each frame and to `to` on the last.
 */
export function tween(
  el: Element,
  origin: readonly number[],
  end: readonly number[],
  duration: number,
  draw: (now: number[]) => string,
  to: string,
): void {
  const state = { frame: 0, now: origin.slice() }
  const begin = performance.now()
  const step = (time: number) => {
    const t = Math.min(1, Math.max(0, (time - begin) / duration))
    // Ease out, close to the default --tc-easing (a custom easing is approximated).
    const k = 1 - (1 - t) ** 3
    state.now = end.map((value, i) => origin[i]! + (value - origin[i]!) * k)
    el.setAttribute('d', t < 1 ? draw(state.now) : to)
    if (t < 1) state.frame = requestAnimationFrame(step)
    else running.delete(el)
  }
  running.set(el, state)
  state.frame = requestAnimationFrame(step)
}
