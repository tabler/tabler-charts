// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Chart, type ChartConfig } from './chart.ts'
import { Chart as DefaultChart } from './chart-default.ts'
import { line } from './charts/line.ts'
import type { ChartPlugin } from './plugin.ts'
import { legend, tooltip } from './plugins/index.ts'
import { flush } from './scheduler.ts'
import { h } from './vnode.ts'

const data = {
  labels: ['Jan', 'Feb', 'Mar'],
  series: [
    { name: 'A', values: [1, 2, 3] },
    { name: 'B', values: [3, 2, 1] },
  ],
}
const base = { type: line, data, width: 400, height: 200, locale: 'en-US' } as ChartConfig<object>

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

const hover = (x = 200) => {
  const svg = el.querySelector('svg') as SVGSVGElement
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200 }) as DOMRect
  svg.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: 100, bubbles: true }))
  flush()
}

describe('core Chart', () => {
  test('renders only the chart without plugins', () => {
    chart = new Chart(el, base)
    hover()
    expect(el.children).toHaveLength(1)
    expect(el.querySelector('svg')?.hasAttribute('tabindex')).toBe(false)
    expect(el.querySelector('.tc-crosshair')).toBeNull()
    expect(el.classList.contains('tc-container')).toBe(false)
    // Hover events still work without any plugin.
    expect(chart.active?.label).toBe('Feb')
  })

  test('installs the plugins given in the config', () => {
    chart = new Chart(el, { ...base, plugins: [legend(), tooltip()] })
    hover()
    expect(el.querySelector('.tc-legend')).not.toBeNull()
    expect(el.querySelector('.tc-tooltip')?.hasAttribute('data-visible')).toBe(true)
    expect(el.querySelector('.tc-table')).toBeNull()
  })

  test('the default Chart installs every built-in plugin', () => {
    chart = new DefaultChart(el, base)
    hover()
    expect(el.querySelector('.tc-legend')).not.toBeNull()
    expect(el.querySelector('.tc-tooltip')).not.toBeNull()
    expect(el.querySelector('.tc-table')).not.toBeNull()
    expect(el.querySelector('.tc-crosshair')).not.toBeNull()
    expect(el.querySelector('svg')?.getAttribute('tabindex')).toBe('0')
  })

  test('runs plugin hooks in order and cleans them up', () => {
    const calls: string[] = []
    const probe: ChartPlugin = {
      name: 'probe',
      install(host) {
        calls.push(`install:${host.element === el}`)
        return {
          beforeRender: () => calls.push('before'),
          svgAttrs: () => ({ 'data-probe': 'yes' }),
          layers: (hit) => ({ over: h('g', { class: 'probe-layer', 'data-index': hit.index }) }),
          afterRender: ({ stale }) => calls.push(`after:${stale}`),
          reservedHeight: () => 0,
          destroy: () => calls.push('destroy'),
        }
      },
    }
    chart = new Chart(el, { ...base, plugins: [probe] })
    expect(calls).toEqual(['install:true', 'before', 'after:true'])
    expect(el.querySelector('svg')?.getAttribute('data-probe')).toBe('yes')
    hover()
    expect(el.querySelector('.probe-layer')?.getAttribute('data-index')).toBe('1')
    expect(calls.slice(-2)).toEqual(['before', 'after:false'])
    chart.destroy()
    expect(calls.at(-1)).toBe('destroy')
  })

  test('reserved height is taken out of the container in container mode', () => {
    const reserve: ChartPlugin = { name: 'r', install: () => ({ reservedHeight: () => 40 }) }
    Object.defineProperty(el, 'clientHeight', { value: 300, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 500, configurable: true })
    chart = new Chart(el, {
      type: line,
      data,
      height: 'container',
      plugins: [reserve],
    } as ChartConfig<object>)
    expect(chart.size).toEqual({ width: 500, height: 260 })
  })
})

describe('highlight API', () => {
  test('highlightIndex() and clearHighlight() drive hover like the pointer', () => {
    chart = new DefaultChart(el, base)
    const spy = vi.fn()
    chart.on('hover', spy)
    expect(chart.highlightIndex(2, 1)?.label).toBe('Mar')
    expect(chart.highlightSource).toBe('index')
    expect(chart.pointer).toBeUndefined()
    flush()
    expect(el.querySelector('.tc-tooltip-item-active')?.textContent).toContain('B')
    chart.clearHighlight()
    flush()
    expect(chart.active).toBeNull()
    expect(chart.highlightSource).toBeUndefined()
    expect(spy.mock.calls.map(([e]) => e.hit?.label ?? null)).toEqual(['Mar', null])
    expect(chart.highlightIndex(9)).toBeNull()
  })
})
