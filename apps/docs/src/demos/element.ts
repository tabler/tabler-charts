import { type ChartElement, defineChartElement } from '@tabler/charts-elements'
import { shadow } from '@tabler/charts-elements/shadow'
import type { Demo } from '../demo.ts'

defineChartElement()
defineChartElement({ tag: 'tabler-chart-shadow', shadow })

// Shadow charts are styled from outside through ::part() and tokens on the element.
const PART_STYLES = `tabler-chart-shadow::part(root) {
  padding: 12px;
  border-radius: 8px;
  background: var(--code-bg);
}
tabler-chart-shadow { --tc-color-1: #2fb344; --tc-color-2: #f59f00; }`

const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const randomData = () => ({
  labels: LABELS,
  series: [
    { name: 'Visitors', values: LABELS.map(() => Math.round(200 + Math.random() * 600)) },
    { name: 'Sign-ups', values: LABELS.map(() => Math.round(50 + Math.random() * 200)) },
  ],
})

const MARKUP = `<tabler-chart type="bar" label="Visitors this week" aspect-ratio="2.5" options='{"stacked": true}'>
  <script type="application/json">
    { "labels": ["Mon", "Tue", …], "series": [{ "name": "Visitors", "values": [412, 530, …] }, …] }
  </script>
</tabler-chart>`

export const elementDemo: Demo = {
  id: 'element',
  title: 'Web Component',
  description:
    '<tabler-chart> from @tabler/charts-elements: the type and common options as attributes, type-specific ones in options, data inline as JSON or through the data property. Light DOM by default, so the page CSS and --tc-* tokens apply as usual; with shadow from /shadow it renders into a shadow root styled through ::part() and tokens on the element. Chart events arrive as tc-hover, tc-click, tc-legend-toggle and tc-render; the CDN script (dist/tabler-charts.min.js) registers the element and injects the styles on its own.',
  mount(el, controls) {
    const code = document.createElement('pre')
    const inner = document.createElement('code')
    inner.textContent = MARKUP
    code.append(inner)
    code.style.overflowX = 'auto'

    const host = document.createElement('div')
    host.innerHTML = `<tabler-chart type="bar" label="Visitors this week" aspect-ratio="2.5" locale="en-US" options='{"stacked": true}'><script type="application/json">${JSON.stringify(randomData())}</script></tabler-chart>`
    const shadowCode = document.createElement('pre')
    const shadowInner = document.createElement('code')
    shadowInner.textContent = `import { shadow } from '@tabler/charts-elements/shadow'
defineChartElement({ tag: 'tabler-chart-shadow', shadow })

${PART_STYLES}`
    shadowCode.append(shadowInner)
    shadowCode.style.overflowX = 'auto'
    // A constructable stylesheet, which the CSP check of the playground allows.
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(PART_STYLES)
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
    const shadowHost = document.createElement('div')
    shadowHost.innerHTML = `<tabler-chart-shadow type="line" label="Visitors, shadow DOM" aspect-ratio="3" locale="en-US" options='{"points":"last"}'><script type="application/json">${JSON.stringify(randomData())}</script></tabler-chart-shadow>`
    el.append(code, host, shadowCode, shadowHost)
    const chart = host.firstElementChild as ChartElement
    const shadowChart = shadowHost.firstElementChild as ChartElement

    const clicked = controls.output('tc-click')
    chart.addEventListener('tc-click', (event) => {
      const { hit } = (event as CustomEvent).detail
      clicked(String(hit.title))
    })

    controls.button('Shuffle data', () => {
      chart.data = randomData()
      shadowChart.data = randomData()
    })
    controls.select('shadow data-theme', ['auto', 'light', 'dark'] as const, 'auto', (theme) => {
      if (theme === 'auto') shadowChart.removeAttribute('data-theme')
      else shadowChart.setAttribute('data-theme', theme)
    })
    controls.select('type', ['bar', 'line', 'area'] as const, 'bar', (type) =>
      chart.setAttribute('type', type),
    )
    controls.select('legend', ['top', 'bottom', 'false'] as const, 'top', (legend) =>
      chart.setAttribute('legend', legend),
    )
  },
}
