import type { LineOptions } from '@tabler/charts'
import { getChart, init } from '@tabler/charts-bootstrap'
import tablerCss from '@tabler/core/dist/css/tabler.min.css?raw'
import tablerThemesCss from '@tabler/core/dist/css/tabler-themes.min.css?raw'
import presetCss from '../../../../packages/bootstrap/scss/_tabler.scss?inline'
import chartsCss from '../../../../packages/core/src/style.css?raw'
import type { Demo } from '../demo.ts'

const DAYS = Array.from({ length: 14 }, (_, i) => `Sep ${i + 17}`)
const walk = (start: number) => {
  let v = start
  return DAYS.map(() => {
    v = Math.max(0, v + (Math.random() - 0.45) * start * 0.2)
    return Math.round(v)
  })
}
const data = () => ({
  labels: DAYS,
  series: [
    { name: 'Visitors', values: walk(1800) },
    { name: 'Sign-ups', values: walk(600), dash: 4, width: 1.5 },
  ],
})

const PRIMARIES = [
  'blue',
  'azure',
  'indigo',
  'purple',
  'pink',
  'red',
  'orange',
  'green',
  'teal',
] as const

// A real Tabler page in an iframe, so its CSS does not restyle the playground.
const PAGE = `<!doctype html><html lang="en" data-bs-theme="light"><head><meta charset="utf-8">
<style>${tablerCss}</style><style>${tablerThemesCss}</style><style>${chartsCss}</style><style>${presetCss}</style>
</head><body><div class="page-body" style="margin:16px"><div class="row row-cards">
  <div class="col-8"><div class="card"><div class="card-header"><h3 class="card-title">Traffic</h3></div>
    <div class="card-body">
      <div id="line" data-tc-chart="line" data-tc-aspect-ratio="2.6" data-tc-locale="en-US"
        data-tc-y='{"format":{"notation":"compact"}}'>
        <script type="application/json">${JSON.stringify(data())}</script>
      </div>
    </div></div></div>
  <div class="col-4"><div class="card"><div class="card-body">
    <div class="subheader">Onboarding</div>
    <div data-tc-chart="gauge" data-tc-aspect-ratio="1.2" data-tc-thickness="10"
      data-tc-data='{"name":"completed","value":58}'></div>
  </div></div></div>
</div></div></body></html>`

export const tablerDemo: Demo = {
  id: 'tabler',
  title: 'Tabler',
  description:
    'The Tabler preset (@tabler/charts-bootstrap/tabler.css, or scss/tabler): Tabler keeps data-bs-theme but prefixes its variables with tblr-, so charts sit on the card surface with Tabler’s muted gray, borders, radius, shadow and font, and the first series follows data-bs-theme-primary. Real @tabler/core in an iframe, charts declared with the data API.',
  mount(el, controls) {
    const frame = document.createElement('iframe')
    frame.title = 'Tabler page with charts'
    frame.style.cssText = 'width:100%;height:360px;border:0;border-radius:8px'
    frame.srcdoc = PAGE
    el.append(frame)
    frame.addEventListener('load', () => void init(frame.contentDocument as Document))

    // Controls are created now (the page drops an empty controls row after mount).
    const root = () => (frame.contentDocument as Document).documentElement
    controls.button('Shuffle data', () => {
      const line = frame.contentDocument?.getElementById('line')
      if (line) getChart<LineOptions>(line)?.setData(data())
    })
    controls.select('data-bs-theme', ['light', 'dark'] as const, 'light', (theme) =>
      root().setAttribute('data-bs-theme', theme),
    )
    controls.select('data-bs-theme-primary', PRIMARIES, 'blue', (primary) =>
      root().setAttribute('data-bs-theme-primary', primary),
    )
  },
}
