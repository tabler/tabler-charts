import { sparkline } from '@tabler/charts'
import { sports } from '../../../docs/src/showcase/sports.ts'
import { chart, el } from '../dom.ts'
import { C, definePage } from '../page.ts'

// The playground's win, draw and loss tiles as the rows of a table.
const results = sports.items.find(
  (item) => item.kind === 'tiles' && item.tiles.some((tile) => tile.config.variant === 'tristate'),
)
if (results?.kind !== 'tiles') throw new Error('No tristate tiles in the "sports" group')

export default definePage({
  title: 'Wins, draws and losses',
  subtitle: 'A bar up for a win, down for a loss, a mark for a draw',
  source: 'FIDE, UEFA, WTA, 2018–2024',
  width: 680,
  render(body) {
    const table = el('table', 'table')
    const head = el('tr')
    head.append(el('th', '', 'Series'), el('th', 'numeric', 'Result'), el('th', '', 'Game by game'))
    table.append(head)

    for (const tile of results.tiles) {
      const row = el('tr')
      const name = el('td')
      name.append(el('strong', '', tile.name))
      const trend = el('td')
      row.append(name, el('td', 'numeric muted', tile.value), trend)
      table.append(row)
      chart(
        trend,
        { type: sparkline, height: 32, title: tile.name, name: tile.name, ...tile.config },
        { '--tc-color-1': C.teal, '--tc-negative-color': C.coral },
      )
    }
    body.append(table)
  },
})
