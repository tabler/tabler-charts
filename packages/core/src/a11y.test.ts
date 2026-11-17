// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { describeHit, tableContent } from './a11y.ts'
import type { ChartConfig } from './chart.ts'
import { Chart } from './chart-default.ts'
import { bar } from './charts/bar.ts'
import { line } from './charts/line.ts'
import { sparkline } from './charts/sparkline.ts'
import { renderToString } from './render/string.ts'
import { flush } from './scheduler.ts'

const data = {
  labels: ['Jan', 'Feb', 'Mar'],
  series: [
    { name: 'Visitors', values: [3200, 4100, null] },
    { name: 'Sign-ups', values: [800, 1200, 950] },
  ],
}
const base = {
  type: line,
  data,
  width: 400,
  height: 200,
  locale: 'en-US',
  title: 'Traffic',
} as ChartConfig<object>

describe('tableContent()', () => {
  test('renders a captioned table with scoped headers', () => {
    const html = renderToString(
      tableContent({ columns: ['', 'A', 'B'], rows: [['Jan', '1', '2']] }, 'Sales & costs'),
    )
    expect(html).toBe(
      '<table class="tc-table"><caption>Sales &amp; costs</caption>' +
        '<thead><tr><th scope="col"></th><th scope="col">A</th><th scope="col">B</th></tr></thead>' +
        '<tbody><tr><th scope="row">Jan</th><td>1</td><td>2</td></tr></tbody></table>',
    )
  })
})

describe('describeHit()', () => {
  const area = { x: 0, y: 0, width: 1, height: 1 }
  const hit = {
    index: 0,
    label: 'Jan',
    title: 'January',
    x: 0,
    area,
    items: [
      { name: 'A', seriesIndex: 0, value: 1, text: '1', x: 0, y: 0 },
      { name: 'B', seriesIndex: 1, value: 2, text: '2', x: 0, y: 0 },
    ],
  }

  test('lists every series, or only the focused one', () => {
    expect(describeHit(hit)).toBe('January: A 1, B 2')
    expect(describeHit({ ...hit, seriesIndex: 1 })).toBe('January: B 2')
  })
})

describe('Chart accessibility', () => {
  let el: HTMLElement
  let chart: Chart<object>
  const svg = () => el.querySelector('svg') as SVGSVGElement
  const key = (k: string) =>
    svg().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
  const live = () => el.querySelector('[aria-live]')?.textContent

  beforeEach(() => {
    el = document.createElement('div')
    document.body.appendChild(el)
  })

  afterEach(() => {
    chart.destroy()
    el.remove()
  })

  test('renders a visually hidden data table with formatted values', () => {
    chart = new Chart(el, base)
    const wrap = el.querySelector('.tc-table-wrap')
    expect(wrap?.classList.contains('tc-sr-only')).toBe(true)
    expect(wrap?.querySelector('caption')?.textContent).toBe('Traffic')
    const rows = Array.from(el.querySelectorAll('.tc-table tr')).map((tr) =>
      Array.from(tr.children).map((c) => c.textContent),
    )
    expect(rows).toEqual([
      ['', 'Visitors', 'Sign-ups'],
      ['Jan', '3,200', '800'],
      ['Feb', '4,100', '1,200'],
      ['Mar', '–', '950'],
    ])
  })

  test('shows the table on request, updates it with hidden series, removes it', () => {
    chart = new Chart(el, { ...base, table: 'visible' })
    expect(el.querySelector('.tc-table-wrap')?.classList.contains('tc-sr-only')).toBe(false)
    chart.toggleSeries('Visitors', true)
    flush()
    expect(el.querySelectorAll('.tc-table thead th')).toHaveLength(2)
    chart.update({ table: false } as Partial<ChartConfig<object>>).render()
    expect(el.querySelector('.tc-table')).toBeNull()
  })

  test('a hidden table catches up with new data once the browser is idle', () => {
    const idle: (() => void)[] = []
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => idle.push(callback))
    try {
      chart = new Chart(el, base)
      const firstCell = () => el.querySelector('.tc-table tbody td')?.textContent
      expect(firstCell()).toBe('3,200')
      chart.setData({ ...data, series: [{ name: 'Visitors', values: [1, 2, 3] }] } as never)
      chart.render()
      // The chart is already up to date; the table follows when the browser is idle.
      expect(el.querySelectorAll('.tc-series')).toHaveLength(1)
      expect(firstCell()).toBe('3,200')
      for (const callback of idle) callback()
      expect(firstCell()).toBe('1')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  test('resizing the container leaves the table alone', () => {
    chart = new Chart(el, { ...base, width: undefined })
    const table = vi.spyOn(line, 'table')
    // happy-dom has no layout: pretend the container got narrower.
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
    chart.resize()
    flush()
    expect(el.querySelector('svg')?.getAttribute('width')).toBe('300')
    expect(table).not.toHaveBeenCalled()
    table.mockRestore()
    width.mockRestore()
  })

  test('caps huge tables and says so in the caption', () => {
    const labels = Array.from({ length: 5000 }, (_, i) => `r${i}`)
    const values = labels.map((_, i) => i)
    chart = new Chart(el, {
      ...base,
      data: { labels, series: [{ name: 'V', values }] },
    } as ChartConfig<object>)
    expect(el.querySelectorAll('.tc-table tbody tr')).toHaveLength(1000)
    expect(el.querySelector('.tc-table caption')?.textContent).toBe('Traffic (1,000 of 5,000 rows)')
    chart.update({ table: { maxRows: 20 } } as Partial<ChartConfig<object>>).render()
    expect(el.querySelectorAll('.tc-table tbody tr')).toHaveLength(20)
    chart.update({ table: { visible: true, maxRows: 20 } } as Partial<ChartConfig<object>>).render()
    expect(el.querySelector('.tc-table-wrap')?.classList.contains('tc-sr-only')).toBe(false)
  })

  test('makes the svg focusable unless keyboard is disabled', () => {
    chart = new Chart(el, base)
    expect(svg().getAttribute('tabindex')).toBe('0')
    chart.update({ type: sparkline, data: [1, 2] } as Partial<ChartConfig<object>>).render()
    expect(svg().hasAttribute('tabindex')).toBe(false)
    chart.update({ keyboard: true } as Partial<ChartConfig<object>>).render()
    expect(svg().getAttribute('tabindex')).toBe('0')
    chart.update({ type: line, data, keyboard: undefined } as Partial<ChartConfig<object>>).render()
    chart.update({ keyboard: false } as Partial<ChartConfig<object>>).render()
    expect(svg().hasAttribute('tabindex')).toBe(false)
  })

  test('walks categories with the arrow keys and announces them', () => {
    chart = new Chart(el, base)
    key('ArrowRight')
    flush()
    expect(live()).toBe('Jan: Visitors 3,200, Sign-ups 800')
    expect(el.querySelector('.tc-crosshair')).not.toBeNull()
    expect(el.querySelector('.tc-tooltip')?.hasAttribute('data-visible')).toBe(true)
    key('ArrowRight')
    key('ArrowRight')
    key('ArrowRight')
    expect(live()).toBe('Mar: Visitors –, Sign-ups 950')
    key('Home')
    expect(live()).toContain('Jan')
    key('End')
    expect(live()).toContain('Mar')
    key('ArrowLeft')
    expect(live()).toContain('Feb')
  })

  test('arrows follow the screen in a right-to-left chart', () => {
    chart = new Chart(el, { ...base, rtl: true } as ChartConfig<object>)
    key('ArrowLeft')
    expect(live()).toContain('Jan')
    key('ArrowLeft')
    expect(live()).toContain('Feb')
    key('ArrowRight')
    expect(live()).toContain('Jan')
    key('End')
    expect(live()).toContain('Mar')
  })

  test('walks series with up and down', () => {
    chart = new Chart(el, { ...base, type: bar } as ChartConfig<object>)
    key('ArrowRight')
    key('ArrowDown')
    expect(live()).toBe('Jan: Visitors 3,200')
    key('ArrowDown')
    expect(live()).toBe('Jan: Sign-ups 800')
    key('ArrowDown')
    expect(live()).toBe('Jan: Visitors 3,200, Sign-ups 800')
    key('ArrowUp')
    expect(live()).toBe('Jan: Sign-ups 800')
  })

  test('escape and blur clear the keyboard selection', () => {
    chart = new Chart(el, base)
    key('ArrowRight')
    flush()
    key('Escape')
    flush()
    expect(el.querySelector('.tc-crosshair')).toBeNull()
    key('ArrowRight')
    flush()
    svg().dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    flush()
    expect(el.querySelector('.tc-crosshair')).toBeNull()
  })

  test('prevents page scrolling only for handled keys', () => {
    chart = new Chart(el, base)
    const handled = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    })
    svg().dispatchEvent(handled)
    expect(handled.defaultPrevented).toBe(true)
    const other = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true })
    svg().dispatchEvent(other)
    expect(other.defaultPrevented).toBe(false)
  })

  test('keeps the keyboard selection when data changes', () => {
    chart = new Chart(el, base)
    key('ArrowRight')
    key('ArrowRight')
    chart.setData({ ...data, series: [{ name: 'Visitors', values: [1, 2, 3] }] } as never)
    flush()
    expect(chart.hitTest(0, 0)).toBeNull()
    expect(el.querySelector('.tc-tooltip')?.textContent).toContain('Feb')
    expect(el.querySelector('.tc-tooltip')?.textContent).toContain('2')
  })

  test('the live region is there from focus on, before the first announcement', () => {
    chart = new Chart(el, base)
    expect(el.querySelector('[aria-live]')).toBeNull()
    svg().dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(el.querySelector('[aria-live]')?.textContent).toBe('')
    key('ArrowRight')
    expect(live()).toContain('Jan')
    expect(el.querySelectorAll('[aria-live]')).toHaveLength(1)
  })

  test('removes table and live region on destroy', () => {
    chart = new Chart(el, base)
    key('ArrowRight')
    chart.destroy()
    expect(el.querySelector('.tc-table')).toBeNull()
    expect(el.querySelector('[aria-live]')).toBeNull()
  })
})
