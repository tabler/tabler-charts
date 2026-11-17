// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Chart, type ChartConfig } from '../chart.ts'
import { Chart as DefaultChart } from '../chart-default.ts'
import { line } from '../charts/line.ts'
import { features } from '../features.ts'
import { flush } from '../scheduler.ts'
import { download } from './download.ts'
import { pointer } from './pointer.ts'

const data = { labels: ['Jan', 'Feb', 'Mar'], series: [{ name: 'A', values: [1, 2, 3] }] }
const base = { type: line, data, width: 400, height: 200, locale: 'en-US' } as ChartConfig<object>

let el: HTMLElement
let chart: Chart<object>
/** The feature as the export entry registers it, here a spy. */
let saved: ReturnType<typeof vi.fn>

beforeEach(() => {
  el = document.createElement('div')
  document.body.appendChild(el)
  saved = vi.fn(() => Promise.resolve())
  features.export = saved as unknown as typeof features.export
})

afterEach(() => {
  chart?.destroy()
  el.remove()
  delete features.export
})

const toggle = () => el.querySelector<HTMLButtonElement>('.tc-download-toggle') as HTMLButtonElement
const menu = () => el.querySelector<HTMLElement>('.tc-download-menu') as HTMLElement
const items = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.tc-download-item'))
const key = (target: Element, key: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))

describe('download()', () => {
  test('shows nothing without the option', () => {
    chart = new Chart(el, { ...base, plugins: [download()] })
    expect(el.querySelector('.tc-download')).toBeNull()
    expect(el.classList.contains('tc-container')).toBe(false)
  })

  test('marks a right-to-left chart, so the menu takes the left corner', () => {
    chart = new Chart(el, { ...base, plugins: [download()], download: true, rtl: true })
    const box = () => el.querySelector('.tc-download')
    expect(box()?.getAttribute('dir')).toBe('rtl')
    chart.update({ rtl: false }).render()
    expect(box()?.getAttribute('dir')).toBe('')
  })

  test('a menu with PNG and SVG, in the positioned container', () => {
    chart = new Chart(el, { ...base, plugins: [download()], download: true })
    expect(el.classList.contains('tc-container')).toBe(true)
    expect(toggle().getAttribute('aria-label')).toBe('Download')
    expect(toggle().getAttribute('aria-haspopup')).toBe('menu')
    expect(toggle().getAttribute('aria-expanded')).toBe('false')
    expect(menu().hidden).toBe(true)
    expect(menu().getAttribute('role')).toBe('menu')
    expect(items().map((item) => item.textContent)).toEqual(['PNG', 'SVG'])
    expect(items().map((item) => item.getAttribute('data-format'))).toEqual(['png', 'svg'])
    // The menu lives outside the chart svg.
    expect(el.querySelector('svg.tc-chart .tc-download')).toBeNull()
  })

  test('a list picks the formats, an object the rest', () => {
    chart = new Chart(el, {
      ...base,
      plugins: [download()],
      download: ['svg', 'webp', 'jpeg'],
    })
    expect(items().map((item) => item.textContent)).toEqual(['SVG', 'WebP', 'JPEG'])
    chart.setConfig({ ...base, download: { formats: ['svg'], label: 'Save' } })
    flush()
    expect(items().map((item) => item.textContent)).toEqual(['SVG'])
    expect(toggle().getAttribute('aria-label')).toBe('Save')
  })

  test('opens on click, saves the chosen format and closes', () => {
    chart = new Chart(el, {
      ...base,
      plugins: [download()],
      download: { filename: 'sales', background: false, scale: 3 },
    })
    toggle().click()
    expect(menu().hidden).toBe(false)
    expect(toggle().getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(items()[0])
    items()[1]?.click()
    expect(saved).toHaveBeenCalledWith(chart, {
      filename: 'sales',
      background: false,
      scale: 3,
      format: 'svg',
    })
    expect(menu().hidden).toBe(true)
    expect(document.activeElement).toBe(toggle())
    // Clicking the button again closes an open menu.
    toggle().click()
    toggle().click()
    expect(menu().hidden).toBe(true)
  })

  test('closes on Escape, on a click outside and on leaving with the keyboard', () => {
    chart = new Chart(el, { ...base, plugins: [download()], download: true })
    toggle().click()
    key(items()[0] as Element, 'Escape')
    expect(menu().hidden).toBe(true)
    expect(document.activeElement).toBe(toggle())

    toggle().click()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(menu().hidden).toBe(true)

    toggle().click()
    items()[1]?.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }),
    )
    expect(menu().hidden).toBe(true)
  })

  test('arrow keys walk the formats and wrap around', () => {
    chart = new Chart(el, { ...base, plugins: [download()], download: true })
    key(toggle(), 'ArrowDown')
    expect(menu().hidden).toBe(false)
    expect(document.activeElement).toBe(items()[0])
    key(items()[0] as Element, 'ArrowDown')
    expect(document.activeElement).toBe(items()[1])
    key(items()[1] as Element, 'ArrowDown')
    expect(document.activeElement).toBe(items()[0])
    key(items()[0] as Element, 'ArrowUp')
    expect(document.activeElement).toBe(items()[1])
  })

  test('a hover changes nothing; turning the option off removes the menu', () => {
    chart = new Chart(el, { ...base, plugins: [download()], download: true })
    const before = el.querySelector('.tc-download')
    chart.highlightIndex(1)
    flush()
    expect(el.querySelector('.tc-download')).toBe(before)
    chart.setConfig({ ...base, download: false })
    flush()
    expect(el.querySelector('.tc-download')).toBeNull()
    expect(el.classList.contains('tc-container')).toBe(false)
  })

  test('hovering the menu clears the highlight, so no tooltip covers it', () => {
    chart = new Chart(el, { ...base, plugins: [download(), pointer()], download: true })
    const svg = el.querySelector('svg') as SVGSVGElement
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200 }) as DOMRect
    const move = (target: Element, x: number) =>
      target.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: x,
          clientY: 100,
          bubbles: true,
          pointerType: 'mouse',
        }),
      )
    move(svg, 200)
    expect(chart.highlightSource).toBe('pointer')
    toggle().click()
    const click = vi.fn()
    chart.on('click', click)
    move(items()[0] as Element, 390)
    expect(chart.highlightSource).toBeUndefined()
    items()[0]?.click()
    expect(saved).toHaveBeenCalled()
    expect(click).not.toHaveBeenCalled()
  })

  test('destroying the chart removes the menu and its listeners', () => {
    chart = new Chart(el, { ...base, plugins: [download()], download: true })
    toggle().click()
    const spy = vi.spyOn(document, 'removeEventListener')
    chart.destroy()
    expect(el.querySelector('.tc-download')).toBeNull()
    expect(spy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true)
  })

  test('names the import when the export entry is missing', () => {
    delete features.export
    expect(() => new Chart(el, { ...base, plugins: [download()], download: true })).toThrow(
      /@tabler\/charts\/export/,
    )
  })

  test('the default Chart has the plugin, from the export entry', async () => {
    delete features.export
    await import('../export.ts')
    chart = new DefaultChart(el, { ...base, download: true })
    expect(el.querySelector('.tc-download-toggle')).not.toBeNull()
    // The real feature saves a file: not in this test.
    expect(features.export).toBeTypeOf('function')
  })
})
