// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { buildChart, Chart, type ChartConfig } from './chart.ts'
import { bar } from './charts/bar.ts'
import { line } from './charts/line.ts'
import { type Hit, type HitTester, hitKey, type Interaction, toChartPoint } from './interaction.ts'

const data = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr'],
  series: [
    { name: 'Sales', values: [10, 30, null, 40] },
    { name: 'Costs', values: [5, 15, 20, 25], color: '#f00' },
  ],
}
const size = { width: 400, height: 200 }

/** The interaction a chart type registers while rendering. */
function interactionFor(config: ChartConfig<object>): Interaction {
  let found: Interaction | undefined
  buildChart(config, size, 't', (interaction) => {
    found = interaction
  })
  if (!found) throw new Error('no interaction registered')
  return found
}

/** The pointer hit tester of a chart type. */
const testerFor = (config: ChartConfig<object>): HitTester => interactionFor(config).hitTest

describe('line hit testing', () => {
  const hit = testerFor({ type: line, data, locale: 'en-US' } as ChartConfig<object>)
  const first = hit(40, 100) as Hit

  test('returns the nearest category with every series value', () => {
    expect(first.index).toBe(0)
    expect(first.label).toBe('Jan')
    expect(first.items.map((i) => [i.name, i.value])).toEqual([
      ['Sales', 10],
      ['Costs', 5],
    ])
    expect(first.items[1]?.color).toBe('#f00')
    expect(first.seriesIndex).toBeUndefined()
  })

  test('snaps to the nearest point along x', () => {
    const { area } = first
    const step = area.width / 3
    expect(hit(area.x + step * 1.4, 100)?.index).toBe(1)
    expect(hit(area.x + step * 1.6, 100)?.index).toBe(2)
    expect(hit(area.x + area.width, 100)?.index).toBe(3)
  })

  test('anchors values at their points and reports gaps as null', () => {
    const mar = hit(first.area.x + (first.area.width * 2) / 3, 100) as Hit
    expect(mar.x).toBeCloseTo(first.area.x + (first.area.width * 2) / 3)
    expect(mar.items[0]).toMatchObject({ value: null, y: null })
    expect(mar.items[1]?.y).toBeGreaterThan(first.area.y)
    expect(mar.items[1]?.y).toBeLessThan(first.area.y + first.area.height)
  })

  test('returns null outside the plot area', () => {
    expect(hit(-50, 100)).toBeNull()
    expect(hit(200, size.height + 50)).toBeNull()
  })
})

describe('bar hit testing', () => {
  const hit = testerFor({ type: bar, data, locale: 'en-US' } as ChartConfig<object>)

  test('reports the bar directly under the pointer', () => {
    const jan = hit(60, 100) as Hit
    const [sales, costs] = jan.items
    if (!sales || !costs) throw new Error('expected two items')
    expect(hit(sales.x, 100)?.seriesIndex).toBe(0)
    expect(hit(costs.x, 100)?.seriesIndex).toBe(1)
    expect(costs.x - sales.x).toBeCloseTo(26) // 24px bar + 2px gap
  })

  test('has no mark in the band padding or on missing values', () => {
    const jan = hit(60, 100) as Hit
    expect(hit(jan.x - 40, 100)?.seriesIndex).toBeUndefined()
    const mar = hit(jan.area.x + (jan.area.width / 4) * 2.5, 100) as Hit
    expect(mar.index).toBe(2)
    // Sales has no value in March: where its bar would be, there is no mark.
    const missingBarX = (mar.items[1]?.x ?? 0) - 26
    expect(hit(missingBarX, 100)?.seriesIndex).toBeUndefined()
    expect(hit(missingBarX + 26, 100)?.seriesIndex).toBe(1)
  })
})

describe('hitIndex()', () => {
  const interaction = interactionFor({ type: line, data, locale: 'en-US' } as ChartConfig<object>)

  test('returns a category by index and can focus a series', () => {
    expect(interaction.count).toBe(4)
    expect(interaction.hitIndex(1)?.label).toBe('Feb')
    expect(interaction.hitIndex(1, 1)?.seriesIndex).toBe(1)
    expect(interaction.hitIndex(1, 9)?.seriesIndex).toBeUndefined()
    expect(interaction.hitIndex(-1)).toBeNull()
    expect(interaction.hitIndex(4)).toBeNull()
  })
})

describe('hitKey()', () => {
  test('identifies category and mark', () => {
    const area = { x: 0, y: 0, width: 1, height: 1 }
    expect(hitKey(null)).toBe('')
    expect(hitKey({ index: 2, label: 'a', title: 'a', x: 0, area, items: [] })).toBe('2:')
    expect(
      hitKey({ index: 2, label: 'a', title: 'a', x: 0, area, items: [], seriesIndex: 1 }),
    ).toBe('2:1')
  })
})

describe('toChartPoint()', () => {
  test('maps client coordinates into the viewBox of a scaled svg', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.getBoundingClientRect = () => ({ left: 100, top: 50, width: 200, height: 100 }) as DOMRect
    expect(toChartPoint(svg, 150, 75, 400, 200)).toEqual({ x: 100, y: 50 })
  })

  test('falls back to 1:1 when the svg has no layout box', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    expect(toChartPoint(svg, 10, 20, 400, 200)).toEqual({ x: 10, y: 20 })
  })
})

describe('Chart pointer events', () => {
  let el: HTMLElement
  let chart: Chart<object>

  const pointer = (type: string, x: number, y = 100, pointerType = 'mouse') => {
    const event = new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerType })
    el.querySelector('svg')?.dispatchEvent(event)
  }

  beforeEach(() => {
    el = document.createElement('div')
    document.body.appendChild(el)
    chart = new Chart(el, { type: line, data, width: 400, height: 200, locale: 'en-US' })
    // happy-dom has no layout: pin the svg to the page origin at its natural size.
    const svg = el.querySelector('svg') as SVGSVGElement
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200 }) as DOMRect
  })

  afterEach(() => {
    chart.destroy()
    el.remove()
  })

  test('emits hover only when the category changes', () => {
    const spy = vi.fn()
    chart.on('hover', spy)
    pointer('pointermove', 40)
    pointer('pointermove', 45)
    pointer('pointermove', 390)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls.map(([e]) => e.hit?.label)).toEqual(['Jan', 'Apr'])
  })

  test('emits hover null when a mouse leaves, but keeps touch hovers', () => {
    const spy = vi.fn()
    chart.on('hover', spy)
    pointer('pointerdown', 40, 100, 'touch')
    el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'touch' }))
    expect(spy).toHaveBeenCalledTimes(1)
    el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ hit: null }))
  })

  test('re-emits hover with fresh values after new data', () => {
    const spy = vi.fn()
    chart.on('hover', spy)
    pointer('pointermove', 40)
    chart.update({
      data: { ...data, series: [{ name: 'Sales', values: [99, 1, 1, 1] }] },
    } as Partial<ChartConfig<object>>)
    chart.render()
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.lastCall?.[0].hit.items[0].value).toBe(99)
  })

  test('emits click with the hit under the pointer', () => {
    const spy = vi.fn()
    chart.on('click', spy)
    el.querySelector('svg')?.dispatchEvent(
      new MouseEvent('click', { clientX: 390, clientY: 100, bubbles: true }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ hit: expect.objectContaining({ label: 'Apr' }) }),
    )
  })

  test('hitTest() is available on the chart and stops after destroy', () => {
    expect(chart.hitTest(40, 100)?.label).toBe('Jan')
    const spy = vi.fn()
    chart.on('hover', spy)
    chart.destroy()
    el.dispatchEvent(new PointerEvent('pointermove', { clientX: 40, clientY: 100 }))
    expect(spy).not.toHaveBeenCalled()
  })
})
