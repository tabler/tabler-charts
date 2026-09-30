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
import { galleryDemo } from './demos/gallery.ts'
import { gaugeDemo } from './demos/gauge.ts'
import { heatmapDemo } from './demos/heatmap.ts'
import { lineDemo } from './demos/line.ts'
import { pieDemo } from './demos/pie.ts'
import { reactDemo } from './demos/react.tsx'
import { scatterDemo } from './demos/scatter.ts'
import { sparklineDemo } from './demos/sparkline.ts'
import { tablerDemo } from './demos/tabler.ts'
import { timeDemo } from './demos/time.ts'
import { vueDemo } from './demos/vue.ts'

const demos: Demo[] = [
  sparklineDemo,
  lineDemo,
  timeDemo,
  decimateDemo,
  areaDemo,
  barDemo,
  pieDemo,
  gaugeDemo,
  heatmapDemo,
  candlestickDemo,
  scatterDemo,
  customType,
  elementDemo,
  reactDemo,
  vueDemo,
  bootstrapDemo,
  tablerDemo,
  galleryDemo,
]

// -- Theme switch -------------------------------------------------------------

type Theme = 'auto' | 'light' | 'dark'
const THEME_KEY = 'tc-docs-theme'

function readTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : 'auto'
  } catch {
    return 'auto'
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {}
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]')) {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme))
  }
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]')) {
  button.addEventListener('click', () => applyTheme(button.dataset.themeChoice as Theme))
}
applyTheme(readTheme())

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
  demo.mount(chart, createControls(controls))
  if (!controls.childElementCount) controls.remove()
}
