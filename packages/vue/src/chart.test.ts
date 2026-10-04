// @vitest-environment happy-dom
import { type Chart, type ChartType, flush, line } from '@tabler/charts'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  type App,
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  reactive,
  ref,
  shallowRef,
} from 'vue'
import { renderToString } from 'vue/server-renderer'
import { BarChart, LineChart, RadarChart, TablerChart, useChart } from './index.ts'

const data = () => ({
  labels: ['Mon', 'Tue', 'Wed'],
  series: [
    { name: 'Visitors', values: [3, 5, 4] },
    { name: 'Sign-ups', values: [1, 2, 1] },
  ],
})

let app: App | undefined
let host: HTMLElement

function mount(component: Parameters<typeof createApp>[0]): HTMLElement {
  host = document.createElement('div')
  document.body.append(host)
  app = createApp(component)
  app.mount(host)
  return host
}

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
})

describe('@tabler/charts-vue', () => {
  test('renders the chart on the server, with ids from useId', async () => {
    const html = await renderToString(
      createSSRApp(() => h(LineChart, { data: data(), width: 400, height: 200, locale: 'en-US' })),
    )
    expect(html).toMatch(/^<div class="tc-container"><svg [^>]*class="tc-chart tc-chart-line[ "]/)
    expect(html).toContain('viewBox="0 0 400 200"')
    const clip = html.match(/clipPath id="([^"]+)"/)?.[1] ?? ''
    expect(clip).toMatch(/^tc-[a-zA-Z0-9]+-clip$/)
  })

  test('renders every chart type, e.g. RadarChart', async () => {
    const html = await renderToString(
      createSSRApp(() => h(RadarChart, { data: data(), width: 400, height: 300, locale: 'en-US' })),
    )
    expect(html).toContain('tc-chart-radar')
    expect(html.match(/tc-radar-spoke/g)).toHaveLength(3)
  })

  test('hydrates without warnings, reusing the server svg nodes', async () => {
    const root = () => h(LineChart, { data: data(), width: 400, height: 200, locale: 'en-US' })
    host = document.createElement('div')
    host.innerHTML = await renderToString(createSSRApp(root))
    document.body.append(host)
    const svg = host.querySelector('svg')
    const line = host.querySelector('.tc-series-1 .tc-line')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    app = createSSRApp(root)
    app.mount(host)
    flush()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    warn.mockRestore()
    error.mockRestore()
    // The very same nodes: hydrated, not re-created, so entrance animations do not run again.
    expect(host.querySelector('svg')).toBe(svg)
    expect(host.querySelector('.tc-series-1 .tc-line')).toBe(line)
    expect(host.querySelectorAll('svg.tc-chart')).toHaveLength(1)
    expect(host.querySelector('.tc-legend')).not.toBeNull()
  })

  test('kebab-case attributes become options; class and style go to the container', () => {
    const chart = ref<{ chart: Chart<object> | null } | null>(null)
    mount(() =>
      h(BarChart, {
        ref: chart,
        data: data(),
        width: 300,
        'aspect-ratio': 3,
        stacked: true,
        class: 'card',
        style: { maxWidth: '300px' },
      }),
    )
    const config = chart.value?.chart?.config as unknown as Record<string, unknown>
    expect(config).toMatchObject({ width: 300, aspectRatio: 3, stacked: true })
    expect(config.class).toBeUndefined()
    const container = host.firstElementChild as HTMLElement
    expect(container.className).toBe('tc-container card')
    expect(container.style.maxWidth).toBe('300px')
    expect(host.querySelector('svg')?.getAttribute('height')).toBe('100')
  })

  test('updates on new data, on data changed in place and on attribute changes', async () => {
    const state = reactive({ data: data(), stacked: false })
    mount(() => h(BarChart, { data: state.data, width: 300, height: 150, stacked: state.stacked }))
    flush()
    expect(host.querySelectorAll('.tc-bar')).toHaveLength(6)
    // In place: the parent's render does not even read the values.
    state.data.series[0]?.values.push(7)
    state.data.labels.push('Thu')
    await nextTick()
    flush()
    expect(host.querySelectorAll('.tc-bar')).toHaveLength(7)
    // A new object.
    state.data = { labels: ['a'], series: [{ name: 'A', values: [1] }] }
    await nextTick()
    flush()
    expect(host.querySelectorAll('.tc-bar')).toHaveLength(1)
    // Another option.
    state.stacked = true
    await nextTick()
    flush()
    expect(host.querySelector('svg')).not.toBeNull()
  })

  test('an attribute that is no longer passed leaves the chart', async () => {
    const exposed = ref<{ chart: Chart<object> | null } | null>(null)
    const stacked = ref(true)
    const fixed = data()
    mount(() =>
      h(BarChart, {
        ref: exposed,
        data: fixed,
        width: 300,
        height: 150,
        ...(stacked.value ? { stacked: true } : {}),
      }),
    )
    const config = () => exposed.value?.chart?.config as { stacked?: boolean } | undefined
    expect(config()?.stacked).toBe(true)
    stacked.value = false
    await nextTick()
    flush()
    expect(config()?.stacked).toBeUndefined()
  })

  test('re-renders with equal props do not update the chart', async () => {
    const exposed = ref<{ chart: Chart<object> | null } | null>(null)
    const tick = ref(0)
    const fixed = data()
    mount(() =>
      h('div', { 'data-tick': tick.value }, [
        h(LineChart, { ref: exposed, data: fixed, width: 300, height: 150 }),
      ]),
    )
    const target = exposed.value?.chart as unknown as { setConfig: () => void }
    const update = vi.spyOn(target, 'setConfig')
    tick.value++
    await nextTick()
    expect(update).not.toHaveBeenCalled()
  })

  test('emits chart events', () => {
    const exposed = ref<{ chart: Chart<object> | null } | null>(null)
    const onLegendToggle = vi.fn()
    const onRender = vi.fn()
    mount(() =>
      h(LineChart, {
        ref: exposed,
        data: data(),
        width: 300,
        height: 150,
        onLegendToggle,
        onRender,
      }),
    )
    exposed.value?.chart?.toggleSeries('Visitors')
    expect(onLegendToggle).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Visitors', hidden: true }),
    )
    flush()
    expect(onRender).toHaveBeenCalled()
  })

  test('TablerChart takes the type as a prop and follows its changes', async () => {
    const type = shallowRef<ChartType<object>>(line as ChartType<object>)
    mount(() => h(TablerChart, { type: type.value, data: data(), width: 300, height: 150 }))
    flush()
    expect(host.querySelector('svg')?.getAttribute('class')).toContain('tc-chart-line')
    const { bar } = await import('@tabler/charts')
    type.value = bar as ChartType<object>
    await nextTick()
    flush()
    expect(host.querySelector('svg')?.getAttribute('class')).toContain('tc-chart-bar')
  })

  test('unmounting destroys the chart', () => {
    mount(() => h(LineChart, { data: data(), width: 300, height: 150 }))
    expect(host.querySelector('svg')).not.toBeNull()
    app?.unmount()
    app = undefined
    expect(host.innerHTML).toBe('')
  })

  test('useChart binds a chart to your own element and follows the config deeply', async () => {
    const values = reactive([1, 2, 3])
    let bound: { value: Chart<object> | null } = { value: null }
    const Custom = defineComponent(() => {
      const el = ref<HTMLElement | null>(null)
      bound = useChart(el, () => ({
        type: line,
        data: { labels: ['a', 'b', 'c', 'd'], series: [{ name: 'A', values }] },
        width: 300,
        height: 150,
        points: 'all' as const,
      })) as { value: Chart<object> | null }
      return () => h('section', { ref: el })
    })
    mount(Custom)
    flush()
    expect(bound.value).not.toBeNull()
    expect(host.querySelectorAll('section > svg .tc-series-list .tc-point')).toHaveLength(3)
    values.push(4)
    await nextTick()
    flush()
    expect(host.querySelectorAll('section > svg .tc-series-list .tc-point')).toHaveLength(4)
  })
})
