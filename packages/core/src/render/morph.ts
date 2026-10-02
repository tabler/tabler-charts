/**
 * Path morphing for browsers that cannot transition `d` in CSS (Safari):
 * when a patch changes the `d` of a path whose style asks for a `d`
 * transition, the numbers in the path are interpolated frame by frame
 * instead, over the transition's duration with an ease-out curve. Chart
 * paths keep their commands between renders, so only the numbers move; a
 * path whose commands changed jumps, as it would in CSS too.
 */

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi

/** The running morph of each path: its frame request and the numbers drawn now. */
const running = /* @__PURE__ */ new WeakMap<Element, { frame: number; now: number[] }>()

let native: boolean | undefined

/**
 * Change `el`'s `d` from `from` to `to` over its CSS transition, frame by
 * frame. Returns `false` when the browser transitions `d` itself, or the
 * path is not meant to move (the caller then just sets the attribute).
 */
export function morph(el: Element, from: string, to: string): boolean {
  native ??= typeof CSS === 'undefined' || CSS.supports('d', 'path("M0 0")')
  const current = running.get(el)
  if (current) cancelAnimationFrame(current.frame)
  running.delete(el)
  if (native) return false

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
  const origin = current?.now.length === end.length ? current.now : start
  const state = { frame: 0, now: origin.slice() }
  const begin = performance.now()
  const step = (time: number) => {
    const t = Math.min(1, Math.max(0, (time - begin) / duration))
    // Ease out, close to the default --tc-easing (a custom easing is approximated).
    const k = 1 - (1 - t) ** 3
    let d = text[0] as string
    end.forEach((value, i) => {
      const v = (origin[i] as number) + (value - (origin[i] as number)) * k
      state.now[i] = v
      d += Math.round(v * 100) / 100 + (text[i + 1] as string)
    })
    el.setAttribute('d', t < 1 ? d : to)
    if (t < 1) state.frame = requestAnimationFrame(step)
    else running.delete(el)
  }
  running.set(el, state)
  state.frame = requestAnimationFrame(step)
  return true
}
