// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ChartConfig } from './chart.ts'
import { Chart } from './chart-default.ts'
import { bar } from './charts/bar.ts'
import { line } from './charts/line.ts'
import { hoverOverlay, hoverUnderlay } from './components/hover.ts'
import type { Hit } from './interaction.ts'
import { renderToString } from './render/string.ts'
import { flush } from './scheduler.ts'
import { placeTooltip, tooltipContent } from './tooltip.ts'
import { h } from './vnode.ts'

const area = { x: 40, y: 10, width: 300, height: 180 }
const hit: Hit = {
  index: 1,
  label: 'Feb',
  title: 'February',
  x: 140,
  area,
  items: [
    { name: 'Sales', seriesIndex: 0, value: 30, text: '30', x: 140, y: 60 },
    { name: 'Costs', seriesIndex: 1, value: null, text: '–', x: 140, y: null, color: '#f00' },
  ],
}

describe('placeTooltip()', () => {
  const size = { width: 100, height: 40 }
  const bounds = { width: 400, height: 200 }

  test('sits right of the anchor, vertically centered on it', () => {
    expect(placeTooltip({ x: 100, y: 100 }, size, bounds)).toEqual({ x: 112, y: 80, side: 'right' })
  })

  test('flips left near the right edge', () => {
    expect(placeTooltip({ x: 350, y: 100 }, size, bounds)).toEqual({ x: 238, y: 80, side: 'left' })
  })

  test('right to left: sits left of the anchor, right only near the left edge', () => {
    const rtl = (x: number) => placeTooltip({ x, y: 100 }, size, bounds, 12, true)
    expect(rtl(300)).toEqual({ x: 188, y: 80, side: 'left' })
    expect(rtl(50)).toEqual({ x: 62, y: 80, side: 'right' })
    // Where nothing fits, it stays on its own side, clamped.
    expect(
      placeTooltip({ x: 50, y: 100 }, { width: 380, height: 40 }, bounds, 12, true),
    ).toMatchObject({ side: 'left', x: 0 })
  })

  test('stays inside the container vertically and when nothing fits', () => {
    expect(placeTooltip({ x: 100, y: 5 }, size, bounds).y).toBe(0)
    expect(placeTooltip({ x: 100, y: 195 }, size, bounds).y).toBe(160)
    expect(placeTooltip({ x: 50, y: 100 }, { width: 380, height: 40 }, bounds)).toMatchObject({
      x: 20,
    })
  })
})

describe('tooltipContent()', () => {
  test('lists the title and a row per series with text tokens', () => {
    const html = renderToString(tooltipContent({ ...hit, seriesIndex: 0 }))
    expect(html).toContain('<div class="tc-tooltip-title">February</div>')
    expect(html).toContain(
      '<div class="tc-tooltip-item tc-series tc-series-1 tc-tooltip-item-active">',
    )
    expect(html).toContain('style="--tc-series-color:#f00"')
    expect(html).toContain('<span class="tc-tooltip-value">–</span>')
  })

  test('adds a footer below the default rows', () => {
    const html = renderToString(tooltipContent(hit, { footer: () => 'Total 30' }))
    expect(html).toMatch(
      /tc-tooltip-value">–<\/span><\/div><div class="tc-tooltip-footer">Total 30<\/div>/,
    )
  })

  test('renders custom content safely', () => {
    const html = renderToString(
      tooltipContent(hit, { format: (hit) => [h('b', null, hit.title), ' <img onerror=x>'] }),
    )
    expect(html).toBe('<div class="tc-tooltip-content"><b>February</b> &lt;img onerror=x&gt;</div>')
  })
})

describe('hover layers', () => {
  test('draw a crosshair and active dots for point charts', () => {
    const under = renderToString(hoverUnderlay(hit))
    expect(under).toContain('<line class="tc-crosshair" x1="140" x2="140" y1="10" y2="190"/>')
    const over = renderToString(hoverOverlay(hit))
    expect(over.match(/tc-point-active/g)).toHaveLength(1)
    expect(renderToString(hoverUnderlay(hit, false))).not.toContain('tc-crosshair')
  })

  test('draw a band and no dots for band charts', () => {
    const banded = { ...hit, band: { x: 120, y: 10, width: 40, height: 180 } }
    expect(renderToString(hoverUnderlay(banded))).toContain(
      '<rect class="tc-hover-band" x="120" y="10" width="40" height="180"/>',
    )
    expect(renderToString(hoverOverlay(banded))).not.toContain('tc-point')
  })
})

describe('Chart hover rendering', () => {
  const data = {
    labels: ['Jan', 'Feb', 'Mar'],
    series: [{ name: 'Sales', values: [10, 30, 20] }],
  }
  let el: HTMLElement
  let chart: Chart<object>

  const mount = (config: Partial<ChartConfig<object>> = {}) => {
    chart = new Chart(el, {
      type: line,
      data,
      width: 400,
      height: 200,
      locale: 'en-US',
      ...config,
    } as ChartConfig<object>)
    const svg = el.querySelector('svg') as SVGSVGElement
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200 }) as DOMRect
  }
  const move = (x: number, y = 100) =>
    el
      .querySelector('svg')
      ?.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }))
  const leave = () => el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))

  beforeEach(() => {
    el = document.createElement('div')
    document.body.appendChild(el)
  })

  afterEach(() => {
    chart.destroy()
    el.remove()
  })

  test('marks the container as the tooltip positioning context', () => {
    mount()
    expect(el.classList.contains('tc-container')).toBe(true)
    chart.destroy()
    expect(el.classList.contains('tc-container')).toBe(false)
  })

  test('shows crosshair, active dot and tooltip on hover, hides them on leave', () => {
    mount()
    move(200)
    flush()
    expect(el.querySelectorAll('.tc-crosshair')).toHaveLength(1)
    expect(el.querySelectorAll('.tc-point-active')).toHaveLength(1)
    const tip = el.querySelector('.tc-tooltip') as HTMLElement
    expect(tip.hasAttribute('data-visible')).toBe(true)
    expect(tip.textContent).toContain('Feb')
    expect(tip.textContent).toContain('30')

    leave()
    flush()
    expect(el.querySelectorAll('.tc-crosshair')).toHaveLength(0)
    expect(tip.hasAttribute('data-visible')).toBe(false)
  })

  test('uses a hover band instead of a crosshair for bars', () => {
    mount({ type: bar } as Partial<ChartConfig<object>>)
    move(200)
    flush()
    expect(el.querySelectorAll('.tc-hover-band')).toHaveLength(1)
    expect(el.querySelectorAll('.tc-crosshair')).toHaveLength(0)
  })

  test('is dark by default and white with theme: light', () => {
    mount()
    move(200)
    flush()
    const tip = el.querySelector('.tc-tooltip') as HTMLElement
    expect(tip.classList.contains('tc-tooltip-light')).toBe(false)
    chart.update({ tooltip: { theme: 'light' } } as Partial<ChartConfig<object>>)
    move(200)
    flush()
    expect(tip.classList.contains('tc-tooltip-light')).toBe(true)
    chart.update({ tooltip: true } as Partial<ChartConfig<object>>)
    move(200)
    flush()
    expect(tip.classList.contains('tc-tooltip-light')).toBe(false)
  })

  test('can disable the tooltip and the crosshair', () => {
    mount({ tooltip: false, crosshair: false })
    move(200)
    flush()
    expect(el.querySelector('.tc-tooltip')).toBeNull()
    expect(el.querySelectorAll('.tc-crosshair')).toHaveLength(0)
    expect(el.querySelectorAll('.tc-point-active')).toHaveLength(1)
  })

  test('hover updates reuse the chart content instead of rebuilding it', () => {
    mount()
    const render = vi.fn()
    chart.on('render', render)
    const line = el.querySelector('.tc-line')
    const typeRender = vi.spyOn(chart.config.type, 'render')
    move(40)
    flush()
    move(360)
    flush()
    expect(typeRender).not.toHaveBeenCalled()
    expect(render).not.toHaveBeenCalled()
    expect(el.querySelector('.tc-line')).toBe(line)
    typeRender.mockRestore()
  })

  test('refreshes the tooltip when data changes under the pointer', () => {
    mount()
    move(200)
    flush()
    chart.setData({ ...data, series: [{ name: 'Sales', values: [10, 77, 20] }] } as never)
    flush()
    expect(el.querySelector('.tc-tooltip')?.textContent).toContain('77')
  })

  test('charts sharing a hover measure all their tooltips before moving any', () => {
    mount({ sync: 'batch' } as never)
    const first = chart
    const firstEl = el
    el = document.createElement('div')
    document.body.appendChild(el)
    mount({ sync: 'batch' } as never)
    // Reads of the layout and the write that shows a tooltip, in the order they happen.
    const order: string[] = []
    const rect = Element.prototype.getBoundingClientRect
    const reads = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      order.push('read')
      return rect.call(this)
    })
    const set = Element.prototype.setAttribute
    const writes = vi.spyOn(Element.prototype, 'setAttribute').mockImplementation(function (
      this: Element,
      name: string,
      value: string,
    ) {
      if (name === 'data-visible') order.push('write')
      set.call(this, name, value)
    })
    move(150)
    flush()
    reads.mockRestore()
    writes.mockRestore()
    expect(firstEl.querySelector('.tc-tooltip')?.hasAttribute('data-visible')).toBe(true)
    expect(el.querySelector('.tc-tooltip')?.hasAttribute('data-visible')).toBe(true)
    expect(order.filter((step) => step === 'write')).toHaveLength(2)
    expect(order.lastIndexOf('read')).toBeLessThan(order.indexOf('write'))
    first.destroy()
    firstEl.remove()
  })

  test('destroy() removes the tooltip', () => {
    mount()
    move(200)
    flush()
    chart.destroy()
    expect(el.querySelector('.tc-tooltip')).toBeNull()
  })
})
