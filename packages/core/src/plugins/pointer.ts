import type { Chart } from '../chart.ts'
import { toChartPoint } from '../interaction.ts'
import type { ChartPlugin } from '../plugin.ts'

const listening = /* @__PURE__ */ new WeakSet<object>()

/**
 * Turn pointer input on the chart's element into highlights and `hover` /
 * `click` events (once per chart, however many plugins ask). Returns the
 * function that stops listening, or nothing when already listening.
 */
export function listenPointer(chart: Chart<object>): (() => void) | undefined {
  const el = chart.element
  if (listening.has(chart) || typeof el.addEventListener !== 'function') return undefined
  listening.add(chart)
  const local = (event: MouseEvent) => {
    const svg = el.querySelector('svg.tc-chart')
    if (!svg) return undefined
    const { width, height } = chart.size
    return toChartPoint(svg, event.clientX, event.clientY, width, height)
  }
  // Controls laid over the chart (the download menu) are not the chart:
  // hovering them clears the highlight, so the tooltip never covers them.
  const overControl = (event: Event) =>
    !!(event.target as Element | null)?.closest?.('.tc-download')
  const onLeave = (event: PointerEvent) => {
    // On touch, keep the last highlight after the finger lifts.
    if (event.pointerType !== 'touch' && chart.highlightSource === 'pointer') {
      chart.clearHighlight(event)
    }
  }
  const onMove = (event: PointerEvent) => {
    if (overControl(event)) {
      onLeave(event)
      return
    }
    const point = local(event)
    if (point) chart.highlightAt(point.x, point.y, event)
  }
  const onClick = (event: MouseEvent) => {
    if (overControl(event)) return
    const point = local(event)
    const hit = point ? chart.hitTest(point.x, point.y) : null
    if (hit) chart.emit('click', { hit, event })
  }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerdown', onMove)
  el.addEventListener('pointerleave', onLeave)
  el.addEventListener('click', onClick)
  return () => {
    listening.delete(chart)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerdown', onMove)
    el.removeEventListener('pointerleave', onLeave)
    el.removeEventListener('click', onClick)
  }
}

/**
 * Pointer input: hovering highlights what is under the pointer and emits
 * `hover`, clicking emits `click`. The highlight and tooltip plugins turn it
 * on themselves; add it to a bare `Chart` that only needs the events.
 */
export function pointer(): ChartPlugin {
  return {
    name: 'pointer',
    install(chart) {
      const stop = listenPointer(chart)
      return stop ? { destroy: stop } : {}
    },
  }
}
