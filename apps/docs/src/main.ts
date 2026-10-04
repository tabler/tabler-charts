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
import { patternsDemo } from './demos/patterns.ts'
import { pieDemo } from './demos/pie.ts'
import { radarDemo } from './demos/radar.ts'
import { reactDemo } from './demos/react.tsx'
import { scatterDemo } from './demos/scatter.ts'
import { sparklineDemo } from './demos/sparkline.ts'
import { tablerDemo } from './demos/tabler.ts'
import { timeDemo } from './demos/time.ts'
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
  radarDemo,
  heatmapDemo,
  candlestickDemo,
  scatterDemo,
  patternsDemo,
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
  container.append(card)
  // A test hook: visual tests seed the random data of each demo by its id.
  ;(window as { __tcSeed?: (id: string) => void }).__tcSeed?.(demo.id)
  demo.mount(chart, createControls(controls))
  if (!controls.childElementCount) controls.remove()
}
