import { swatchShape } from '../features.ts'
import { legendContent } from '../legend.ts'
import type { ChartPlugin } from '../plugin.ts'
import { render } from '../render/dom.ts'

/** The side a legend beside the chart takes in a right-to-left chart. */
const MIRROR: Record<string, string | undefined> = { left: 'right', right: 'left' }

/**
 * Classes on the container of a legend beside the chart, and of one before
 * it. A class rather than `:has()` in the stylesheet: a selector such as
 * `:where(:has(> .tc-legend…))` matches any element, so the browser checks it
 * again on every change to the page (a hover, a tooltip), which stalls a page
 * of charts.
 */
const BESIDE = 'tc-legend-beside'
const START = 'tc-legend-start'

/**
 * An HTML legend (`.tc-legend`) with toggle buttons, above, below or beside the SVG.
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
        host.classList.remove(BESIDE, START)
      }

      /** Whether the legend follows the SVG in the container (below it, or beside it at the end). */
      let after = false
      const side = () => {
        const position = el?.dataset.position
        return position === 'left' || position === 'right'
      }

      /** Keep the legend right before or after the SVG, whatever else lives in the container. */
      const place = () => {
        if (!el) return
        const svg = host.querySelector(':scope > svg.tc-chart')
        if (after) {
          if (!svg) {
            if (!el.isConnected) host.appendChild(el)
          } else if (svg.nextElementSibling !== el) {
            svg.after(el)
          }
        } else if (!el.isConnected || el.nextElementSibling !== svg) {
          host.insertBefore(el, svg ?? host.firstChild)
        }
      }

      /** Put the legend at `position`: beside the chart it comes first on the container's start side. */
      const put = (position: string) => {
        if (!el) return
        el.dataset.position = position
        after =
          position === 'bottom' ||
          (side() && (position === 'right') !== (getComputedStyle(host).direction === 'rtl'))
        place()
        // The container lays a legend beside the chart out in two columns (style.css).
        host.classList.toggle(BESIDE, side())
        host.classList.toggle(START, side() && !after)
      }

      /** Space between the chart and a legend beside it. */
      const gap = () => Number.parseFloat(getComputedStyle(host).columnGap) || 0

      return {
        beforeRender({ config, legend, hidden }) {
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
          // A right-to-left chart reads right to left, whatever the page around it.
          el.dir = chart.rtl ? 'rtl' : ''
          render(el, legendContent(legend.items, hidden, swatchShape(config)), adopt)
          adopt = null
          const { position } = legend
          const beside = position === 'auto' ? 'right' : position
          // Beside the chart, sides swap in a right-to-left chart.
          put((chart.rtl && MIRROR[beside]) || beside)
          // Beside the chart when it keeps two thirds of the container, else below it.
          if (position === 'auto' && (el.offsetWidth + gap()) * 3 > host.clientWidth) put('bottom')
        },
        // With its margin: the gap to the chart is taken from the container too.
        reservedHeight() {
          if (!el?.isConnected || side()) return 0
          const { marginTop, marginBottom } = getComputedStyle(el)
          return (
            el.offsetHeight +
            (Number.parseFloat(marginTop) || 0) +
            (Number.parseFloat(marginBottom) || 0)
          )
        },
        reservedWidth() {
          return el?.isConnected && side() ? el.offsetWidth + gap() : 0
        },
        afterRender: place,
        destroy: remove,
      }
    },
  }
}
