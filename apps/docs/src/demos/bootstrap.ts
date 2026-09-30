import { Chart, donut, line, type Series } from '@tabler/charts'
import bootstrapCss from 'bootstrap/dist/css/bootstrap.min.css?raw'
import mappingCss from '../../../../packages/bootstrap/scss/_charts.scss?inline'
import chartsCss from '../../../../packages/core/src/style.css?raw'
import type { Demo } from '../demo.ts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const series = (): Series[] => [
  { name: 'Revenue', values: MONTHS.map(() => Math.round(20 + Math.random() * 60)) },
  { name: 'Costs', values: MONTHS.map(() => Math.round(10 + Math.random() * 40)) },
  { name: 'Profit', values: MONTHS.map(() => Math.round(5 + Math.random() * 30)) },
]

// A real Bootstrap 5.3 page in an iframe, so its CSS does not restyle the playground.
const PAGE = `<!doctype html><html lang="en" data-bs-theme="light"><head><meta charset="utf-8">
<style>${bootstrapCss}</style><style>${chartsCss}</style><style>${mappingCss}</style>
<style>body{padding:16px}</style></head><body>
<div class="row g-3">
  <div class="col-8"><div class="card"><div class="card-body">
    <h6 class="card-title">Revenue</h6><div id="line"></div></div></div></div>
  <div class="col-4"><div class="card"><div class="card-body">
    <h6 class="card-title">Sources</h6><div id="donut"></div></div></div></div>
</div></body></html>`

export const bootstrapDemo: Demo = {
  id: 'bootstrap',
  title: 'Bootstrap',
  description:
    '@tabler/charts-bootstrap maps the chart tokens to Bootstrap 5.3 variables: body font and colors, borders, radius, shadow, the first series on --bs-primary. data-bs-theme switches the charts with the page. Series 2–8 keep the validated palette (Bootstrap’s own yellow and pink fail the color-vision checks). This is real Bootstrap in an iframe.',
  mount(el, controls) {
    const frame = document.createElement('iframe')
    frame.title = 'Bootstrap page with charts'
    frame.style.cssText = 'width:100%;height:340px;border:0;border-radius:8px'
    frame.srcdoc = PAGE
    el.append(frame)

    frame.addEventListener('load', () => {
      const doc = frame.contentDocument as Document
      const at = (id: string) => doc.getElementById(id) as HTMLElement
      const lineChart = new Chart(at('line'), {
        type: line,
        data: { labels: MONTHS, series: series() },
        aspectRatio: 2.4,
        locale: 'en-US',
        points: 'last',
      })
      new Chart(at('donut'), {
        type: donut,
        data: [
          { name: 'Direct', value: 42 },
          { name: 'Search', value: 31 },
          { name: 'Social', value: 17 },
        ],
        aspectRatio: 1,
        locale: 'en-US',
        legend: false,
      })

      controls.button('Shuffle data', () => lineChart.setData({ labels: MONTHS, series: series() }))
      controls.select('data-bs-theme', ['light', 'dark'] as const, 'light', (theme) =>
        doc.documentElement.setAttribute('data-bs-theme', theme),
      )
      controls.color('--bs-primary', '#0d6efd', (color) =>
        doc.documentElement.style.setProperty('--bs-primary', color),
      )
    })
  },
}
