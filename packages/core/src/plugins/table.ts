import { tableContent } from '../a11y.ts'
import { type ChartConfig, renderContext, type Size } from '../chart.ts'
import { getNumberFormat } from '../format.ts'
import { cancelIdle, scheduleIdle } from '../idle.ts'
import type { ChartPlugin } from '../plugin.ts'
import { render } from '../render/dom.ts'

/**
 * The chart data as an HTML table next to the SVG: visually hidden for
 * screen readers by default, visible with `table: 'visible'`.
 */
const DEFAULT_MAX_ROWS = 1000

export function dataTable(): ChartPlugin {
  return {
    name: 'table',
    install(chart) {
      const host = chart.element
      // Take over a server-rendered table instead of adding a second one.
      let el = host.querySelector<HTMLElement>(':scope > .tc-table-wrap') ?? undefined
      let adopt = el?.firstElementChild ?? null

      /** The table option of the last table, to tell its changes from new data. */
      let shown: unknown
      const key = {}

      const remove = () => {
        cancelIdle(key)
        if (!el) return
        render(el, null)
        el.remove()
        el = undefined
      }

      const update = (config: ChartConfig<object>, size: Size, hidden: ReadonlySet<string>) => {
        const option = config.table ?? true
        const maxRows =
          typeof option === 'object' && option.maxRows ? option.maxRows : DEFAULT_MAX_ROWS
        const table =
          option !== false && typeof document !== 'undefined'
            ? config.type.table?.(
                config,
                renderContext(config, size, chart.id, () => {}, hidden, chart.fontSize),
                maxRows,
              )
            : undefined
        if (!table) {
          remove()
          return
        }
        const visible =
          option === 'visible' || (typeof option === 'object' && option.visible === true)
        // Huge tables help nobody and cost real time to build; keep the first rows.
        let caption = config.title
        const total = table.total ?? table.rows.length
        const rows =
          table.rows.length > maxRows
            ? { columns: table.columns, rows: table.rows.slice(0, maxRows) }
            : table
        if (total > rows.rows.length) {
          const n = getNumberFormat(config.locale)
          const note = `${n.format(rows.rows.length)} of ${n.format(total)} rows`
          caption = caption ? `${caption} (${note})` : note
        }
        if (!el) el = host.ownerDocument.createElement('div')
        el.className = visible ? 'tc-table-wrap' : 'tc-table-wrap tc-sr-only'
        render(el, tableContent(rows, caption), adopt)
        adopt = null
        const svg = host.querySelector(':scope > svg.tc-chart')
        const bottomLegend = host.querySelector(':scope > .tc-legend[data-position="bottom"]')
        const after = bottomLegend ?? svg
        if (after && after.nextElementSibling !== el) after.after(el)
        else if (!el.isConnected) host.appendChild(el)
      }

      return {
        afterRender({ config, size, hidden, changed }) {
          // Resizing changes nothing in the table.
          if (!changed && el?.isConnected) return
          const option = config.table ?? true
          const same = shown === option
          shown = option
          // A hidden table only serves screen readers: rebuilding thousands of
          // cells for new data can wait until the browser is idle instead of
          // delaying the frame that animates the chart. The first table, visible
          // ones and changes of the table option itself are built right away.
          if (same && el?.isConnected && el.classList.contains('tc-sr-only')) {
            scheduleIdle(key, () => update(config, size, hidden))
          } else {
            cancelIdle(key)
            update(config, size, hidden)
          }
        },
        destroy: remove,
      }
    },
  }
}
