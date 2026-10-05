import { type CDPSession, expect, type Page, test } from '@playwright/test'

/**
 * Leaks: every way to use a chart (the Chart class with each type, the
 * elements in light and shadow DOM, the Bootstrap data API, React, Vue, and
 * a chart whose container is removed without destroy()) is mounted,
 * updated, hovered, toggled and torn down hundreds of times on
 * sandbox.html. After a forced garbage collection, Chromium's counters of
 * DOM nodes and JS event listeners must not grow with the cycles, and the
 * heap only a little (it levels off at a few hundred KB of caches and JIT
 * code; LEAK_LONG=1 runs 2000 more cycles and prints the trend).
 */

// biome-ignore lint/suspicious/noExplicitAny: the sandbox page globals (library, adapters, React, Vue).
type Win = Record<string, any>

async function open(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/sandbox.html')
  await page.locator('body[data-ready]').waitFor({ state: 'attached' })
  return errors
}

async function counters(cdp: CDPSession) {
  await cdp.send('HeapProfiler.collectGarbage')
  await cdp.send('HeapProfiler.collectGarbage')
  const dom = (await cdp.send('Memory.getDOMCounters')) as {
    nodes: number
    jsEventListeners: number
  }
  const heap = (await cdp.send('Runtime.getHeapUsage')) as { usedSize: number }
  return { nodes: dom.nodes, listeners: dom.jsEventListeners, heap: heap.usedSize }
}

/** Runs `n` cycles of one scenario in the page. */
async function cycles(page: Page, scenario: string, n: number): Promise<void> {
  await page.evaluate(
    async ({ scenario, n }) => {
      const w = window as unknown as Win
      const frame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)))
      const data = (k: number) => ({
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        series: [
          { name: 'North', values: [3, 5, 4, 6, 7].map((v) => v * k) },
          { name: 'South', values: [2, 3, 5, 4, 3].map((v) => v * k) },
        ],
      })
      const host = () => {
        const el = document.createElement('div')
        el.style.width = '400px'
        document.body.append(el)
        return el
      }
      /** Hover the middle of the chart, toggle the first legend entry, walk with the keyboard. */
      const poke = (root: ParentNode) => {
        const svg = root.querySelector('svg.tc-chart')
        if (!svg) return
        w.__drawn += 1
        const box = svg.getBoundingClientRect()
        const at = {
          clientX: box.left + box.width / 2,
          clientY: box.top + box.height / 2,
          bubbles: true,
          pointerType: 'mouse',
        }
        svg.dispatchEvent(new PointerEvent('pointermove', at))
        ;(root.querySelector('.tc-legend-item') as HTMLElement | null)?.click()
        svg.dispatchEvent(new FocusEvent('focus'))
        svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
        svg.dispatchEvent(new PointerEvent('pointerleave', at))
      }
      const types: [string, (k: number) => unknown][] = [
        ['line', data],
        ['area', data],
        ['bar', data],
        ['heatmap', data],
        ['radar', data],
        [
          'pie',
          (k) => [
            { name: 'A', value: 3 * k },
            { name: 'B', value: 5 },
          ],
        ],
        ['gauge', (k) => 40 * k],
        [
          'scatter',
          (k) => ({
            series: [
              {
                name: 'A',
                points: [
                  { x: 1, y: 2 * k },
                  { x: 3, y: 4 },
                ],
              },
            ],
          }),
        ],
        ['candlestick', (k) => [{ x: '2026-01-01', open: 2, high: 9 * k, low: 1, close: 5 }]],
        ['sparkline', (k) => [1, 3, 2 * k, 5]],
      ]

      for (let i = 0; i < n; i++) {
        const k = 1 + (i % 3)
        ;(w.__drawn as number | undefined) ??= 0
        if (scenario === 'chart') {
          const [type, make] = types[i % types.length] as [string, (k: number) => unknown]
          const el = host()
          const chart = new w.tc.Chart(el, {
            type: w.tc[type],
            data: make(1),
            locale: 'en-US',
            title: type,
          })
          await frame()
          poke(el)
          chart.update({ data: make(k) })
          await frame()
          chart.destroy()
          el.remove()
        } else if (scenario === 'forgotten') {
          // Taken out of the page without destroy(): must still be let go.
          const el = host()
          new w.tc.Chart(el, { type: w.tc.bar, data: data(k), locale: 'en-US', sync: 'forgotten' })
          await frame()
          poke(el)
          el.remove()
          await frame()
          await frame()
        } else if (scenario === 'element' || scenario === 'shadow') {
          const el = document.createElement(
            scenario === 'element' ? 'tabler-chart' : 'tabler-chart-shadow',
          )
          el.setAttribute('type', 'bar')
          el.setAttribute('locale', 'en-US')
          ;(el as unknown as Win).data = data(1)
          document.body.append(el)
          await frame()
          poke(el.shadowRoot ?? el)
          ;(el as unknown as Win).data = data(k)
          await frame()
          el.remove()
        } else if (scenario === 'bootstrap') {
          const el = host()
          el.dataset.tcChart = 'line'
          el.dataset.tcData = JSON.stringify(data(k))
          await new Promise((r) => setTimeout(r))
          await frame()
          poke(el)
          el.remove()
          await new Promise((r) => setTimeout(r))
        } else if (scenario === 'react') {
          const el = host()
          const root = w.ReactDOM.createRoot(el)
          const render = (k: number) =>
            w.flushSync(() =>
              root.render(
                w.React.createElement(w.tcReact.BarChart, { data: data(k), locale: 'en-US' }),
              ),
            )
          render(1)
          await frame()
          poke(el)
          render(k)
          await frame()
          w.flushSync(() => root.unmount())
          el.remove()
        } else if (scenario === 'vue') {
          const el = host()
          const state = w.Vue.shallowRef(data(1))
          const app = w.Vue.createApp({
            render: () => w.Vue.h(w.tcVue.BarChart, { data: state.value, locale: 'en-US' }),
          })
          app.mount(el)
          await frame()
          poke(el)
          state.value = data(k)
          await w.Vue.nextTick()
          await frame()
          app.unmount()
          el.remove()
        }
      }
      await frame()
    },
    { scenario, n },
  )
}

const SCENARIOS = ['chart', 'forgotten', 'element', 'shadow', 'bootstrap', 'react', 'vue']

test.describe('leaks', { tag: '@leaks' }, () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium counters (CDP)')

  for (const scenario of SCENARIOS) {
    test(`${scenario}: mount, update, hover and tear down leave nothing behind`, async ({
      page,
    }) => {
      const errors = await open(page)
      const cdp = await page.context().newCDPSession(page)
      if (scenario === 'bootstrap') {
        await page.evaluate(() => {
          ;(window as unknown as Win).__stop = (window as unknown as Win).tcBootstrap.observe(
            document.body,
          )
        })
      }
      await cycles(page, scenario, 50)
      const before = await counters(cdp)
      await cycles(page, scenario, 200)
      const after = await counters(cdp)
      if (process.env.LEAK_LONG) {
        test.setTimeout(300_000)
        for (let round = 0; round < 8; round++) {
          await cycles(page, scenario, 250)
          const now = await counters(cdp)
          console.log(
            scenario,
            'after',
            450 + round * 250,
            Math.round((now.heap - before.heap) / 1024),
            'KB',
            now.nodes - before.nodes,
            'nodes',
          )
        }
      }
      const grown = {
        nodes: after.nodes - before.nodes,
        listeners: after.listeners - before.listeners,
        heapKB: Math.round((after.heap - before.heap) / 1024),
      }
      const drawn = await page.evaluate(() => (window as unknown as Win).__drawn as number)
      const report = [...errors]
      // Every cycle drew a chart, or the counters measure nothing.
      if (drawn < 250) report.push(`only ${drawn} of 250 cycles drew a chart`)
      if (grown.nodes > 30) report.push(`${grown.nodes} DOM nodes more after 200 cycles`)
      if (grown.listeners > 10)
        report.push(`${grown.listeners} event listeners more after 200 cycles`)
      if (grown.heapKB > 512) report.push(`heap grew ${grown.heapKB} KB over 200 cycles`)
      expect(report, `${report.join('\n')}\n(${JSON.stringify(grown)})`).toEqual([])
    })
  }
})

/**
 * Lifecycle, in every engine: what a chart leaves after destroy, calls on a
 * destroyed chart, a second chart on the same element, elements moved and
 * re-added, React StrictMode, Vue KeepAlive, the data API run twice.
 */
const CASES: Record<string, string> = {
  'destroy leaves the container as it found it': `
    const el = host(); el.className = 'box'; el.innerHTML = '<p>own</p>'
    const chart = new tc.Chart(el, { type: tc.bar, data: data(1), locale: 'en-US', table: 'visible' })
    await frame(); poke(el)
    chart.destroy()
    if (el.innerHTML !== '<p>own</p>') issues.push('left: ' + el.innerHTML.slice(0, 120))
    if (el.className !== 'box') issues.push('class left: ' + el.className)
    if (el.getAttributeNames().sort().join() !== 'class,style') issues.push('attributes left: ' + el.getAttributeNames().join())
  `,
  'calls on a destroyed chart do nothing': `
    const el = host()
    const chart = new tc.Chart(el, { type: tc.line, data: data(1), locale: 'en-US' })
    chart.update({ data: data(2) }) // a frame is pending
    chart.destroy(); chart.destroy()
    chart.update({ data: data(3) }); chart.render(); chart.resize(); chart.toggleSeries('North')
    chart.highlightAt(10, 10); chart.setData(data(2))
    el.style.width = '300px'
    await frame(); await frame()
    if (el.innerHTML !== '') issues.push('rendered after destroy: ' + el.innerHTML.slice(0, 80))
  `,
  'a second chart on the same element replaces the first': `
    const el = host()
    const first = new tc.Chart(el, { type: tc.line, data: data(1), locale: 'en-US' })
    const second = new tc.Chart(el, { type: tc.bar, data: data(2), locale: 'en-US' })
    await frame(); poke(el); first.update({ data: data(3) }); await frame()
    const count = (s) => el.querySelectorAll(s).length
    if (count('svg.tc-chart') !== 1) issues.push(count('svg.tc-chart') + ' svgs')
    if (count('.tc-legend') !== 1) issues.push(count('.tc-legend') + ' legends')
    if (count('.tc-table-wrap') !== 1) issues.push(count('.tc-table-wrap') + ' tables')
    if (!el.querySelector('.tc-bar') || el.querySelector('.tc-line')) issues.push('the first chart still draws')
    let answers = 0
    first.on('hover', () => answers++); second.on('hover', () => answers++)
    el.querySelector('svg.tc-chart').dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
    await frame(); answers = 0
    poke(el); await frame()
    if (answers !== 1) issues.push(answers + ' charts answer a hover')
    second.destroy()
    if (el.innerHTML !== '') issues.push('left after destroying the second chart: ' + el.innerHTML.slice(0, 80))
  `,
  'an element moved to another parent keeps one working chart': `
    const a = host(); const b = host()
    for (const tag of ['tabler-chart', 'tabler-chart-shadow']) {
      const el = document.createElement(tag)
      el.setAttribute('type', 'bar'); el.data = data(1)
      a.append(el); await frame()
      b.append(el); await frame()
      const root = el.shadowRoot ?? el
      const svgs = root.querySelectorAll('svg.tc-chart').length
      if (svgs !== 1) issues.push(tag + ': ' + svgs + ' svgs after a move')
      if (root.querySelectorAll('.tc-legend').length > 1) issues.push(tag + ': legends doubled')
      el.data = data(2); await frame()
      poke(root); await frame()
      if (!root.querySelector('.tc-tooltip[data-visible]') && !root.querySelector('.tc-hover-layer *')) issues.push(tag + ': no hover after a move')
      el.remove(); await frame()
      if (tag === 'tabler-chart' && el.querySelector('svg')) issues.push(tag + ': svg left after removal')
      // Back later: it draws again.
      a.append(el); await frame()
      if (root.querySelectorAll('svg.tc-chart').length !== 1) issues.push(tag + ': not drawn when added back')
      el.remove()
    }
  `,
  'React StrictMode mounts one chart, and unmounts it clean': `
    const el = host()
    const root = ReactDOM.createRoot(el)
    const render = (k) => flushSync(() => root.render(React.createElement(React.StrictMode, null, React.createElement(tcReact.BarChart, { data: data(k), locale: 'en-US' }))))
    render(1); await frame(); render(2); await frame()
    const container = el.firstElementChild
    if (el.querySelectorAll('svg.tc-chart').length !== 1) issues.push(el.querySelectorAll('svg.tc-chart').length + ' svgs')
    if (el.querySelectorAll('.tc-legend').length !== 1) issues.push(el.querySelectorAll('.tc-legend').length + ' legends')
    poke(el); await frame()
    if (!el.querySelector('.tc-tooltip[data-visible]')) issues.push('no tooltip on hover')
    const bars = [...el.querySelectorAll('.tc-bar')].map((b) => b.getAttribute('d')).join()
    render(1); await frame()
    if ([...el.querySelectorAll('.tc-bar')].map((b) => b.getAttribute('d')).join() === bars) issues.push('new props not drawn')
    flushSync(() => root.unmount())
    if (el.innerHTML !== '') issues.push('left after unmount: ' + el.innerHTML.slice(0, 80))
  `,
  'Vue KeepAlive keeps the chart while it is away, and unmount destroys it': `
    const el = host()
    const show = Vue.ref(true)
    const values = Vue.shallowRef(data(1))
    const Other = { render: () => Vue.h('p', 'other') }
    const app = Vue.createApp({ render: () => Vue.h(Vue.KeepAlive, null, [show.value ? Vue.h(tcVue.BarChart, { data: values.value, locale: 'en-US', key: 'chart' }) : Vue.h(Other, { key: 'other' })]) })
    app.mount(el); await frame()
    const svg = el.querySelector('svg.tc-chart')
    show.value = false; await Vue.nextTick(); await frame()
    if (el.querySelector('svg.tc-chart')) issues.push('chart still shown while away')
    show.value = true; await Vue.nextTick(); await frame()
    if (el.querySelector('svg.tc-chart') !== svg) issues.push('chart recreated after coming back')
    // It still follows its container.
    el.style.width = '300px'; await frame(); await frame()
    if (Math.abs(el.querySelector('svg.tc-chart').getBoundingClientRect().width - 300) > 1) issues.push('does not follow the container after coming back')
    values.value = data(3); await Vue.nextTick(); await frame()
    poke(el); await frame()
    if (!el.querySelector('.tc-tooltip[data-visible]')) issues.push('no tooltip after coming back')
    if (el.querySelectorAll('svg.tc-chart').length !== 1) issues.push('svgs doubled')
    app.unmount()
    if (el.innerHTML !== '') issues.push('left after unmount: ' + el.innerHTML.slice(0, 80))
  `,
  'the data API run twice, and after dispose, keeps one chart': `
    const el = host()
    el.dataset.tcChart = 'bar'; el.dataset.tcData = JSON.stringify(data(1))
    tcBootstrap.init(el.parentElement); tcBootstrap.init(el.parentElement); await frame()
    if (el.querySelectorAll('svg.tc-chart').length !== 1) issues.push(el.querySelectorAll('svg.tc-chart').length + ' svgs after init twice')
    tcBootstrap.dispose(el)
    if (el.querySelector('svg')) issues.push('svg left after dispose')
    tcBootstrap.init(el.parentElement); await frame()
    if (el.querySelectorAll('svg.tc-chart').length !== 1) issues.push('not drawn again after dispose')
    tcBootstrap.dispose(el)
  `,
  'destroy from inside an event handler': `
    const el = host()
    const chart = new tc.Chart(el, { type: tc.bar, data: data(1), locale: 'en-US' })
    chart.on('hover', () => chart.destroy())
    await frame(); poke(el); await frame(); await frame()
    if (el.innerHTML !== '') issues.push('left: ' + el.innerHTML.slice(0, 80))
  `,
  'unmounting right after a render, with a frame pending': `
    const el = host()
    const root = ReactDOM.createRoot(el)
    flushSync(() => root.render(React.createElement(tcReact.LineChart, { data: data(1), locale: 'en-US' })))
    flushSync(() => root.render(React.createElement(tcReact.LineChart, { data: data(2), locale: 'en-US' })))
    flushSync(() => root.unmount())
    await frame(); await frame()
    if (el.innerHTML !== '') issues.push('left: ' + el.innerHTML.slice(0, 80))
    const vel = host()
    const app = Vue.createApp({ render: () => Vue.h(tcVue.LineChart, { data: data(1), locale: 'en-US' }) })
    app.mount(vel); app.unmount()
    await frame(); await frame()
    if (vel.innerHTML !== '') issues.push('vue left: ' + vel.innerHTML.slice(0, 80))
  `,
  'an element given data and attributes before it is added': `
    const el = document.createElement('tabler-chart')
    el.data = data(1); el.setAttribute('type', 'bar'); el.setAttribute('legend', 'bottom')
    el.data = data(2)
    await frame()
    if (el.querySelector('svg')) issues.push('drew while detached')
    host().append(el); await frame()
    if (el.querySelectorAll('svg.tc-chart').length !== 1) issues.push('not drawn once added')
    if (el.querySelector('.tc-legend')?.dataset.position !== 'bottom') issues.push('legend attribute not applied')
    el.remove()
  `,
  'a container taken out without destroy is let go, and resize() brings it back': `
    const el = host()
    const chart = new tc.Chart(el, { type: tc.line, data: data(1), locale: 'en-US' })
    await frame()
    el.remove(); await frame(); await frame()
    document.body.append(el); chart.resize(); await frame()
    el.style.width = '250px'; await frame(); await frame()
    const width = el.querySelector('svg.tc-chart').getBoundingClientRect().width
    if (Math.abs(width - 250) > 1) issues.push('drawn ' + Math.round(width) + ' px wide after coming back, not 250')
    chart.destroy()
  `,
  'a chart built before its container is in the page sizes once added': `
    const el = document.createElement('div'); el.style.width = '320px'
    const chart = new tc.Chart(el, { type: tc.bar, data: data(1), locale: 'en-US' })
    await frame(); await frame()
    document.body.append(el); await frame(); await frame()
    const width = el.querySelector('svg.tc-chart').getBoundingClientRect().width
    if (Math.abs(width - 320) > 1) issues.push('drawn ' + Math.round(width) + ' px wide, not 320')
    chart.destroy()
  `,
  'a chart mounted hidden draws at its size once shown': `
    const el = host(); el.style.display = 'none'
    const chart = new tc.Chart(el, { type: tc.line, data: data(1), locale: 'en-US' })
    await frame()
    el.style.display = ''
    await frame(); await frame()
    const svg = el.querySelector('svg.tc-chart')
    const width = svg?.getBoundingClientRect().width ?? 0
    if (Math.abs(width - 400) > 1) issues.push('drawn ' + Math.round(width) + ' px wide, not 400')
    chart.destroy()
  `,
}

test.describe('lifecycle', () => {
  for (const [name, body] of Object.entries(CASES)) {
    test(name, async ({ page }) => {
      const errors = await open(page)
      const issues = await page.evaluate(async (body) => {
        const w = window as unknown as Win
        const run = new Function(
          'w',
          `const { tc, tcBootstrap, tcReact, tcVue, React, ReactDOM, flushSync, Vue } = w
          const issues = []
          const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
          const data = (k) => ({ labels: ['Mon', 'Tue', 'Wed'], series: [{ name: 'North', values: [3 * k, 5, 4] }, { name: 'South', values: [2, 3 * k, 5] }] })
          const host = () => { const el = document.createElement('div'); el.style.width = '400px'; document.body.append(el); return el }
          const poke = (root) => {
            const svg = root.querySelector('svg.tc-chart')
            if (!svg) return
            const box = svg.getBoundingClientRect()
            svg.dispatchEvent(new PointerEvent('pointermove', { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2, bubbles: true, pointerType: 'mouse' }))
          }
          return (async () => { ${body}; return issues })()`,
        )
        return (await run(w)) as string[]
      }, body)
      const report = [...errors, ...issues]
      expect(report, report.join('\n')).toEqual([])
    })
  }
})
