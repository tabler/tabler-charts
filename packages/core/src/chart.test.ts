// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  buildChart,
  Chart,
  type ChartType,
  chartToString,
  type RenderContext,
  resolveSize,
} from './chart.ts'
import { flush } from './scheduler.ts'
import { h } from './vnode.ts'

interface DotsOptions {
  data: number[]
}

const renders: RenderContext[] = []

/** Minimal chart type: one circle per value. */
const dots: ChartType<DotsOptions> = {
  name: 'dots',
  render(options, ctx) {
    renders.push(ctx)
    return h(
      'g',
      { class: 'dots' },
      options.data.map((v, i) => h('circle', { key: i, cx: i * 10, cy: ctx.height - v, r: 2 })),
    )
  },
}

// Controllable ResizeObserver stub.
type ROCallback = (
  entries: { target: Element; contentRect: { width: number; height: number } }[],
) => void
const observers: { callback: ROCallback; targets: Set<Element> }[] = []
class FakeResizeObserver {
  targets = new Set<Element>()
  constructor(callback: ROCallback) {
    observers.push({ callback, targets: this.targets })
  }
  observe(el: Element) {
    this.targets.add(el)
  }
  unobserve(el: Element) {
    this.targets.delete(el)
  }
  disconnect() {
    this.targets.clear()
  }
}
vi.stubGlobal('ResizeObserver', FakeResizeObserver)

function resizeTo(el: Element, width: number, height = 0) {
  for (const o of observers) {
    if (o.targets.has(el)) o.callback([{ target: el, contentRect: { width, height } }])
  }
}

let el: HTMLElement

beforeEach(() => {
  renders.length = 0
  el = document.createElement('div')
  el.id = 'chart'
  document.body.appendChild(el)
})

afterEach(() => {
  el.remove()
})

describe('resolveSize()', () => {
  test('prefers explicit width and height', () => {
    expect(resolveSize({ width: 300, height: 100 }, { width: 800, height: 50 })).toEqual({
      width: 300,
      height: 100,
    })
  })

  test('uses the measured width and the aspect ratio', () => {
    expect(resolveSize({}, { width: 800 })).toEqual({ width: 800, height: 400 })
    expect(resolveSize({ aspectRatio: 4 }, { width: 800 })).toEqual({ width: 800, height: 200 })
  })

  test('falls back to a default width when nothing was measured', () => {
    expect(resolveSize({})).toEqual({ width: 600, height: 300 })
    expect(resolveSize({}, { width: -10 })).toEqual({ width: 600, height: 300 })
  })

  test('follows the container height when asked', () => {
    expect(resolveSize({ height: 'container' }, { width: 500, height: 120 })).toEqual({
      width: 500,
      height: 120,
    })
    expect(resolveSize({ height: 'container' }, { width: 500, height: 0 })).toEqual({
      width: 500,
      height: 250,
    })
  })
})

describe('buildChart()', () => {
  test('wraps the chart type output in an accessible svg', () => {
    const node = buildChart(
      { type: dots, data: [1], title: 'Sales', description: 'Monthly', class: 'extra' },
      { width: 200, height: 100 },
      'c1',
    )
    expect(node.attrs).toMatchObject({
      class: 'tc-chart tc-chart-dots extra',
      viewBox: '0 0 200 100',
      width: 200,
      height: 100,
      role: 'img',
      'aria-label': 'Sales',
      'aria-describedby': 'c1-desc',
    })
    expect(
      chartToString({ type: dots, data: [], title: 'A&B', id: 'x' }, { width: 10, height: 5 }),
    ).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" class="tc-chart tc-chart-dots" viewBox="0 0 10 5" ' +
        'width="10" height="5" role="img" aria-label="A&amp;B">' +
        '<g class="dots"/></svg>',
    )
  })

  test('passes size, locale, font size and id to the chart type', () => {
    buildChart(
      { type: dots, data: [], locale: 'pl-PL', fontSize: 14 },
      { width: 50, height: 20 },
      'z',
    )
    expect(renders[0]).toMatchObject({
      width: 50,
      height: 20,
      fontSize: 14,
      locale: 'pl-PL',
      id: 'z',
    })
  })

  test('throws a helpful error without a chart type', () => {
    expect(() =>
      // @ts-expect-error missing type
      buildChart({ data: [] }, { width: 1, height: 1 }),
    ).toThrow(/`type` must be a chart type/)
  })
})

describe('Chart', () => {
  test('renders synchronously into an element or selector', () => {
    const chart = new Chart('#chart', { type: dots, data: [1, 2], width: 100, height: 50 })
    expect(chart.element).toBe(el)
    expect(el.querySelectorAll('circle')).toHaveLength(2)
    expect(el.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 100 50')
  })

  test('infers option types from the chart type', () => {
    // @ts-expect-error dots expects numeric data
    const chart = new Chart(el, { type: dots, data: ['x'] })
    // @ts-expect-error setData is typed from the chart type too
    chart.setData(['y'])
    chart.destroy()
  })

  test('throws when the element does not exist', () => {
    expect(() => new Chart('#missing', { type: dots, data: [] })).toThrow(/not found/)
  })

  test('assigns unique ids unless one is given', () => {
    const a = new Chart(el, { type: dots, data: [] })
    const b = new Chart(document.createElement('div'), { type: dots, data: [] })
    const c = new Chart(document.createElement('div'), { type: dots, data: [], id: 'mine' })
    expect(a.id).not.toBe(b.id)
    expect(c.id).toBe('mine')
  })

  test('batches updates into one render per frame', () => {
    const chart = new Chart(el, { type: dots, data: [1], width: 100 })
    const spy = vi.fn()
    chart.on('render', spy)
    chart
      .update({ data: [1, 2] })
      .setData([1, 2, 3])
      .update({ width: 120 })
    expect(spy).not.toHaveBeenCalled()
    flush()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({ size: { width: 120, height: 60 } })
    expect(el.querySelectorAll('circle')).toHaveLength(3)
  })

  test('patches the existing svg instead of replacing it', () => {
    const chart = new Chart(el, { type: dots, data: [1, 2], width: 100 })
    const svg = el.querySelector('svg')
    const first = el.querySelector('circle')
    chart.setData([5, 6, 7]).render()
    expect(el.querySelector('svg')).toBe(svg)
    expect(el.querySelector('circle')).toBe(first)
  })

  test('re-renders when the container width changes, not its height', () => {
    const chart = new Chart(el, { type: dots, data: [] })
    const spy = vi.fn()
    chart.on('render', spy)
    resizeTo(el, 400, 10)
    flush()
    expect(spy).toHaveBeenCalledWith({ size: { width: 400, height: 200 } })
    resizeTo(el, 400, 999)
    expect(flush()).toBe(0)
  })

  test('follows the container height with height: "container"', () => {
    const chart = new Chart(el, { type: dots, data: [], height: 'container' })
    resizeTo(el, 400, 150)
    flush()
    expect(chart.size).toEqual({ width: 400, height: 150 })
    resizeTo(el, 400, 180)
    flush()
    expect(chart.size).toEqual({ width: 400, height: 180 })
  })

  test('reads the font size from --tc-font-size unless set explicitly', () => {
    el.style.setProperty('--tc-font-size', '18px')
    const measured = new Chart(el, { type: dots, data: [] })
    expect(renders.at(-1)?.fontSize).toBe(18)
    expect(measured.fontSize).toBe(18)
    measured.destroy()
    new Chart(el, { type: dots, data: [], fontSize: 10 })
    expect(renders.at(-1)?.fontSize).toBe(10)
    el.style.removeProperty('--tc-font-size')
    new Chart(el, { type: dots, data: [] })
    expect(renders.at(-1)?.fontSize).toBe(12)
  })

  test('reads the font size again on resize and option changes, not for new data', () => {
    el.style.setProperty('--tc-font-size', '18px')
    const chart = new Chart(el, { type: dots, data: [] })
    const reads = vi.spyOn(window, 'getComputedStyle')
    chart.setData([] as never)
    flush()
    expect(reads).not.toHaveBeenCalled()
    el.style.setProperty('--tc-font-size', '16px')
    chart.update({ class: 'big' } as never)
    flush()
    expect(renders.at(-1)?.fontSize).toBe(16)
    reads.mockClear()
    chart.setData([] as never)
    flush()
    expect(reads).not.toHaveBeenCalled()
    el.style.setProperty('--tc-font-size', '14px')
    chart.resize()
    flush()
    expect(renders.at(-1)?.fontSize).toBe(14)
    reads.mockRestore()
    el.style.removeProperty('--tc-font-size')
  })

  test('charts with more than 1000 elements skip transitions unless animate: true', () => {
    const many = Array.from({ length: 1200 }, () => 1)
    const isStatic = () => el.querySelector('svg')?.classList.contains('tc-static')
    // The dots type draws a group plus one circle per value.
    const chart = new Chart(el, { type: dots, data: Array.from({ length: 999 }, () => 1) })
    expect(isStatic()).toBe(false)
    chart.setData(many as never)
    flush()
    expect(isStatic()).toBe(true)
    chart.update({ animate: true } as never)
    flush()
    expect(isStatic()).toBe(false)
    // The server decides the same way.
    expect(chartToString({ type: dots, data: many }, { width: 10, height: 5 })).toContain(
      'class="tc-chart tc-chart-dots tc-static"',
    )
  })

  test('animate: false marks the svg static', () => {
    new Chart(el, { type: dots, data: [], animate: false })
    expect(el.querySelector('svg')?.classList.contains('tc-static')).toBe(true)
  })

  test('suspends transitions while the container is resizing', () => {
    vi.useFakeTimers()
    try {
      new Chart(el, { type: dots, data: [] })
      const svg = el.querySelector('svg')
      resizeTo(el, 420)
      expect(svg?.hasAttribute('data-resizing')).toBe(true)
      flush()
      // Our own render must not drop the flag set outside the vnode tree.
      expect(svg?.hasAttribute('data-resizing')).toBe(true)
      vi.advanceTimersByTime(250)
      expect(svg?.hasAttribute('data-resizing')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  test('unsubscribes event handlers', () => {
    const chart = new Chart(el, { type: dots, data: [] })
    const spy = vi.fn()
    const off = chart.on('render', spy)
    off()
    chart.render()
    expect(spy).not.toHaveBeenCalled()
  })

  test('destroy() removes the svg, cancels work and stops observing', () => {
    const chart = new Chart(el, { type: dots, data: [1] })
    chart.update({ data: [1, 2] })
    chart.destroy()
    expect(el.innerHTML).toBe('')
    expect(flush()).toBe(0)
    resizeTo(el, 300)
    expect(flush()).toBe(0)
    chart.render()
    expect(el.innerHTML).toBe('')
    chart.destroy()
  })

  test('setConfig() replaces the options, update() merges them', () => {
    const chart = new Chart(el, { type: dots, data: [1], title: 'Sales', width: 300 })
    chart.update({ data: [1, 2] })
    flush()
    expect(chart.config.title).toBe('Sales')
    chart.setConfig({ type: dots, data: [1, 2, 3] })
    flush()
    expect(chart.config.title).toBeUndefined()
    expect(chart.config.width).toBeUndefined()
    expect(el.querySelector('svg')?.getAttribute('aria-label')).not.toBe('Sales')
    expect(el.querySelectorAll('circle')).toHaveLength(3)
    chart.destroy()
  })

  test('a new chart on an element replaces the one already there', () => {
    const first = new Chart(el, { type: dots, data: [1] })
    const second = new Chart(el, { type: dots, data: [1, 2, 3] })
    // The first is destroyed: its updates draw nothing any more.
    first.update({ data: [1] })
    first.render()
    flush()
    expect(el.querySelectorAll('svg')).toHaveLength(1)
    expect(el.querySelectorAll('circle')).toHaveLength(3)
    // Destroying the first again leaves the second alone.
    first.destroy()
    expect(el.querySelectorAll('circle')).toHaveLength(3)
    second.destroy()
    expect(el.innerHTML).toBe('')
  })
})
