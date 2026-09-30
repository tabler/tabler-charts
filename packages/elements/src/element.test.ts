// @vitest-environment happy-dom
import { flush, line } from '@tabler/charts'
import { afterEach, describe, expect, test } from 'vitest'
import { defineChartElement as defineCore } from './core.ts'
import type { ChartElement } from './element.ts'
import { defineChartElement } from './index.ts'

defineChartElement()

const data = { labels: ['Mon', 'Tue', 'Wed'], series: [{ name: 'Visitors', values: [3, 5, 4] }] }

/** Let observers and scheduled renders run. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  flush()
}

/** Insert markup; inline data arrives like with a framework, after the element connected. */
async function mount(html: string): Promise<ChartElement> {
  document.body.innerHTML = html
  const el = document.body.firstElementChild as ChartElement
  await settle()
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('<tabler-chart>', () => {
  test('renders the inline JSON data with the type from the attribute', async () => {
    const el = await mount(
      `<tabler-chart type="line" width="400" height="200" label="Visitors"><script type="application/json">${JSON.stringify(data)}</script></tabler-chart>`,
    )
    const svg = el.querySelector(':scope > svg.tc-chart')
    expect(svg?.getAttribute('class')).toContain('tc-chart-line')
    expect(svg?.getAttribute('aria-label')).toBe('Visitors')
    expect(svg?.getAttribute('width')).toBe('400')
    expect(el.querySelectorAll('.tc-line')).toHaveLength(1)
    // The data script stays, the default Chart's plugins (the data table) are there.
    expect(el.querySelector('script[type="application/json"]')).not.toBeNull()
    expect(el.querySelector('.tc-table')).not.toBeNull()
    expect(el.chart?.config.type).toBe(line)
  })

  test('the data property wins over the script and updates the chart', async () => {
    const el = await mount(
      `<tabler-chart type="bar" width="400" height="200"><script type="application/json">${JSON.stringify(data)}</script></tabler-chart>`,
    )
    expect(el.querySelectorAll('.tc-bar')).toHaveLength(3)
    const chart = el.chart
    el.data = { labels: ['a', 'b'], series: [{ name: 'X', values: [1, 2] }] }
    flush()
    expect(el.chart).toBe(chart)
    expect(el.querySelectorAll('.tc-bar')).toHaveLength(2)
  })

  test('maps attributes and the options JSON into the config', async () => {
    const el = await mount(
      `<tabler-chart type="bar" width="400" aspect-ratio="4" legend="bottom" tooltip="false" animate="false" table="visible" locale="de-DE" options='{"stacked":true,"radius":0}'></tabler-chart>`,
    )
    el.data = {
      labels: ['a'],
      series: [
        { name: 'A', values: [1] },
        { name: 'B', values: [2] },
      ],
    }
    flush()
    const config = el.chart?.config as unknown as Record<string, unknown>
    expect(config).toMatchObject({
      width: 400,
      aspectRatio: 4,
      legend: { position: 'bottom' },
      tooltip: false,
      animate: false,
      table: 'visible',
      locale: 'de-DE',
      stacked: true,
      radius: 0,
    })
    expect(el.querySelector('svg')?.getAttribute('height')).toBe('100')
    expect(el.querySelector('.tc-legend')?.getAttribute('data-position')).toBe('bottom')
    // The options property merges over the attribute.
    el.options = { stacked: false }
    flush()
    expect(el.chart?.config).toMatchObject({ stacked: false })
  })

  test('changing the type rebuilds the chart, removing it clears it', async () => {
    const el = await mount(`<tabler-chart type="line" width="300" height="150"></tabler-chart>`)
    expect(el.chart).toBeUndefined()
    el.data = data
    const first = el.chart
    el.setAttribute('type', 'area')
    flush()
    expect(el.chart).not.toBe(first)
    expect(el.querySelector('svg')?.getAttribute('class')).toContain('tc-chart-area')
    el.removeAttribute('type')
    expect(el.chart).toBeUndefined()
    expect(el.querySelector('svg')).toBeNull()
  })

  test('forwards chart events as tc-* DOM events', async () => {
    const el = await mount(`<tabler-chart type="line" width="300" height="150"></tabler-chart>`)
    const seen: string[] = []
    for (const name of ['tc-render', 'tc-legend-toggle', 'tc-hover']) {
      document.body.addEventListener(name, (event) => seen.push(event.type))
    }
    el.data = {
      labels: ['a', 'b'],
      series: [
        { name: 'A', values: [1, 2] },
        { name: 'B', values: [2, 1] },
      ],
    }
    flush()
    el.chart?.toggleSeries('A')
    el.chart?.highlightIndex(0)
    expect(seen).toEqual(['tc-render', 'tc-legend-toggle', 'tc-hover'])
  })

  test('re-reads inline data when a framework changes the script', async () => {
    const el = await mount(
      `<tabler-chart type="bar" width="300" height="150"><script type="application/json">${JSON.stringify(data)}</script></tabler-chart>`,
    )
    const script = el.querySelector('script') as HTMLScriptElement
    script.textContent = JSON.stringify({ labels: ['x'], series: [{ name: 'X', values: [1] }] })
    await settle()
    expect(el.querySelectorAll('.tc-bar')).toHaveLength(1)
  })

  test('disconnecting destroys the chart, reconnecting builds it again', async () => {
    const el = await mount(`<tabler-chart type="line" width="300" height="150"></tabler-chart>`)
    el.data = data
    el.remove()
    expect(el.chart).toBeUndefined()
    expect(el.querySelector('svg')).toBeNull()
    document.body.append(el)
    flush()
    expect(el.querySelector('svg.tc-chart')).not.toBeNull()
  })

  test('reports unknown types and invalid JSON clearly', () => {
    const el = document.createElement('tabler-chart') as ChartElement
    el.setAttribute('type', 'nope')
    expect(() => {
      el.data = data
      document.body.append(el)
    }).toThrow(/unknown type "nope"\. Known types: line, area/)
    const bad = document.createElement('tabler-chart') as ChartElement
    bad.setAttribute('type', 'line')
    bad.setAttribute('options', '{oops')
    bad.data = data
    expect(() => document.body.append(bad)).toThrow(/invalid JSON in the options attribute/)
  })

  test('gives the element a block box once, with zero specificity', () => {
    expect(document.querySelectorAll('#tc-element-tabler-chart')).toHaveLength(1)
    expect(document.getElementById('tc-element-tabler-chart')?.textContent).toBe(
      ':where(tabler-chart){display:block}',
    )
  })

  test('the core entry registers only the given types, under its own tag', () => {
    defineCore({ tag: 'lean-chart', types: { line } })
    document.body.innerHTML = '<lean-chart type="line" width="300" height="150"></lean-chart>'
    const el = document.body.firstElementChild as ChartElement
    el.data = data
    flush()
    expect(el.querySelector('.tc-line')).not.toBeNull()
    // The bare Chart has no plugins: no data table unless asked for.
    expect(el.querySelector('.tc-table')).toBeNull()
    const bar = document.createElement('lean-chart') as ChartElement
    bar.setAttribute('type', 'bar')
    bar.data = data
    expect(() => document.body.append(bar)).toThrow(/Known types: line\./)
  })
})
