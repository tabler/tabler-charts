import { legendContent } from '../legend.ts'
import type { ChartPlugin } from '../plugin.ts'
import { render } from '../render/dom.ts'

/**
 * An HTML legend (`.tc-legend`) with toggle buttons, above or below the SVG.
 * Shown for two or more entries unless the `legend` option says otherwise.
 */
export function legend(): ChartPlugin {
  return {
    name: 'legend',
    install(chart) {
      const host = chart.element
      let el: HTMLElement | undefined

      const remove = () => {
        if (!el) return
        render(el, null)
        el.remove()
        el = undefined
      }

      /** Keep the legend right before or after the SVG, whatever else lives in the container. */
      const place = () => {
        if (!el) return
        const svg = host.querySelector(':scope > svg.tc-chart')
        if (el.dataset.position === 'bottom') {
          if (!svg) {
            if (!el.isConnected) host.appendChild(el)
          } else if (svg.nextElementSibling !== el) {
            svg.after(el)
          }
        } else if (!el.isConnected || el.nextElementSibling !== svg) {
          host.insertBefore(el, svg ?? host.firstChild)
        }
      }

      return {
        beforeRender({ legend, hidden }) {
          if (!legend.show || typeof document === 'undefined') {
            remove()
            return
          }
          if (!el) {
            el = host.ownerDocument.createElement('div')
            el.className = 'tc-legend'
            el.addEventListener('click', (event) => {
              const button = (event.target as Element).closest?.('.tc-legend-item')
              const key = button?.getAttribute('data-key')
              if (key != null) chart.toggleSeries(key)
            })
          }
          el.dataset.position = legend.position
          render(el, legendContent(legend.items, hidden))
          place()
        },
        reservedHeight: () => (el?.isConnected ? el.offsetHeight : 0),
        afterRender: place,
        destroy: remove,
      }
    },
  }
}
