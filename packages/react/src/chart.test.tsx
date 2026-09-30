// @vitest-environment happy-dom
import { type BarOptions, type Chart, flush, type LineOptions, line } from '@tabler/charts'
import { act, createRef, useState } from 'react'
import { createRoot, hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { BarChart, LineChart, TablerChart, useChart } from './index.ts'

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

const data = {
  labels: ['Mon', 'Tue', 'Wed'],
  series: [
    { name: 'Visitors', values: [3, 5, 4] },
    { name: 'Sign-ups', values: [1, 2, 1] },
  ],
}

let root: Root | undefined
let host: HTMLElement

function mount(node: React.ReactNode): HTMLElement {
  host = document.createElement('div')
  document.body.append(host)
  act(() => {
    root = createRoot(host)
    root.render(node)
  })
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('@tabler/charts-react', () => {
  test('renders the chart on the server, with ids from useId', () => {
    const html = renderToString(<LineChart data={data} width={400} height={200} locale="en-US" />)
    expect(html).toMatch(/^<div class="tc-container"><svg [^>]*class="tc-chart tc-chart-line"/)
    expect(html).toContain('viewBox="0 0 400 200"')
    // React ids contain colons or other marks; the chart ids stay plain.
    const clip = html.match(/clipPath id="([^"]+)"/)?.[1] ?? ''
    expect(clip).toMatch(/^tc-[a-zA-Z0-9]+-clip$/)
  })

  test('hydrates without warnings and takes the server svg over in place', () => {
    const tree = <LineChart data={data} width={400} height={200} locale="en-US" />
    host = document.createElement('div')
    host.innerHTML = renderToString(tree)
    document.body.append(host)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    act(() => {
      root = hydrateRoot(host, tree)
    })
    flush()
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
    // The server svg is replaced in place (same task, so nothing flashes), never duplicated;
    // the chart then adds its legend and data table next to it.
    expect(host.querySelectorAll('svg.tc-chart')).toHaveLength(1)
    expect(host.querySelector('svg')?.getAttribute('aria-label')).toBeNull()
    expect(host.querySelector('.tc-legend')).not.toBeNull()
  })

  test('exposes the Chart through the ref and updates it when props change', () => {
    const ref = createRef<Chart<BarOptions> | null>()
    let setValues: (values: number[]) => void = () => {}
    function App() {
      const [values, set] = useState([1, 2, 3])
      setValues = set
      return (
        <BarChart
          ref={ref}
          data={{ labels: values.map(String), series: [{ name: 'A', values }] }}
          width={300}
          height={150}
        />
      )
    }
    const el = mount(<App />)
    flush()
    expect(ref.current?.config.type).toBeDefined()
    expect(el.querySelectorAll('.tc-bar')).toHaveLength(3)
    const chart = ref.current
    act(() => setValues([4, 5]))
    flush()
    expect(ref.current).toBe(chart)
    expect(el.querySelectorAll('.tc-bar')).toHaveLength(2)
  })

  test('re-renders with equal props do not update the chart', () => {
    const ref = createRef<Chart<LineOptions> | null>()
    let bump: () => void = () => {}
    function App() {
      const [, set] = useState(0)
      bump = () => set((n) => n + 1)
      return <LineChart ref={ref} data={data} width={300} height={150} />
    }
    mount(<App />)
    const update = vi.spyOn(ref.current as Chart<LineOptions>, 'update')
    act(() => bump())
    expect(update).not.toHaveBeenCalled()
  })

  test('calls event props, always the latest ones', () => {
    const ref = createRef<Chart<LineOptions> | null>()
    const first = vi.fn()
    const second = vi.fn()
    const el = mount(
      <LineChart ref={ref} data={data} width={300} height={150} onLegendToggle={first} />,
    )
    act(() =>
      root?.render(
        <LineChart ref={ref} data={data} width={300} height={150} onLegendToggle={second} />,
      ),
    )
    ref.current?.toggleSeries('Visitors')
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith(expect.objectContaining({ name: 'Visitors', hidden: true }))
    expect(el).toBeTruthy()
  })

  test('the type prop of TablerChart can change', () => {
    const el = mount(<TablerChart type={line} data={data} width={300} height={150} />)
    flush()
    expect(el.querySelector('svg')?.getAttribute('class')).toContain('tc-chart-line')
    act(() => root?.render(<BarChart data={data} width={300} height={150} />))
    flush()
    expect(el.querySelector('svg')?.getAttribute('class')).toContain('tc-chart-bar')
  })

  test('unmounting destroys the chart', () => {
    const ref = createRef<Chart<LineOptions> | null>()
    const el = mount(<LineChart ref={ref} data={data} width={300} height={150} className="card" />)
    expect(el.firstElementChild?.getAttribute('class')).toBe('tc-container card')
    act(() => root?.unmount())
    root = undefined
    expect(el.innerHTML).toBe('')
    expect(ref.current).toBeNull()
  })

  test('useChart binds a chart to your own element', () => {
    let chart: Chart<object> | null = null
    function Custom() {
      const bound = useChart({ type: line, data, width: 300, height: 150 })
      chart = bound.chart as Chart<object> | null
      return <section ref={bound.ref} />
    }
    const el = mount(<Custom />)
    flush()
    expect(chart).not.toBeNull()
    expect(el.querySelector('section > svg.tc-chart-line')).not.toBeNull()
  })
})
