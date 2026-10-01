import type { LineOptions, Series } from '@tabler/charts'
import { getChart, init } from '@tabler/charts-bootstrap'
import bootstrapCss from 'bootstrap/dist/css/bootstrap.min.css?raw'
import mappingCss from '../../../../packages/bootstrap/scss/_charts.scss?inline'
import chartsCss from '../../../../packages/core/src/style.css?raw'
import { type Demo, fitFrame } from '../demo.ts'

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
    <h6 class="card-title">Revenue</h6>
    <div id="line" data-tc-chart="line" data-tc-aspect-ratio="2.4" data-tc-locale="en-US" data-tc-points="last">
      <script type="application/json">${JSON.stringify({ labels: MONTHS, series: series() })}</script>
    </div></div></div></div>
  <div class="col-4"><div class="card"><div class="card-body">
    <h6 class="card-title">Sources</h6>
    <div id="donut" data-tc-chart="donut" data-tc-aspect-ratio="1" data-tc-legend="false"
      data-tc-data='[{"name":"Direct","value":42},{"name":"Search","value":31},{"name":"Social","value":17}]'></div>
  </div></div></div>
</div></body></html>`

export const bootstrapDemo: Demo = {
  id: 'bootstrap',
  title: 'Bootstrap',
  description:
    '@tabler/charts-bootstrap maps the chart tokens to Bootstrap 5.3 variables: body font and colors, borders, radius, shadow, the first series on --bs-primary. data-bs-theme switches the charts with the page. Series 2–8 keep the validated palette (Bootstrap’s own yellow and pink fail the color-vision checks). The charts in this real Bootstrap page (an iframe) are declared with the data API: data-tc-chart, data-tc-* options and inline JSON or data-tc-src, started by init() or on their own by the CDN script.',
  mount(el, controls) {
    const frame = document.createElement('iframe')
    frame.title = 'Bootstrap page with charts'
    frame.style.cssText = 'width:100%;height:360px;border:0;border-radius:8px'
    frame.srcdoc = PAGE
    el.append(frame)

    // The data API: the charts are declared in the iframe's HTML.
    frame.addEventListener('load', () => {
      void init(frame.contentDocument as Document)
      fitFrame(frame)
    })

    // Controls are created now (the page drops an empty controls row after mount)
    // and reach into the iframe when used.
    const root = () => (frame.contentDocument as Document).documentElement
    controls.button('Shuffle data', () => {
      const line = frame.contentDocument?.getElementById('line')
      if (line) getChart<LineOptions>(line)?.setData({ labels: MONTHS, series: series() })
    })
    controls.select('data-bs-theme', ['light', 'dark'] as const, 'light', (theme) =>
      root().setAttribute('data-bs-theme', theme),
    )
    controls.color('--bs-primary', '#0d6efd', (color) =>
      root().style.setProperty('--bs-primary', color),
    )
  },
}
