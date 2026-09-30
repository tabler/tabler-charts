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
      // Take over a server-rendered legend instead of adding a second one.
      let el = host.querySelector<HTMLElement>(':scope > .tc-legend') ?? undefined
      let adopt = el?.firstElementChild ?? null
      let bound = false
      const onClick = (event: Event) => {
        const button = (event.target as Element).closest?.('.tc-legend-item')
        const key = button?.getAttribute('data-key')
        if (key != null) chart.toggleSeries(key)
      }

      const remove = () => {
        if (!el) return
        render(el, null)
        el.removeEventListener('click', onClick)
        bound = false
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
          }
          if (!bound) {
            el.addEventListener('click', onClick)
            bound = true
          }
          el.dataset.position = legend.position
          render(el, legendContent(legend.items, hidden), adopt)
          adopt = null
          place()
        },
        reservedHeight: () => (el?.isConnected ? el.offsetHeight : 0),
        afterRender: place,
        destroy: remove,
      }
    },
  }
}
