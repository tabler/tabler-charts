import { tableContent } from '../a11y.ts'
import { renderContext } from '../chart.ts'
import type { ChartPlugin } from '../plugin.ts'
import { render } from '../render/dom.ts'

/**
 * The chart data as an HTML table next to the SVG: visually hidden for
 * screen readers by default, visible with `table: 'visible'`.
 */
export function dataTable(): ChartPlugin {
  return {
    name: 'table',
    install(chart) {
      const host = chart.element
      let el: HTMLElement | undefined

      const remove = () => {
        if (!el) return
        render(el, null)
        el.remove()
        el = undefined
      }

      return {
        afterRender({ config, size, hidden, stale }) {
          if (!stale && el?.isConnected) return
          const option = config.table ?? true
          const table =
            option !== false && typeof document !== 'undefined'
              ? config.type.table?.(
                  config,
                  renderContext(config, size, chart.id, () => {}, hidden),
                )
              : undefined
          if (!table) {
            remove()
            return
          }
          if (!el) el = host.ownerDocument.createElement('div')
          el.className = option === 'visible' ? 'tc-table-wrap' : 'tc-table-wrap tc-sr-only'
          render(el, tableContent(table, config.title))
          const svg = host.querySelector(':scope > svg.tc-chart')
          const bottomLegend = host.querySelector(':scope > .tc-legend[data-position="bottom"]')
          const after = bottomLegend ?? svg
          if (after && after.nextElementSibling !== el) after.after(el)
          else if (!el.isConnected) host.appendChild(el)
        },
        destroy: remove,
      }
    },
  }
}
