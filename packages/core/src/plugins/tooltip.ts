import type { ChartPlugin } from '../plugin.ts'
import { render } from '../render/dom.ts'
import { placeTooltip, tooltipContent } from '../tooltip.ts'

/**
 * An HTML tooltip (`.tc-tooltip`) for the highlighted category, placed next
 * to it inside the chart element. Configure it with the `tooltip` option.
 */
export function tooltip(): ChartPlugin {
  return {
    name: 'tooltip',
    install(chart) {
      const el = chart.element as HTMLElement
      // Positioning context for the tooltip (zero specificity in CSS, so page styles win).
      const addedClass = !el.classList.contains('tc-container')
      el.classList.add('tc-container')
      let tip: HTMLElement | undefined

      return {
        afterRender() {
          const option = chart.config.tooltip
          const hit = chart.active
          const anchor = chart.anchor
          if (option === false || typeof document === 'undefined') {
            tip?.removeAttribute('data-visible')
            return
          }
          if (!hit || !anchor) {
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
          const sx = rect.width > 0 ? rect.width / width : 1
          const sy = rect.height > 0 ? rect.height / height : 1
          const origin = {
            x: rect.left - box.left - el.clientLeft,
            y: rect.top - box.top - el.clientTop,
          }
          // Snap to the category, follow the pointer along the values.
          const ax = hit.axis === 'y' ? anchor.x : hit.x
          const ay = hit.axis === 'y' ? (hit.y ?? anchor.y) : anchor.y
          const place = placeTooltip(
            { x: origin.x + ax * sx, y: origin.y + ay * sy },
            { width: tip.offsetWidth, height: tip.offsetHeight },
            { width: el.clientWidth || width, height: el.clientHeight || height },
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
        },
      }
    },
  }
}
