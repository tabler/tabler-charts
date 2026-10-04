import type { ChartPlugin } from '../plugin.ts'
import { render } from '../render/dom.ts'
import { hitAnchor, placeTooltip, tooltipContent } from '../tooltip.ts'
import { listenPointer } from './pointer.ts'

/**
 * Where a tooltip in `el` can show without being cut off: the box of the
 * nearest element that clips its overflow (`el` itself, an ancestor, across
 * shadow roots), within the viewport.
 */
function room(el: Element): { left: number; top: number; right: number; bottom: number } {
  let left = 0
  let top = 0
  let right = innerWidth
  let bottom = innerHeight
  for (let node: Element | null = el; node; ) {
    const style = getComputedStyle(node)
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
      const box = node.getBoundingClientRect()
      left = Math.max(left, box.left)
      top = Math.max(top, box.top)
      right = Math.min(right, box.right)
      bottom = Math.min(bottom, box.bottom)
      break
    }
    node = node.parentElement ?? ((node.getRootNode() as ShadowRoot).host || null)
  }
  return { left, top, right, bottom }
}

/**
 * An HTML tooltip (`.tc-tooltip`) for the highlighted category, placed next
 * to it inside the chart element. Configure it with the `tooltip` option.
 */
export function tooltip(): ChartPlugin {
  return {
    name: 'tooltip',
    install(chart) {
      const stop = listenPointer(chart)
      const el = chart.element as HTMLElement
      // Positioning context for the tooltip (zero specificity in CSS, so page styles win).
      const addedClass = !el.classList.contains('tc-container')
      el.classList.add('tc-container')
      let tip: HTMLElement | undefined

      return {
        afterRender() {
          const option = chart.config.tooltip
          const hit = chart.active
          const anchor = hit && hitAnchor(hit, chart.pointer)
          if (option === false || typeof document === 'undefined') {
            tip?.removeAttribute('data-visible')
            return
          }
          if (!hit || !anchor || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) {
            tip?.removeAttribute('data-visible')
            return
          }
          if (!tip) {
            tip = el.ownerDocument.createElement('div')
            tip.className = 'tc-tooltip'
            tip.setAttribute('aria-hidden', 'true')
            el.appendChild(tip)
          }
          render(tip, tooltipContent(hit, typeof option === 'object' ? option : undefined))

          const svg = el.querySelector('svg.tc-chart')
          if (!svg) return
          const { width, height } = chart.size
          const box = el.getBoundingClientRect()
          const rect = svg.getBoundingClientRect()
          // Screen pixels per pixel of the container (transformed or zoomed ancestors).
          const k =
            box.width > 0 && (el as HTMLElement).offsetWidth > 0
              ? box.width / (el as HTMLElement).offsetWidth
              : 1
          const sx = rect.width > 0 ? rect.width / width / k : 1
          const sy = rect.height > 0 ? rect.height / height / k : 1
          const origin = {
            x: (rect.left - box.left) / k - el.clientLeft,
            y: (rect.top - box.top) / k - el.clientTop,
          }
          // Snap to the category, follow the pointer along the values
          // (a radar spoke runs both ways, so there it follows the pointer).
          const ax = hit.axis === 'y' || hit.guide ? anchor.x : hit.x
          const ay = hit.axis === 'y' ? (hit.y ?? anchor.y) : anchor.y
          // The tooltip may leave the container, up to what would cut it off.
          const clip = room(el)
          const place = placeTooltip(
            { x: origin.x + ax * sx, y: origin.y + ay * sy },
            { width: tip.offsetWidth, height: tip.offsetHeight },
            {
              x: (clip.left - box.left) / k - el.clientLeft,
              y: (clip.top - box.top) / k - el.clientTop,
              width: (clip.right - clip.left) / k,
              height: (clip.bottom - clip.top) / k,
            },
          )
          tip.style.transform = `translate(${place.x}px, ${place.y}px)`
          tip.dataset.side = place.side
          if (!tip.hasAttribute('data-visible')) {
            // Commit the position before becoming visible, so it does not glide in from the old spot.
            void getComputedStyle(tip).transform
            tip.setAttribute('data-visible', '')
          }
        },
        destroy() {
          if (tip) {
            render(tip, null)
            tip.remove()
          }
          if (addedClass) el.classList.remove('tc-container')
          stop?.()
        },
      }
    },
  }
}
