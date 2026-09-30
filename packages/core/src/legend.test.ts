// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { buildChart, Chart, type ChartConfig, resolveLegend } from './chart.ts'
import { bar } from './charts/bar.ts'
import { line } from './charts/line.ts'
import { defaultHidden, legendContent } from './legend.ts'
import { renderToString } from './render/string.ts'
import { flush } from './scheduler.ts'
import { findByClass } from './test-utils.ts'

const data = {
  labels: ['Jan', 'Feb', 'Mar'],
  series: [
    { name: 'Sales', values: [10, 30, 20] },
    { name: 'Costs', values: [100, 150, 120], id: 'costs' },
    { name: 'Tax', values: [2, 3, 4], hidden: true, color: '#f00' },
  ],
}
const base = { type: line, data, width: 400, height: 200, locale: 'en-US' } as ChartConfig<object>

describe('legendContent()', () => {
  test('renders one toggle button per entry with aria-pressed', () => {
    const html = renderToString(
      legendContent(
        [
          { key: 'a', name: 'A', index: 0 },
          { key: 'b', name: 'B & C', index: 1, color: '#f00' },
        ],
        new Set(['b']),
      ),
    )
    expect(html).toContain(
      '<button type="button" class="tc-legend-item tc-series tc-series-1" aria-pressed="true" data-key="a">',
    )
    expect(html).toContain(
      'tc-series-2 tc-legend-item-hidden" style="--tc-series-color:#f00" aria-pressed="false"',
    )
    expect(html).toContain('<span class="tc-legend-name">B &amp; C</span>')
  })

  test('defaultHidden() collects entries hidden by default', () => {
    expect(
      defaultHidden([
        { key: 'a', name: 'A', index: 0, hidden: true },
        { key: 'b', name: 'B', index: 1 },
      ]),
    ).toEqual(new Set(['a']))
  })
})

describe('resolveLegend()', () => {
  test('lists series with keys and shows the legend for two or more', () => {
    const legend = resolveLegend(base)
    expect(legend.items.map((i) => [i.key, i.index, i.hidden ?? false])).toEqual([
      ['Sales', 0, false],
      ['costs', 1, false],
      ['Tax', 2, true],
    ])
    expect(legend).toMatchObject({ show: true, position: 'top' })
  })

  test('hides the legend for a single series unless forced', () => {
    const single = { ...base, data: { ...data, series: data.series.slice(0, 1) } }
    expect(resolveLegend(single).show).toBe(false)
    expect(resolveLegend({ ...single, legend: true }).show).toBe(true)
    expect(resolveLegend({ ...base, legend: false }).show).toBe(false)
    expect(resolveLegend({ ...base, legend: { position: 'bottom' } }).position).toBe('bottom')
  })
})

describe('hidden series', () => {
  test('are skipped by default when hidden: true (SSR too), keeping color slots', () => {
    const node = buildChart(base, { width: 400, height: 200 })
    const groups = findByClass(node, 'tc-series').map((g) => g.attrs.class)
    expect(groups).toEqual(['tc-series tc-series-1', 'tc-series tc-series-2'])
  })

  test('leave the y domain', () => {
    const top = (config: ChartConfig<object>) => {
      const labels = findByClass(buildChart(config, { width: 400, height: 200 }), 'tc-tick-label')
      return labels.map((t) => t.children[0])
    }
    expect(top(base)).toContain('150')
    const withoutCosts = {
      ...base,
      data: {
        ...data,
        series: data.series.map((s) => (s.id === 'costs' ? { ...s, hidden: true } : s)),
      },
    }
    expect(top(withoutCosts)).not.toContain('150')
  })

  test('give up their slot in bar groups', () => {
    const all = { ...base, type: bar, data: { ...data, series: data.series.slice(0, 2) } }
    const bars = (config: ChartConfig<object>) =>
      findByClass(buildChart(config, { width: 400, height: 200 }), 'tc-bar').length
    expect(bars(all as ChartConfig<object>)).toBe(6)
    const one = {
      ...all,
      data: { ...all.data, series: [all.data.series[0], { ...all.data.series[1], hidden: true }] },
    }
    expect(bars(one as ChartConfig<object>)).toBe(3)
  })
})

describe('Chart legend', () => {
  let el: HTMLElement
  let chart: Chart<object>

  beforeEach(() => {
    el = document.createElement('div')
    document.body.appendChild(el)
  })

  afterEach(() => {
    chart.destroy()
    el.remove()
  })

  const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.tc-legend-item'))

  test('renders above the svg by default and below on request', () => {
    chart = new Chart(el, base)
    expect(el.firstElementChild?.className).toBe('tc-legend')
    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'false'])
    chart.destroy()
    chart = new Chart(el, { ...base, legend: { position: 'bottom' } })
    expect(el.querySelector('svg')?.nextElementSibling?.className).toBe('tc-legend')
  })

  test('toggles series on click and emits legend-toggle', () => {
    chart = new Chart(el, base)
    const spy = vi.fn()
    chart.on('legend-toggle', spy)
    buttons()[1]?.click()
    expect(spy).toHaveBeenCalledWith({ key: 'costs', name: 'Costs', index: 1, hidden: true })
    flush()
    expect(el.querySelectorAll('.tc-series-list > .tc-series')).toHaveLength(1)
    expect(buttons()[1]?.getAttribute('aria-pressed')).toBe('false')
    buttons()[2]?.click()
    flush()
    expect(el.querySelector('.tc-series-list .tc-series-3')).not.toBeNull()
    expect(chart.isHidden('Tax')).toBe(false)
  })

  test('toggleSeries() accepts keys, names and indexes', () => {
    chart = new Chart(el, base)
    chart.toggleSeries('costs', true)
    chart.toggleSeries('Sales')
    chart.toggleSeries(2, false)
    expect([chart.isHidden('Sales'), chart.isHidden('costs'), chart.isHidden('Tax')]).toEqual([
      true,
      true,
      false,
    ])
    chart.toggleSeries('missing')
  })

  test('keeps the same buttons when toggling (focus stays put)', () => {
    chart = new Chart(el, base)
    const first = buttons()[0]
    first?.click()
    flush()
    expect(buttons()[0]).toBe(first)
  })

  test('excludes hidden series from the tooltip', () => {
    chart = new Chart(el, base)
    const svg = el.querySelector('svg') as SVGSVGElement
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200 }) as DOMRect
    svg.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 200, clientY: 100, bubbles: true }),
    )
    expect(chart.hitTest(200, 100)?.items.map((i) => i.name)).toEqual(['Sales', 'Costs'])
  })

  test('can be disabled and is removed on destroy', () => {
    chart = new Chart(el, { ...base, legend: false })
    expect(el.querySelector('.tc-legend')).toBeNull()
    chart.update({ legend: true } as Partial<ChartConfig<object>>).render()
    expect(el.querySelector('.tc-legend')).not.toBeNull()
    chart.update({ legend: false } as Partial<ChartConfig<object>>).render()
    expect(el.querySelector('.tc-legend')).toBeNull()
    chart.update({ legend: true } as Partial<ChartConfig<object>>).render()
    chart.destroy()
    expect(el.querySelector('.tc-legend')).toBeNull()
  })
})
