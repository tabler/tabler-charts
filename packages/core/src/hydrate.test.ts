// @vitest-environment happy-dom
import { afterEach, describe, expect, test } from 'vitest'
import { tableContent } from './a11y.ts'
import { type ChartConfig, chartToString, resolveLegend } from './chart.ts'
import { Chart } from './chart-default.ts'
import { line } from './charts/line.ts'
import './hydrate.ts'
import { legendContent } from './legend.ts'
import { render } from './render/dom.ts'
import { renderToString } from './render/string.ts'
import { flush } from './scheduler.ts'
import { tableOf } from './test-utils.ts'
import { h } from './vnode.ts'

const size = { width: 300, height: 150 }
const config: ChartConfig<object> = {
  type: line,
  data: {
    labels: ['a', 'b', 'c'],
    series: [
      { name: 'A', values: [1, 2, 3] },
      { name: 'B', values: [3, 2, 1] },
    ],
  },
  id: 'ssr',
  locale: 'en-US',
  ...size,
} as ChartConfig<object>

/** What a server-side adapter would output: legend, chart and table. */
function serverMarkup(): string {
  const legend = resolveLegend(config)
  const table = tableOf(config, 1000)
  return (
    `<div class="tc-legend" data-position="top">${renderToString(legendContent(legend.items, new Set()))}</div>` +
    chartToString(config, size) +
    `<div class="tc-table-wrap tc-sr-only">${table ? renderToString(tableContent(table)) : ''}</div>`
  )
}

let el: HTMLElement
let chart: Chart<object> | undefined

afterEach(() => {
  chart?.destroy()
  el.remove()
})

describe('hydrating server-rendered markup', () => {
  test('hydrates the server svg, legend and table in place instead of re-creating them', () => {
    el = document.createElement('div')
    el.innerHTML = serverMarkup()
    document.body.appendChild(el)
    const svg = el.querySelector('svg')
    const line = el.querySelector('.tc-series-1 .tc-line')
    const tick = el.querySelector('.tc-axis-x .tc-tick-label')?.firstChild
    const legendButton = el.querySelector('.tc-legend-item')
    const tableCell = el.querySelector('.tc-table td')
    chart = new Chart(el, config)
    // The very same nodes, down to the text of a tick label.
    expect(el.querySelector('svg')).toBe(svg)
    expect(el.querySelector('.tc-series-1 .tc-line')).toBe(line)
    expect(el.querySelector('.tc-axis-x .tc-tick-label')?.firstChild).toBe(tick)
    expect(el.querySelector('.tc-legend-item')).toBe(legendButton)
    expect(el.querySelector('.tc-table td')).toBe(tableCell)
    // Transitions are off while the hydrated markup snaps to the client layout.
    expect(svg?.hasAttribute('data-resizing')).toBe(true)
  })

  test('patches what differs from the server markup, ending up as a fresh render', () => {
    /** The chart svg as a string, without the transient resize flag. */
    const markup = (host: Element) =>
      (host.querySelector('svg')?.outerHTML ?? '').replace(' data-resizing=""', '')

    // Rendered on the server at another size, with other data and one series fewer.
    el = document.createElement('div')
    const other = {
      ...config,
      data: { labels: ['a', 'b'], series: [{ name: 'A', values: [5, 1] }] },
    }
    el.innerHTML = chartToString(other as ChartConfig<object>, { width: 600, height: 300 })
    document.body.appendChild(el)
    const svg = el.querySelector('svg')
    chart = new Chart(el, config)
    expect(el.querySelector('svg')).toBe(svg)
    expect(svg?.getAttribute('viewBox')).toBe('0 0 300 150')

    const fresh = document.createElement('div')
    document.body.appendChild(fresh)
    const reference = new Chart(fresh, config)
    expect(markup(el)).toBe(markup(fresh))
    reference.destroy()
    fresh.remove()

    // Later updates patch the hydrated nodes like any others (series are keyed).
    const first = el.querySelector('.tc-series-1')
    chart.update({ data: { ...(config as unknown as { data: object }).data } } as never)
    flush()
    expect(el.querySelector('.tc-series-1')).toBe(first)
  })

  test('replaces the svg, legend and table instead of duplicating them', () => {
    el = document.createElement('div')
    el.innerHTML = serverMarkup()
    document.body.appendChild(el)
    chart = new Chart(el, config)
    expect(el.querySelectorAll('svg')).toHaveLength(1)
    expect(el.querySelectorAll('.tc-legend')).toHaveLength(1)
    expect(el.querySelectorAll('.tc-legend-items')).toHaveLength(1)
    expect(el.querySelectorAll('.tc-table')).toHaveLength(1)
    expect(Array.from(el.children).map((c) => c.getAttribute('class')?.split(' ')[0])).toEqual([
      'tc-legend',
      'tc-chart',
      'tc-table-wrap',
    ])
    // The adopted markup is live: legend clicks and updates work.
    el.querySelector<HTMLButtonElement>('.tc-legend-item')?.click()
    flush()
    expect(el.querySelectorAll('.tc-series-list > .tc-series')).toHaveLength(1)
    chart.destroy()
    expect(el.innerHTML).toBe('')
  })

  test('mounts normally when there is nothing to adopt', () => {
    el = document.createElement('div')
    document.body.appendChild(el)
    chart = new Chart(el, config)
    expect(el.querySelectorAll('svg')).toHaveLength(1)
  })

  test('render() with replace takes the place of the given element once', () => {
    el = document.createElement('div')
    el.innerHTML = '<p>old</p><span>keep</span>'
    const old = el.querySelector('p') as Element
    const root = render(el, h('div', { class: 'new' }), old)
    expect(el.innerHTML).toBe('<div class="new"></div><span>keep</span>')
    expect(render(el, h('div', { class: 'new two' }), old)).toBe(root)
    expect(el.querySelectorAll('div')).toHaveLength(1)
  })
})
