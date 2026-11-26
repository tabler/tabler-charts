import { sparkline } from '@tabler/charts'
import { economy } from '../../../docs/src/showcase/economy.ts'
import { chart, el } from '../dom.ts'
import { C, definePage } from '../page.ts'

// The series of the playground's "Markets at a glance" tiles, as table rows.
const markets = economy.items.find((item) => item.kind === 'tiles')
if (markets?.kind !== 'tiles') throw new Error('No tiles example in the "economy" group')

const COLORS = [C.teal, C.amber, C.blue, C.coral, C.violet]

export default definePage({
  title: 'Markets at a glance',
  subtitle: 'A sparkline in every row of a table',
  source: 'World Gold Council, US EIA, S&P Dow Jones Indices, CoinMarketCap, ECB, 2000–2024',
  width: 680,
  render(body) {
    const table = el('table', 'table')
    const head = el('tr')
    head.append(el('th', '', 'Market'), el('th', '', 'Period'), el('th', 'numeric', 'Latest'))
    head.append(el('th', '', 'Trend'))
    table.append(head)

    markets.tiles.forEach((tile, index) => {
      const labels = (tile.config.labels ?? []) as (string | number)[]
      const row = el('tr')
      const name = el('td')
      name.append(el('strong', '', tile.name))
      const latest = el('td', 'numeric')
      latest.append(el('strong', '', tile.value))
      const trend = el('td')
      row.append(name, el('td', 'muted', `${labels[0]}–${labels.at(-1)}`), latest, trend)
      table.append(row)
      chart(
        trend,
        { type: sparkline, height: 32, title: tile.name, name: tile.name, ...tile.config },
        { '--tc-color-1': COLORS[index % COLORS.length] as string },
      )
    })
    body.append(table)
  },
})
