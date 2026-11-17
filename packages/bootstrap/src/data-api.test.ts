// @vitest-environment happy-dom
import { flush } from '@tabler/charts'
// The download attribute saves through the export entry.
import '@tabler/charts/export'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { dispose, getChart, init, observe } from './index.ts'

const data = { labels: ['Mon', 'Tue', 'Wed'], series: [{ name: 'Visitors', values: [3, 5, 4] }] }

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  for (const el of document.querySelectorAll<HTMLElement>('[data-tc-chart]')) dispose(el)
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('data API', () => {
  test('creates charts from data-tc-* attributes and inline JSON', async () => {
    document.body.innerHTML = `
      <div id="a" data-tc-chart="bar" data-tc-width="400" data-tc-aspect-ratio="4"
        data-tc-stacked="true" data-tc-legend="bottom" data-tc-tooltip="light" data-tc-title="Visits" data-tc-locale="de-DE"
        data-tc-download="svg, png" data-tc-options='{"radius": 0}'>
        <script type="application/json">${JSON.stringify(data)}</script>
      </div>
      <div id="b" data-tc-chart="donut" data-tc-data='[{"name":"A","value":1},{"name":"B","value":2}]'></div>`
    const charts = await init()
    expect(charts).toHaveLength(2)
    const a = document.getElementById('a') as HTMLElement
    expect(getChart(a)?.config).toMatchObject({
      width: 400,
      aspectRatio: 4,
      stacked: true,
      legend: { position: 'bottom' },
      tooltip: { theme: 'light' },
      title: 'Visits',
      locale: 'de-DE',
      download: ['svg', 'png'],
      radius: 0,
      data,
    })
    expect(a.querySelector(':scope > svg.tc-chart-bar')?.getAttribute('height')).toBe('100')
    expect(a.querySelectorAll(':scope > .tc-download .tc-download-item')).toHaveLength(2)
    expect(document.querySelectorAll('#b .tc-slice')).toHaveLength(2)
  })

  test('text options stay text, whatever they spell', async () => {
    document.body.innerHTML = `<div data-tc-chart="line" data-tc-title="2024" data-tc-description="true"
      data-tc-sync="1" data-tc-width="400" data-tc-download="true" data-tc-data='${JSON.stringify(data)}'></div>`
    const [chart] = await init()
    expect(chart?.config).toMatchObject({
      title: '2024',
      description: 'true',
      sync: '1',
      width: 400,
      download: true,
    })
    expect(document.querySelector('svg')?.getAttribute('aria-label')).toBe('2024')
  })

  test('knows every built-in type, e.g. radar', async () => {
    document.body.innerHTML = `<div data-tc-chart="radar" data-tc-width="400" data-tc-data='${JSON.stringify(data)}'></div>`
    await init()
    expect(document.querySelector('svg.tc-chart-radar')).not.toBeNull()
    expect(document.querySelectorAll('.tc-radar-spoke')).toHaveLength(3)
  })

  test('init() is idempotent and returns the existing charts', async () => {
    document.body.innerHTML = `<div data-tc-chart="line" data-tc-width="300" data-tc-data='${JSON.stringify(data)}'></div>`
    const [first] = await init()
    const [again] = await init()
    expect(again).toBe(first)
    expect(document.querySelectorAll('svg.tc-chart')).toHaveLength(1)
  })

  test('loads data-tc-src, marking the element busy meanwhile', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(data)))
    vi.stubGlobal('fetch', fetch)
    document.body.innerHTML = `<div id="c" data-tc-chart="line" data-tc-width="300" data-tc-src="/api/sales.json"></div>`
    const el = document.getElementById('c') as HTMLElement
    const done = init()
    expect(el.getAttribute('aria-busy')).toBe('true')
    // A second init() while loading does not fetch again.
    void init()
    const [chart] = await done
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/sales.json')
    expect(chart?.config).toMatchObject({ data })
    expect(el.hasAttribute('aria-busy')).toBe(false)
    expect(el.querySelector('svg.tc-chart-line')).not.toBeNull()
  })

  test('reports a failed load and a broken declaration without stopping the others', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response('nope', { status: 404, statusText: 'Not Found' }),
    )
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    document.body.innerHTML = `
      <div id="missing" data-tc-chart="line" data-tc-src="/missing.json"></div>
      <div id="unknown" data-tc-chart="nope"></div>
      <div id="ok" data-tc-chart="line" data-tc-width="300" data-tc-data='${JSON.stringify(data)}'></div>`
    const errors: string[] = []
    document.body.addEventListener('tc-error', (event) => errors.push((event.target as Element).id))
    const charts = await init()
    expect(charts).toHaveLength(1)
    expect(getChart(document.getElementById('ok') as Element)).toBeDefined()
    expect(errors.sort()).toEqual(['missing', 'unknown'])
    expect(String(error.mock.calls.flat().join(' '))).toMatch(/unknown chart type "nope"/)
  })

  test('forwards chart events as tc-* DOM events', async () => {
    document.body.innerHTML = `<div id="d" data-tc-chart="line" data-tc-width="300" data-tc-data='${JSON.stringify(
      {
        labels: ['a'],
        series: [
          { name: 'A', values: [1] },
          { name: 'B', values: [2] },
        ],
      },
    )}'></div>`
    const seen: string[] = []
    for (const name of ['tc-render', 'tc-legend-toggle']) {
      document.body.addEventListener(name, (event) => seen.push(event.type))
    }
    const [chart] = await init()
    chart?.toggleSeries('A')
    expect(seen).toEqual(['tc-render', 'tc-legend-toggle'])
  })

  test('observe() initializes added charts and destroys removed ones', async () => {
    const stop = observe(document.body)
    const el = document.createElement('div')
    el.dataset.tcChart = 'bar'
    el.dataset.tcWidth = '300'
    el.dataset.tcData = JSON.stringify(data)
    document.body.append(el)
    await settle()
    flush()
    const chart = getChart(el)
    expect(chart).toBeDefined()
    expect(el.querySelectorAll('.tc-bar')).toHaveLength(3)
    const destroy = vi.spyOn(chart as NonNullable<typeof chart>, 'destroy')
    el.remove()
    await settle()
    expect(destroy).toHaveBeenCalled()
    expect(getChart(el)).toBeUndefined()
    stop()
  })

  test('observe() does not look for charts in what a chart renders', async () => {
    document.body.innerHTML = `<div data-tc-chart="bar" data-tc-width="300" data-tc-data='${JSON.stringify(data)}'></div>`
    const stop = observe(document.body)
    const el = document.body.firstElementChild as HTMLElement
    await settle()
    const search = vi.spyOn(Element.prototype, 'querySelectorAll')
    // New bars and a tooltip: nodes added inside the chart.
    getChart(el)?.setData({ labels: ['a', 'b'], series: [{ name: 'X', values: [1, 2] }] } as never)
    getChart(el)?.highlightIndex(0)
    flush()
    await settle()
    expect(search.mock.calls.filter(([selector]) => selector === '[data-tc-chart]')).toEqual([])
    stop()
  })
})
