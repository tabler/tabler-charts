// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { Chart, type ChartConfig } from './chart.ts'
import { Chart as DefaultChart } from './chart-default.ts'
import { bar } from './charts/bar.ts'
import { line } from './charts/line.ts'
import { flush } from './scheduler.ts'

/**
 * CSS transitions only animate data changes when marks keep their DOM nodes
 * and only their geometry attributes change.
 */
describe('marks keep their nodes across data updates', () => {
  const labels = ['Q1', 'Q2', 'Q3']
  const data = (k: number) => ({
    labels,
    series: [
      { name: 'A', values: [10 * k, 20, 15 / k] },
      { name: 'B', values: [5, 8 * k, 12] },
    ],
  })
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

  const update = (config: ChartConfig<object>, selector: string) => {
    chart = new Chart(el, config)
    const nodes = Array.from(el.querySelectorAll(selector))
    const before = nodes.map((n) => n.getAttribute('d') ?? n.getAttribute('style'))
    chart.setData(data(3) as never)
    flush()
    const after = Array.from(el.querySelectorAll(selector))
    return {
      nodes,
      after,
      before,
      now: after.map((n) => n.getAttribute('d') ?? n.getAttribute('style')),
    }
  }

  test('bars', () => {
    const r = update(
      { type: bar, data: data(1), width: 400, height: 200 } as ChartConfig<object>,
      '.tc-bar',
    )
    expect(r.after).toEqual(r.nodes)
    expect(r.now).not.toEqual(r.before)
  })

  test('lines', () => {
    const r = update(
      { type: line, data: data(1), width: 400, height: 200 } as ChartConfig<object>,
      '.tc-line',
    )
    expect(r.after).toEqual(r.nodes)
    expect(r.now).not.toEqual(r.before)
  })

  test('hover layers coming and going never recreate the chart content', () => {
    chart = new DefaultChart(el, {
      type: line,
      data: data(1),
      width: 400,
      height: 200,
    } as ChartConfig<object>)
    const svg = el.querySelector('svg') as SVGSVGElement
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200 }) as DOMRect
    const before = {
      list: el.querySelector('.tc-series-list'),
      grid: el.querySelector('.tc-grid'),
      line: el.querySelector('.tc-line'),
    }
    svg.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 200, clientY: 100, bubbles: true }),
    )
    flush()
    expect(el.querySelector('.tc-crosshair')).not.toBeNull()
    el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    flush()
    expect(el.querySelector('.tc-crosshair')).toBeNull()
    expect(el.querySelector('.tc-series-list')).toBe(before.list)
    expect(el.querySelector('.tc-grid')).toBe(before.grid)
    expect(el.querySelector('.tc-line')).toBe(before.line)
  })

  test('ticks that stay on the axis', () => {
    const config = {
      type: line,
      data: data(1),
      width: 400,
      height: 200,
      locale: 'en-US',
      y: { zero: true },
    } as ChartConfig<object>
    chart = new Chart(el, config)
    const zero = el.querySelector('.tc-axis-y .tc-tick')
    chart.update({ y: { zero: true, max: 100 } } as Partial<ChartConfig<object>>)
    flush()
    expect(el.querySelector('.tc-axis-y .tc-tick-label')?.textContent).toBe('0')
    // Same node for the "0" tick (keyed by value): only its transform changes, which CSS animates.
    expect(el.querySelector('.tc-axis-y .tc-tick')).toBe(zero)
  })
})
