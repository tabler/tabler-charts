// @vitest-environment happy-dom
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Chart } from './chart-default.ts'
import { line } from './charts/line.ts'
import { downloadChart, exportSVG } from './export.ts'
import { flush } from './scheduler.ts'

const data = {
  labels: ['Mon', 'Tue', 'Wed'],
  series: [
    { name: 'Visitors', values: [3, 5, 4] },
    { name: 'Sign-ups', values: [1, 2, 1] },
  ],
}

function mount(css = '') {
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
  const el = document.createElement('div')
  document.body.append(el)
  const chart = new Chart(el, {
    type: line,
    data,
    width: 400,
    height: 200,
    locale: 'en-US',
    title: 'Weekly visitors',
  })
  return { el, chart }
}

const parse = (markup: string) =>
  new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('exportSVG()', () => {
  test('a standalone svg document with a title, from a chart or its element', () => {
    const { el, chart } = mount()
    const svg = parse(exportSVG(chart))
    expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
    expect(svg.getAttribute('class')).toBeNull()
    expect(svg.querySelector('title')?.textContent).toBe('Weekly visitors')
    expect(svg.querySelectorAll('.tc-line')).toHaveLength(2)
    expect(exportSVG(el)).toBe(exportSVG(chart))
    expect(exportSVG(el.querySelector('svg') as Element)).toBe(exportSVG(chart))
  })

  test('inlines the computed styles of the marks', () => {
    const { chart } = mount('.tc-series-1 .tc-line { stroke: rgb(255, 0, 0); stroke-width: 3px }')
    const first = parse(exportSVG(chart)).querySelector('.tc-series-1 .tc-line')
    expect(first?.getAttribute('style')).toContain('stroke:rgb(255, 0, 0)')
    expect(first?.getAttribute('style')).toContain('stroke-width:3px')
  })

  test('turns CSS transforms into transform attributes', () => {
    const { chart } = mount()
    const svg = parse(exportSVG(chart))
    const tick = svg.querySelector('.tc-tick')
    expect(tick?.getAttribute('style') ?? '').not.toContain('translate')
    expect(tick?.getAttribute('transform')).toMatch(/^(matrix\(1, 0, 0, 1|translate\()[\d., ]+\)$/)
  })

  test('leaves the hover marks and hidden elements out', () => {
    const { chart } = mount('.tc-grid { display: none }')
    chart.highlightIndex(1)
    flush()
    expect(document.querySelector('.tc-hover-layer')).not.toBeNull()
    const svg = parse(exportSVG(chart))
    expect(svg.querySelector('.tc-hover-layer')).toBeNull()
    expect(svg.querySelector('.tc-grid')).toBeNull()
  })

  test('paints the surface color behind the chart, another color, or none', () => {
    const { chart } = mount('.tc-chart { --tc-surface: #123456 }')
    const background = (markup: string) => parse(markup).querySelector(':scope > rect')
    expect(background(exportSVG(chart))?.getAttribute('fill')).toBe('#123456')
    expect(background(exportSVG(chart, { background: 'white' }))?.getAttribute('fill')).toBe(
      'white',
    )
    expect(background(exportSVG(chart, { background: false }))).toBeNull()
  })

  test('draws the legend into the image, unless asked not to', () => {
    const { chart } = mount()
    chart.toggleSeries('Sign-ups', true)
    flush()
    const svg = parse(exportSVG(chart))
    const names = Array.from(svg.querySelectorAll(':scope > g > text')).map((t) => t.textContent)
    expect(names).toEqual(['Visitors', 'Sign-ups'])
    // The hidden entry keeps a hollow swatch.
    const swatches = Array.from(svg.querySelectorAll(':scope > g > circle'))
    expect(swatches[1]?.getAttribute('style')).toContain('fill:none')
    expect(parse(exportSVG(chart, { legend: false })).querySelector(':scope > g > text')).toBeNull()
  })

  test('explains a missing chart', () => {
    expect(() => exportSVG(document.createElement('div'))).toThrow(/no rendered chart/)
  })
})

describe('downloadChart()', () => {
  test('saves an svg file named after the title', async () => {
    const { chart } = mount()
    const created = vi.fn((_blob: Blob) => 'blob:chart')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: created, revokeObjectURL: vi.fn() }))
    let saved: HTMLAnchorElement | undefined
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved = this
    })
    await downloadChart(chart, { format: 'svg' })
    expect(saved?.download).toBe('Weekly visitors.svg')
    expect(created.mock.calls[0]?.[0].type).toBe('image/svg+xml')
    await downloadChart(chart, { format: 'svg', filename: 'sales/q1' })
    expect(saved?.download).toBe('salesq1.svg')
  })
})
