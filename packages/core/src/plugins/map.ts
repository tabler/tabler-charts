import type { MapHit, MapInteraction, MapOptions } from '../charts/map.ts'
import { fitView, type MapView } from '../charts/map-view.ts'
import { toChartPoint } from '../interaction.ts'
import type { ChartPlugin } from '../plugin.ts'

type Point = [number, number]

/** One step of a button, a key or a double click. */
const ZOOM_STEP = 2
const ZOOM_DURATION = 200
/**
 * How much one unit of wheel movement magnifies. A pinch on a trackpad comes
 * as a wheel event with `ctrlKey` and much smaller numbers.
 */
const WHEEL_SPEED = 0.002
const WHEEL_SPEED_PINCH = 0.01
/** How far a pointer has to move, in pixels, before a press becomes a drag and stops being a click. */
const DRAG_THRESHOLD = 4
const SVG_NS = 'http://www.w3.org/2000/svg'
const ICONS = ['M12 5v14M5 12h14', 'M5 12h14']

/**
 * What makes a map more than a picture: with `zoom` it is magnified with its
 * buttons, the wheel, a double click, a pinch or the `+`, `-` and `0` keys,
 * and dragged around; with `select` a click (or Enter) selects a region. The
 * `map` chart type brings it along, so it needs no import of its own; it
 * keeps no state, the view and the selection live in the options.
 */
export function mapInteraction(): ChartPlugin {
  return {
    name: 'map',
    install(chart) {
      const host = chart.element
      if (typeof host.addEventListener !== 'function') return {}
      const doc = host.ownerDocument
      const win = doc.defaultView
      const options = () => chart.config as unknown as MapOptions & { animate?: boolean }
      const isMap = () => chart.config.type.name === 'map'
      const zoomOn = () => isMap() && !!options().zoom
      const layout = () => (chart.interaction as Partial<MapInteraction> | undefined)?.map
      const svg = () => host.querySelector(':scope > svg.tc-chart')
      /** Whether an event happened on the drawing, not on a control over it. */
      const onMap = (event: Event) =>
        (event.target as Element | null)?.closest?.('svg.tc-chart') === svg() && !!svg()

      let frame = 0
      /** Pointers that are down on the map, with where each was last seen. */
      const pointers = new Map<number, Point>()
      /** Whether the pointers that are down have moved the map: the click that ends a drag selects nothing. */
      let dragged = false
      let controls: HTMLElement | undefined
      const addedClass = !host.classList.contains('tc-container')

      const stop = () => win?.cancelAnimationFrame(frame)
      const current = (): MapView | undefined => {
        const l = layout()
        return l && fitView(options().view, l)
      }
      const setView = (view: MapView) => {
        const l = layout()
        if (l) chart.update({ view: fitView(view, l) } as never)
      }

      /** A point of the screen in chart pixels. */
      const toChart = (x: number, y: number): Point => {
        const el = svg()
        const { width, height } = chart.size
        const p = el ? toChartPoint(el, x, y, width, height) : { x: 0, y: 0 }
        return [p.x, p.y]
      }
      /** A point of the screen in the coordinates of the map. */
      const toMapPoint = (x: number, y: number): Point | null => {
        const l = layout()
        const view = current()
        if (!l || !view) return null
        const unit = l.k * view.scale
        const [cx, cy] = toChart(x, y)
        return [view.x + (cx - l.x) / unit, view.y + (cy - l.y) / unit]
      }

      /**
       * Moves to a view over a few frames. The corner and the size of the
       * view change at the same pace, which keeps the point being zoomed at in place.
       */
      const animateTo = (to: MapView) => {
        stop()
        const l = layout()
        const from = current()
        if (!l || !from) return
        const target = fitView(to, l)
        const still =
          options().animate === false ||
          !win?.requestAnimationFrame ||
          win.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        if (still) {
          setView(target)
          return
        }
        const start = performance.now()
        const step = (now: number) => {
          const t = Math.min((now - start) / ZOOM_DURATION, 1)
          const eased = 1 - (1 - t) ** 3
          const at = (a: number, b: number) => a + (b - a) * eased
          setView({
            x: at(from.x, target.x),
            y: at(from.y, target.y),
            scale: 1 / at(1 / from.scale, 1 / target.scale),
          })
          if (t < 1) frame = win.requestAnimationFrame(step)
        }
        frame = win.requestAnimationFrame(step)
      }

      /**
       * Magnifies by a factor around a point of the map, which stays where it
       * is on the screen. Without a point, around the middle of the view.
       */
      const zoomBy = (factor: number, anchor: Point | null, animate = false) => {
        const l = layout()
        const view = current()
        if (!l || !view || !(l.k > 0)) return
        const next = Math.min(l.max, Math.max(1, view.scale * factor))
        const unit = l.k * view.scale
        const [ax, ay] = anchor ?? [view.x + l.width / unit / 2, view.y + l.height / unit / 2]
        const target = {
          x: ax - ((ax - view.x) * view.scale) / next,
          y: ay - ((ay - view.y) * view.scale) / next,
          scale: next,
        }
        if (animate) animateTo(target)
        else {
          stop()
          setView(target)
        }
      }

      /** Selects the region of a hit, or takes it out when it is selected. */
      const select = (hit: MapHit | null) => {
        const o = options()
        const code = hit?.region
        if (!isMap() || !o.select || !code) return
        const selected = [...(o.selected ?? [])]
        const rest = selected.filter((other) => other !== code)
        const next =
          rest.length < selected.length
            ? rest
            : o.select === 'multiple'
              ? [...selected, code]
              : [code]
        chart.update({ selected: next } as never)
        o.onSelect?.(next, code)
      }

      const onPointerEnd = (event: PointerEvent) => {
        pointers.delete(event.pointerId)
        if (pointers.size === 0) {
          doc.removeEventListener('pointerup', onPointerEnd)
          doc.removeEventListener('pointercancel', onPointerEnd)
          // The cursor of a drag goes with the next render.
          if (dragged) chart.update({})
        }
      }
      const onPointerDown = (event: PointerEvent) => {
        if (!zoomOn() || !onMap(event) || (event.pointerType === 'mouse' && event.button !== 0))
          return
        if (pointers.size === 0) dragged = false
        pointers.set(event.pointerId, [event.clientX, event.clientY])
        stop()
        doc.addEventListener('pointerup', onPointerEnd)
        doc.addEventListener('pointercancel', onPointerEnd)
      }
      /** One pointer drags the map, two pinch it. */
      const onPointerMove = (event: PointerEvent) => {
        const previous = pointers.get(event.pointerId)
        const view = current()
        const l = layout()
        if (!previous || !view || !l) return
        const now: Point = [event.clientX, event.clientY]
        // A press that barely moves is a click, not a drag: until the pointer
        // has moved far enough the map stays put, and the click reaches the region.
        if (!dragged) {
          if (
            pointers.size === 1 &&
            Math.hypot(now[0] - previous[0], now[1] - previous[1]) < DRAG_THRESHOLD
          )
            return
          dragged = true
          // The map keeps getting the moves of this pointer when it leaves the
          // map. Capturing throws for a pointer the browser does not know,
          // which is what an event made in a script has.
          try {
            svg()?.setPointerCapture(event.pointerId)
          } catch {
            // The drag still works while the pointer stays over the map.
          }
        }
        // The highlight and the tooltip stay out of a drag.
        event.stopPropagation()
        chart.clearHighlight()
        pointers.set(event.pointerId, now)
        if (pointers.size === 1) {
          const unit = l.k * view.scale
          const [x0, y0] = toChart(previous[0], previous[1])
          const [x1, y1] = toChart(now[0], now[1])
          setView({ x: view.x - (x1 - x0) / unit, y: view.y - (y1 - y0) / unit, scale: view.scale })
          return
        }
        const other = [...pointers].find(([id]) => id !== event.pointerId)?.[1]
        if (!other) return
        const before = Math.hypot(previous[0] - other[0], previous[1] - other[1])
        const after = Math.hypot(now[0] - other[0], now[1] - other[1])
        if (before > 0 && after > 0)
          zoomBy(after / before, toMapPoint((now[0] + other[0]) / 2, (now[1] + other[1]) / 2))
      }
      const onWheel = (event: WheelEvent) => {
        const { zoom } = options()
        if (!zoomOn() || (typeof zoom === 'object' && zoom.wheel === false) || !onMap(event)) return
        // The page must not scroll while the wheel zooms the map.
        event.preventDefault()
        zoomBy(
          Math.exp(-event.deltaY * (event.ctrlKey ? WHEEL_SPEED_PINCH : WHEEL_SPEED)),
          toMapPoint(event.clientX, event.clientY),
        )
      }
      const onDoubleClick = (event: MouseEvent) => {
        if (zoomOn() && onMap(event))
          zoomBy(ZOOM_STEP, toMapPoint(event.clientX, event.clientY), true)
      }
      /** The click that ends a drag is not a click on the map. */
      const onClickCapture = (event: MouseEvent) => {
        if (dragged) event.stopPropagation()
        dragged = false
      }
      const onKey = (event: KeyboardEvent) => {
        if (event.target !== svg() || !isMap()) return
        const { key } = event
        if (zoomOn() && (key === '+' || key === '=')) zoomBy(ZOOM_STEP, null, true)
        else if (zoomOn() && key === '-') zoomBy(1 / ZOOM_STEP, null, true)
        else if (zoomOn() && key === '0') animateTo({ x: 0, y: 0, scale: 1 })
        else if (options().select && (key === 'Enter' || key === ' ') && chart.active)
          select(chart.active)
        else return
        event.preventDefault()
      }
      const onControl = (event: MouseEvent) => {
        const button = (event.target as Element).closest('button')
        if (button) zoomBy(button.value === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP, null, true)
      }

      // Moves are taken on their way down, so a drag never reaches the highlight.
      host.addEventListener('pointermove', onPointerMove, true)
      host.addEventListener('click', onClickCapture, true)
      host.addEventListener('pointerdown', onPointerDown)
      // (Not passive: the wheel must be kept from scrolling the page.)
      host.addEventListener('wheel', onWheel, { passive: false })
      host.addEventListener('dblclick', onDoubleClick)
      host.addEventListener('keydown', onKey)
      const off = chart.on('click', ({ hit }) => select(hit))

      /** The zoom buttons, laid over a corner of the map. */
      const renderControls = () => {
        if (!zoomOn()) {
          controls?.remove()
          controls = undefined
          return
        }
        if (!controls) {
          controls = doc.createElement('div')
          controls.className = 'tc-map-zoom'
          for (const [i, d] of ICONS.entries()) {
            const button = doc.createElement('button')
            button.type = 'button'
            button.className = 'tc-download-toggle'
            button.value = i ? 'out' : 'in'
            const icon = doc.createElementNS(SVG_NS, 'svg')
            icon.setAttribute('viewBox', '0 0 24 24')
            icon.setAttribute('width', '16')
            icon.setAttribute('height', '16')
            icon.setAttribute('aria-hidden', 'true')
            const path = doc.createElementNS(SVG_NS, 'path')
            path.setAttribute('d', d)
            icon.append(path)
            button.append(icon)
            controls.append(button)
          }
          controls.addEventListener('click', onControl)
          host.classList.add('tc-container')
        }
        if (!controls.isConnected) host.append(controls)
        const { zoom } = options()
        const labels = typeof zoom === 'object' ? zoom.labels : undefined
        const view = current()
        const max = layout()?.max ?? 1
        const [zoomIn, zoomOut] = controls.querySelectorAll('button')
        if (zoomIn && zoomOut && view) {
          zoomIn.setAttribute('aria-label', labels?.in ?? 'Zoom in')
          zoomOut.setAttribute('aria-label', labels?.out ?? 'Zoom out')
          zoomIn.disabled = view.scale >= max
          zoomOut.disabled = view.scale <= 1
        }
      }

      return {
        // The stylesheet takes drags and pinches for a map that can be
        // magnified, so the page does not scroll or zoom under the finger.
        svgAttrs: () =>
          zoomOn() ? { 'data-zoom': dragged && pointers.size ? 'drag' : '' } : undefined,
        afterRender: renderControls,
        destroy() {
          stop()
          off()
          host.removeEventListener('pointermove', onPointerMove, true)
          host.removeEventListener('click', onClickCapture, true)
          host.removeEventListener('pointerdown', onPointerDown)
          host.removeEventListener('wheel', onWheel)
          host.removeEventListener('dblclick', onDoubleClick)
          host.removeEventListener('keydown', onKey)
          doc.removeEventListener('pointerup', onPointerEnd)
          doc.removeEventListener('pointercancel', onPointerEnd)
          controls?.remove()
          if (controls && addedClass) host.classList.remove('tc-container')
        },
      }
    },
  }
}
