import { type ChartElement, defineChartElement } from '@tabler/charts-elements'
import type { Demo } from '../demo.ts'

defineChartElement()

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
    '<tabler-chart> from @tabler/charts-elements: the type and common options as attributes, type-specific ones in options, data inline as JSON or through the data property. Light DOM, so the page CSS and --tc-* tokens apply as usual; chart events arrive as tc-hover, tc-click, tc-legend-toggle and tc-render.',
  mount(el, controls) {
    const code = document.createElement('pre')
    const inner = document.createElement('code')
    inner.textContent = MARKUP
    code.append(inner)
    code.style.overflowX = 'auto'

    const host = document.createElement('div')
    host.innerHTML = `<tabler-chart type="bar" label="Visitors this week" aspect-ratio="2.5" locale="en-US" options='{"stacked": true}'><script type="application/json">${JSON.stringify(randomData())}</script></tabler-chart>`
    el.append(code, host)
    const chart = host.firstElementChild as ChartElement

    const clicked = controls.output('tc-click')
    chart.addEventListener('tc-click', (event) => {
      const { hit } = (event as CustomEvent).detail
      clicked(String(hit.title))
    })

    controls.button('Shuffle data', () => {
      chart.data = randomData()
    })
    controls.select('type', ['bar', 'line', 'area'] as const, 'bar', (type) =>
      chart.setAttribute('type', type),
    )
    controls.select('legend', ['top', 'bottom', 'false'] as const, 'top', (legend) =>
      chart.setAttribute('legend', legend),
    )
  },
}
