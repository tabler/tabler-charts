/**
 * A screenshot page: `/shot.html?page=<name>&theme=dark` puts the chart of
 * `pages/<name>.ts` on a card in a fixed 1024×768 frame. The capture script
 * waits for `data-screenshot-ready` on the root element.
 */
import '@tabler/charts/style.css'
import './frame.css'
import { Chart, type ChartConfig } from '@tabler/charts'
import logoLight from '../../../docs/images/logo.svg'
import logoDark from '../../../docs/images/logo-white.svg'
import type { ScreenshotPage } from './page.ts'

const pages = import.meta.glob<{ default: ScreenshotPage }>('./pages/*.ts')
const params = new URLSearchParams(location.search)
const name = params.get('page') ?? ''
const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'

const element = (id: string) => document.getElementById(id) as HTMLElement
const card = element('card')
const body = element('body')

for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-theme-link]')) {
  const choice = link.dataset.themeLink as string
  link.href = `?page=${encodeURIComponent(name)}&theme=${choice}`
  if (choice === theme) link.setAttribute('aria-current', 'true')
}

function fail(message: string): void {
  const box = document.createElement('pre')
  box.className = 'screenshot-error'
  box.textContent = message
  body.replaceChildren(box)
  // The capture script reads this and stops instead of saving a broken picture.
  document.documentElement.dataset.screenshotError = message
}

/**
 * Where the page wants the chart hovered, in viewport pixels, with a drawn
 * pointer on it: a screenshot has no mouse cursor of its own. The capture
 * script reads the point and moves the real mouse there, which opens the tooltip.
 */
function placePointer(hover: { x: number; y: number }): void {
  const chart = body.querySelector('svg.tc-chart')
  if (!chart) return
  const box = chart.getBoundingClientRect()
  const x = Math.round(box.left + box.width * hover.x)
  const y = Math.round(box.top + box.height * hover.y)
  const frame = element('screenshot').getBoundingClientRect()
  const pointer = document.createElement('div')
  pointer.className = 'screenshot-pointer'
  pointer.style.left = `${x - frame.left}px`
  pointer.style.top = `${y - frame.top}px`
  element('screenshot').append(pointer)
  document.documentElement.dataset.screenshotHover = `${x},${y}`
}

async function mount(): Promise<ScreenshotPage | undefined> {
  const load = pages[`./pages/${name}.ts`]
  if (!load) {
    fail(`No page named "${name}" in src/pages.`)
    return undefined
  }
  const page = (await load()).default

  document.title = `${page.title} - Tabler Charts screenshots`
  element('title').textContent = page.title
  element('subtitle').textContent = page.subtitle ?? ''
  element('source').textContent = page.source ? `Source: ${page.source}` : ''
  if (page.width) card.style.width = `${page.width}px`

  if (page.logo !== false) {
    const logo = document.createElement('img')
    logo.src = theme === 'dark' ? logoDark : logoLight
    logo.alt = 'Tabler Charts'
    element('logo').append(logo)
    await logo.decode().catch(() => {})
  }

  if (page.render) page.render(body)
  else if (page.config) {
    const host = document.createElement('div')
    for (const [prop, value] of Object.entries(page.style ?? {}))
      host.style.setProperty(prop, value)
    body.append(host)
    // A picture shows the finished chart, not a frame of its entrance.
    new Chart(host, {
      title: page.title,
      locale: 'en-US',
      animate: false,
      ...page.config,
    } as ChartConfig<object>)
  }
  return page
}

const frames = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))

mount()
  .catch((error) => {
    fail(String((error as Error).stack ?? error))
    return undefined
  })
  // Fonts change label widths, and the resize observers lay the chart out again.
  .then(async (page) => {
    await document.fonts.ready
    await frames()
    if (page?.hover) placePointer(page.hover)
  })
  .then(() => {
    document.documentElement.dataset.screenshotReady = 'true'
  })
