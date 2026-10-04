/** One `ResizeObserver` shared by every chart on the page. */

type Listener = (width: number, height: number) => void

const listeners = /* @__PURE__ */ new WeakMap<Element, Listener>()
/** Elements observed while in the document. */
const seen = /* @__PURE__ */ new WeakSet<Element>()
let observer: ResizeObserver | undefined

function getObserver(): ResizeObserver | undefined {
  if (observer || typeof ResizeObserver !== 'function') return observer
  observer = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      if (target.isConnected) {
        seen.add(target)
        listeners.get(target)?.(contentRect.width, contentRect.height)
      } else if (seen.has(target)) {
        // Taken out of the page without destroy(): stop observing, or the
        // observer would keep the element and its chart in memory for good.
        // `chart.resize()` observes it again if it comes back.
        seen.delete(target)
        observer?.unobserve(target)
      }
    }
  })
  return observer
}

/**
 * Call `listener` with the content size of `el` whenever it changes.
 * Returns a function that stops observing. No-op where `ResizeObserver`
 * is unavailable (SSR, old browsers). Observing again is harmless.
 */
export function observeResize(el: Element, listener: Listener): () => void {
  const ro = getObserver()
  if (!ro) return () => {}
  listeners.set(el, listener)
  ro.observe(el)
  return () => {
    if (listeners.get(el) !== listener) return
    listeners.delete(el)
    ro.unobserve(el)
  }
}
