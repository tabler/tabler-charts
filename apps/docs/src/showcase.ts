/**
 * Examples: about a hundred charts of real-world data, grouped by domain.
 * Every card names its source; the numbers are rounded from public datasets.
 */
import '@tabler/charts/style.css'
import './site.css'
import { Chart, type ChartConfig, sparkline } from '@tabler/charts'
import { business } from './showcase/business.ts'
import { climate } from './showcase/climate.ts'
import { culture } from './showcase/culture.ts'
import { economy } from './showcase/economy.ts'
import { energy } from './showcase/energy.ts'
import { health } from './showcase/health.ts'
import { politics } from './showcase/politics.ts'
import { science } from './showcase/science.ts'
import { society } from './showcase/society.ts'
import { sports } from './showcase/sports.ts'
import { technology } from './showcase/technology.ts'
import { transport } from './showcase/transport.ts'
import type { Group } from './showcase/types.ts'
import { setupThemeSwitch } from './theme.ts'

export const GROUPS: Group[] = [
  economy,
  business,
  climate,
  energy,
  society,
  health,
  technology,
  sports,
  science,
  politics,
  transport,
  culture,
]

setupThemeSwitch()
for (const link of document.querySelectorAll('.site-nav a')) {
  if (link.getAttribute('href') === '/examples.html') link.setAttribute('aria-current', 'page')
}

const root = document.getElementById('examples') as HTMLElement
const jump = document.getElementById('example-groups') as HTMLElement
const total = GROUPS.reduce(
  (n, group) =>
    n + group.items.reduce((m, item) => m + (item.kind === 'tiles' ? item.tiles.length : 1), 0),
  0,
)
const count = document.getElementById('example-count')
if (count) count.textContent = String(total)

let index = 0
for (const group of GROUPS) {
  const link = document.createElement('a')
  link.href = `#${group.id}`
  link.textContent = group.name
  jump.append(link)

  const heading = document.createElement('h2')
  heading.className = 'case-group'
  heading.id = group.id
  heading.textContent = group.name
  const note = document.createElement('p')
  note.className = 'group-note'
  note.textContent = group.description
  const grid = document.createElement('div')
  grid.className = 'gallery'
  root.append(heading, note, grid)

  for (const item of group.items) {
    const card = document.createElement('figure')
    const wide = item.kind === 'tiles' || item.span === 2
    card.className = `gallery-item${wide ? ' gallery-wide' : ''}`
    card.dataset.example = String(index++)
    card.dataset.title = item.title
    const caption = document.createElement('figcaption')
    const strong = document.createElement('strong')
    strong.textContent = item.title
    const source = document.createElement('small')
    source.className = 'example-source'
    source.textContent = `Source: ${item.source}`
    caption.append(strong, ` ${item.note}`, source)
    card.append(caption)
    grid.append(card)

    if (item.kind === 'tiles') {
      const tiles = document.createElement('div')
      tiles.className = 'tiles'
      for (const tile of item.tiles) {
        const box = document.createElement('div')
        box.className = 'tile'
        const label = document.createElement('div')
        label.className = 'tile-label'
        label.textContent = tile.name
        const value = document.createElement('div')
        value.className = 'tile-value'
        value.textContent = tile.value
        const host = document.createElement('div')
        box.append(label, value, host)
        tiles.append(box)
        new Chart(host, {
          type: sparkline,
          height: 36,
          locale: 'en-US',
          title: tile.name,
          name: tile.name,
          ...tile.config,
        } as ChartConfig<object>)
      }
      card.append(tiles)
      continue
    }

    const host = document.createElement('div')
    for (const [prop, value] of Object.entries(item.style ?? {}))
      host.style.setProperty(prop, value)
    card.append(host)
    try {
      new Chart(host, { title: item.title, ...item.config } as ChartConfig<object>)
    } catch (error) {
      // A thrown error is a finding too: show it on the card.
      const box = document.createElement('pre')
      box.className = 'case-error'
      box.textContent = String((error as Error).stack ?? error)
      host.replaceChildren(box)
      card.dataset.error = String((error as Error).message ?? error)
    }
  }
}
