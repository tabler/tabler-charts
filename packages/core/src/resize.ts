/** One `ResizeObserver` shared by every chart on the page. */

type Listener = (width: number, height: number) => void

const listeners = /* @__PURE__ */ new Map<Element, Listener>()
let observer: ResizeObserver | undefined

function getObserver(): ResizeObserver | undefined {
  if (observer || typeof ResizeObserver !== 'function') return observer
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const box = entry.contentRect
      listeners.get(entry.target)?.(box.width, box.height)
    }
  })
  return observer
}

/**
 * Call `listener` with the content size of `el` whenever it changes.
 * Returns a function that stops observing. No-op where `ResizeObserver`
 * is unavailable (SSR, old browsers).
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
