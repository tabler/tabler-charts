import '@tabler/charts/style.css'
import './site.css'
import { createControls, type Demo } from './demo.ts'
import { areaDemo } from './demos/area.ts'
import { barDemo } from './demos/bar.ts'
import { bootstrapDemo } from './demos/bootstrap.ts'
import { candlestickDemo } from './demos/candlestick.ts'
import { customType } from './demos/custom-type.ts'
import { decimateDemo } from './demos/decimate.ts'
import { elementDemo } from './demos/element.ts'
import { exportDemo } from './demos/export.ts'
import { galleryDemo } from './demos/gallery.ts'
import { gaugeDemo } from './demos/gauge.ts'
import { heatmapDemo } from './demos/heatmap.ts'
import { lineDemo } from './demos/line.ts'
import { numberFormatDemo } from './demos/number-format.ts'
import { parliamentDemo } from './demos/parliament.ts'
import { patternsDemo } from './demos/patterns.ts'
import { pieDemo } from './demos/pie.ts'
import { radarDemo } from './demos/radar.ts'
import { reactDemo } from './demos/react.tsx'
import { sankeyDemo } from './demos/sankey.ts'
import { scatterDemo } from './demos/scatter.ts'
import { sparklineDemo } from './demos/sparkline.ts'
import { syncDemo } from './demos/sync.ts'
import { tablerDemo } from './demos/tabler.ts'
import { timeDemo } from './demos/time.ts'
import { valueLabelsDemo } from './demos/value-labels.ts'
import { vueDemo } from './demos/vue.ts'
import { setupThemeSwitch } from './theme.ts'

const demos: Demo[] = [
  sparklineDemo,
  lineDemo,
  timeDemo,
  decimateDemo,
  areaDemo,
  barDemo,
  pieDemo,
  gaugeDemo,
  parliamentDemo,
  radarDemo,
  sankeyDemo,
  heatmapDemo,
  candlestickDemo,
  scatterDemo,
  patternsDemo,
  valueLabelsDemo,
  numberFormatDemo,
  syncDemo,
  exportDemo,
  customType,
  elementDemo,
  reactDemo,
  vueDemo,
  bootstrapDemo,
  tablerDemo,
  galleryDemo,
]

setupThemeSwitch()
document.querySelector('.site-nav a[href="/"]')?.setAttribute('aria-current', 'page')

// -- Demos ----------------------------------------------------------------------

const container = document.getElementById('demos') as HTMLElement

/** Usage examples by demo id: src/examples/<id>.ts or .html, type-checked with the app. */
const examples = new Map(
  Object.entries(
    import.meta.glob<string>('./examples/*.{ts,html}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  ).map(([path, code]) => [path.replace(/^.*\/|\.\w+$/g, ''), code.trim()]),
)

/** A folded "Usage" block with the example's code and a copy button. */
function usage(code: string): HTMLElement {
  const details = document.createElement('details')
  details.className = 'demo-code'
  const summary = document.createElement('summary')
  summary.textContent = 'Usage'
  const copy = document.createElement('button')
  copy.type = 'button'
  copy.className = 'demo-copy'
  copy.textContent = 'Copy'
  copy.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(code)
    copy.textContent = 'Copied'
    setTimeout(() => {
      copy.textContent = 'Copy'
    }, 1500)
  })
  const pre = document.createElement('pre')
  const text = document.createElement('code')
  text.textContent = code
  pre.append(text)
  details.append(summary, copy, pre)
  return details
}

for (const demo of demos) {
  const card = document.createElement('section')
  card.className = 'demo'
  card.id = demo.id

  const title = document.createElement('h2')
  title.textContent = demo.title
  const description = document.createElement('p')
  description.textContent = demo.description
  const chart = document.createElement('div')
  chart.className = 'demo-chart'
  const controls = document.createElement('div')
  controls.className = 'demo-controls'

  card.append(title, description, chart, controls)
  const example = examples.get(demo.id)
  if (example) card.append(usage(example))
  container.append(card)
  // A test hook: visual tests seed the random data of each demo by its id.
  ;(window as { __tcSeed?: (id: string) => void }).__tcSeed?.(demo.id)
  demo.mount(chart, createControls(controls))
  if (!controls.childElementCount) controls.remove()
}
