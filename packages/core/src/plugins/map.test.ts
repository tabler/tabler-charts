// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ChartConfig } from '../chart.ts'
import { Chart } from '../chart-default.ts'
import { type MapData, type MapOptions, map } from '../charts/map.ts'
import { flush } from '../scheduler.ts'

/** Two squares and the equator through the middle; one unit of the map is two pixels. */
const tiny: MapData = {
  width: 100,
  height: 50,
  projection: { type: 'miller', scale: 100 / (2 * Math.PI), translate: [50, 25] },
  regions: {
    A: { name: 'Aland', path: 'M10 10l20 0 0 20-20 0z' },
    B: { name: 'Bland', path: 'M60 10h20v20h-20z' },
  },
}
const base: ChartConfig<MapOptions> = {
  type: map,
  map: tiny,
  data: { A: 1 },
  scale: false,
  animate: false,
  width: 200,
  height: 100,
  locale: 'en-US',
}

let el: HTMLElement
let chart: Chart<MapOptions>

beforeEach(() => {
  el = document.createElement('div')
  document.body.appendChild(el)
})

afterEach(() => {
  chart?.destroy()
  el.remove()
})

const create = (config: Partial<ChartConfig<MapOptions>> = {}) => {
  chart = new Chart(el, { ...base, ...config })
  return chart
}
const svg = () => el.querySelector('svg.tc-chart') as SVGSVGElement
const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.tc-map-zoom button'))
const transform = () => el.querySelector('.tc-map-regions')?.getAttribute('transform')
const view = () => chart.config.view
const at = (x: number, y: number, more: object = {}) => ({
  clientX: x,
  clientY: y,
  bubbles: true,
  cancelable: true,
  ...more,
})
const pointer = (type: string, x: number, y: number, pointerId = 1, target: EventTarget = svg()) =>
  target.dispatchEvent(new PointerEvent(type, at(x, y, { pointerId, pointerType: 'mouse' })))
/** A wheel event at a point (happy-dom leaves the position of a WheelEvent at 0). */
const wheelAt = (x: number, y: number, deltaY: number) => {
  const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true })
  Object.defineProperties(event, { clientX: { value: x }, clientY: { value: y } })
  return event
}
const click = (x: number, y: number) => svg().dispatchEvent(new MouseEvent('click', at(x, y)))
const key = (name: string) =>
  svg().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }))

describe('map zoom', () => {
  test('shows nothing and takes no input without the option', () => {
    create()
    expect(el.querySelector('.tc-map-zoom')).toBeNull()
    expect(svg().hasAttribute('data-zoom')).toBe(false)
    const wheel = wheelAt(40, 40, -100)
    svg().dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(false)
    pointer('pointerdown', 100, 50)
    pointer('pointermove', 60, 50)
    key('+')
    flush()
    expect(view()).toBeUndefined()
    expect(transform()).toBe('translate(0 0) scale(2)')
  })

  test('magnifies around the middle with its buttons, up to the limit', () => {
    create({ zoom: { max: 4, labels: { in: 'Closer' } } })
    const [zoomIn, zoomOut] = buttons()
    expect(zoomIn?.getAttribute('aria-label')).toBe('Closer')
    expect(zoomOut?.getAttribute('aria-label')).toBe('Zoom out')
    expect([zoomIn?.disabled, zoomOut?.disabled]).toEqual([false, true])
    expect(svg().getAttribute('data-zoom')).toBe('')

    zoomIn?.click()
    flush()
    expect(view()).toEqual({ x: 25, y: 12.5, scale: 2 })
    expect(transform()).toBe('translate(-100 -50) scale(4)')
    expect(el.querySelector('.tc-map')?.getAttribute('clip-path')).toMatch(/^url\(#.+-map\)$/)
    expect([zoomIn?.disabled, zoomOut?.disabled]).toEqual([false, false])

    zoomIn?.click()
    flush()
    expect(view()?.scale).toBe(4)
    expect(zoomIn?.disabled).toBe(true)

    zoomOut?.click()
    zoomOut?.click()
    flush()
    expect(view()).toEqual({ x: 0, y: 0, scale: 1 })
    expect(el.querySelector('.tc-map')?.hasAttribute('clip-path')).toBe(false)
  })

  test('removes its buttons when zoom is turned off', () => {
    create({ zoom: true })
    expect(buttons()).toHaveLength(2)
    chart.update({ zoom: false }).render()
    expect(el.querySelector('.tc-map-zoom')).toBeNull()
  })

  test('zooms with the wheel around the pointer, which stays where it is', () => {
    create({ zoom: true })
    const wheel = wheelAt(40, 40, -100)
    svg().dispatchEvent(wheel)
    flush()
    expect(wheel.defaultPrevented).toBe(true)
    const v = view() as { x: number; y: number; scale: number }
    expect(v.scale).toBeCloseTo(Math.exp(0.2), 5)
    // The point of the map under the pointer, (20, 20), is still at 40 pixels.
    expect((20 - v.x) * 2 * v.scale).toBeCloseTo(40, 5)
    expect((20 - v.y) * 2 * v.scale).toBeCloseTo(40, 5)
    expect(chart.hitTest(40, 40)?.label).toBe('A')
  })

  test('leaves the wheel to the page with wheel: false', () => {
    create({ zoom: { wheel: false } })
    const wheel = wheelAt(40, 40, -100)
    svg().dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(false)
    expect(view()).toBeUndefined()
  })

  test('zooms with a double click and the keys, and 0 shows the whole map again', () => {
    create({ zoom: true })
    svg().dispatchEvent(new MouseEvent('dblclick', at(0, 0)))
    flush()
    expect(view()).toEqual({ x: 0, y: 0, scale: 2 })
    key('+')
    expect(view()?.scale).toBe(4)
    key('-')
    expect(view()?.scale).toBe(2)
    key('0')
    expect(view()).toEqual({ x: 0, y: 0, scale: 1 })
  })

  test('drags the map, but never out of sight', () => {
    create({ zoom: true, view: { x: 25, y: 12.5, scale: 2 }, select: 'single' })
    const clicks = vi.fn()
    chart.on('click', clicks)
    pointer('pointerdown', 100, 50)
    pointer('pointermove', 80, 50)
    flush()
    // 20 pixels at 4 pixels per unit of the map.
    expect(view()).toEqual({ x: 30, y: 12.5, scale: 2 })
    expect(svg().getAttribute('data-zoom')).toBe('drag')
    pointer('pointermove', -900, 50)
    expect(view()?.x).toBe(50)
    pointer('pointerup', -900, 50, 1, document)
    // The click that ends a drag is not a click on the map.
    click(100, 50)
    flush()
    expect(clicks).not.toHaveBeenCalled()
    expect(chart.config.selected).toEqual([])
    expect(svg().getAttribute('data-zoom')).toBe('')
  })

  test('takes a press that barely moves for a click', () => {
    create({ zoom: true, select: 'single' })
    pointer('pointerdown', 40, 40)
    pointer('pointermove', 42, 41)
    pointer('pointerup', 42, 41, 1, document)
    click(42, 41)
    expect(view()).toBeUndefined()
    expect(chart.config.selected).toEqual(['A'])
  })

  test('pinches with two pointers', () => {
    create({ zoom: true })
    pointer('pointerdown', 80, 50, 1)
    pointer('pointerdown', 120, 50, 2)
    pointer('pointermove', 140, 50, 2)
    flush()
    // The fingers went from 40 to 60 pixels apart.
    expect(view()?.scale).toBeCloseTo(1.5, 5)
  })

  test('stops listening when destroyed', () => {
    create({ zoom: true })
    const node = svg()
    chart.destroy()
    const wheel = wheelAt(40, 40, -100)
    node.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(false)
    expect(el.querySelector('.tc-map-zoom')).toBeNull()
    expect(el.classList.contains('tc-container')).toBe(false)
  })
})

describe('map selection', () => {
  const selected = () =>
    Array.from(el.querySelectorAll('.tc-region-selected')).map((r) => r.getAttribute('data-region'))

  test('selects nothing without the option', () => {
    create({ selected: ['A'] })
    click(40, 40)
    flush()
    expect(selected()).toEqual([])
    expect(el.querySelector('.tc-map-selectable')).toBeNull()
  })

  test('selects one region at a time, and a second click takes it out', () => {
    const onSelect = vi.fn()
    create({ select: 'single', onSelect })
    expect(el.querySelector('.tc-map-selectable')).not.toBeNull()
    click(40, 40)
    flush()
    expect(selected()).toEqual(['A'])
    expect(onSelect).toHaveBeenLastCalledWith(['A'], 'A')
    click(140, 40)
    flush()
    expect(selected()).toEqual(['B'])
    // The selected shape is drawn last, over its neighbors.
    expect(el.querySelector('.tc-map-regions')?.lastElementChild?.getAttribute('data-region')).toBe(
      'B',
    )
    click(140, 40)
    flush()
    expect(selected()).toEqual([])
    expect(onSelect).toHaveBeenLastCalledWith([], 'B')
    // The sea selects nothing.
    click(100, 10)
    expect(onSelect).toHaveBeenCalledTimes(3)
  })

  test('selects any number of regions with multiple', () => {
    create({ select: 'multiple', selected: ['B', 'ZZ'] })
    expect(selected()).toEqual(['B'])
    click(40, 40)
    flush()
    expect(chart.config.selected).toEqual(['B', 'ZZ', 'A'])
    // (Drawn in the order of the map.)
    expect(selected()).toEqual(['A', 'B'])
  })

  test('a marker is not a region', () => {
    create({ select: 'single', markers: [{ name: 'A', lat: 0, lng: 0 }] })
    click(100, 50)
    expect(chart.config.selected).toEqual([])
  })

  test('selects the region the keyboard is on with Enter', () => {
    create({ select: 'single' })
    key('ArrowRight')
    key('Enter')
    flush()
    expect(selected()).toEqual(['A'])
    key(' ')
    flush()
    expect(selected()).toEqual([])
  })
})
