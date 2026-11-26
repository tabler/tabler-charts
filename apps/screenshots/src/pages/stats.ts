import { Chart, type ChartConfig, sparkline } from '@tabler/charts'
import { C, definePage } from '../page.ts'

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const

// Yearly figures: 2000–2024, the S&P 500 from 2005, Bitcoin from 2013.
const TILES = [
  {
    name: 'Gold, USD/oz',
    value: '$2,386',
    change: 'up from $279 in 2000',
    color: C.amber,
    config: {
      variant: 'area',
      format: usd,
      data: [
        279, 271, 310, 363, 410, 445, 603, 695, 872, 972, 1225, 1572, 1669, 1411, 1266, 1160, 1251,
        1257, 1269, 1393, 1770, 1799, 1801, 1941, 2386,
      ],
    },
  },
  {
    name: 'Brent crude, USD/bbl',
    value: '$80.50',
    change: 'down from $111.60 in 2012',
    color: C.blue,
    config: {
      variant: 'line',
      markers: 'minmax',
      data: [
        28.5, 24.4, 25.0, 28.8, 38.3, 54.5, 65.1, 72.4, 97.3, 61.7, 79.5, 111.3, 111.6, 108.6, 99.0,
        52.4, 43.7, 54.2, 71.3, 64.3, 41.8, 70.9, 100.9, 82.5, 80.5,
      ],
    },
  },
  {
    name: 'S&P 500, yearly return',
    value: '+23.3%',
    change: 'up in 16 of the last 20 years',
    color: C.teal,
    config: {
      variant: 'bar',
      data: [
        3.0, 13.6, 3.5, -38.5, 23.5, 12.8, 0.0, 13.4, 29.6, 11.4, -0.7, 9.5, 19.4, -6.2, 28.9, 16.3,
        26.9, -19.4, 24.2, 23.3,
      ],
    },
  },
] as const

export default definePage({
  title: 'Markets at a glance',
  subtitle: 'Year-end figures, 2024',
  source: 'World Gold Council, US EIA, S&P Dow Jones Indices, 2000–2024',
  width: 800,
  render(body) {
    const tiles = document.createElement('div')
    tiles.className = 'tiles'
    for (const tile of TILES) {
      const box = document.createElement('div')
      box.className = 'tile'
      const label = document.createElement('div')
      label.className = 'tile-label'
      label.textContent = tile.name
      const value = document.createElement('div')
      value.className = 'tile-value'
      const change = document.createElement('div')
      change.className = 'tile-change'
      change.textContent = tile.change
      value.textContent = tile.value
      const host = document.createElement('div')
      host.style.setProperty('--tc-color-1', tile.color)
      box.append(label, value, change, host)
      tiles.append(box)
      const config = {
        type: sparkline,
        height: 48,
        locale: 'en-US',
        animate: false,
        title: tile.name,
        name: tile.name,
        ...tile.config,
      }
      new Chart(host, config as ChartConfig<object>)
    }
    body.append(tiles)
  },
})
