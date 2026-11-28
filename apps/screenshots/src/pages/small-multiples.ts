import { area } from '@tabler/charts'
import { chart, el } from '../dom.ts'
import { C, definePage } from '../page.ts'
import { seeded } from '../random.ts'

// Six markets of a made-up app, each in its own small chart on the same
// scale: the shapes compare at a glance, and no line hides another.
const MARKETS: [name: string, start: number, growth: number, color: string][] = [
  ['Germany', 41, 0.9, C.blue],
  ['France', 33, 0.55, C.blue],
  ['Poland', 12, 2.6, C.teal],
  ['Spain', 27, 0.2, C.blue],
  ['Italy', 30, -0.25, C.coral],
  ['Netherlands', 16, 1.3, C.blue],
]
const WEEKS = Array.from({ length: 26 }, (_, week) => Date.UTC(2026, 0, 5 + week * 7))
const random = seeded(29)

export default definePage({
  title: 'Weekly active users by market',
  subtitle: 'Thousands of users, January to June 2026, one scale for all six',
  width: 820,
  render(body) {
    const grid = el('div', 'tiles')
    grid.style.setProperty('--columns', '3')
    for (const [name, start, growth, color] of MARKETS) {
      const values = WEEKS.map(
        (_, week) =>
          Math.round((start * (1 + (growth * week) / 25) + (random() - 0.5) * 3) * 10) / 10,
      )
      const change = Math.round(((values.at(-1) as number) / (values[0] as number) - 1) * 100)
      const box = el('div', 'tile')
      const heading = el('div', 'tile-heading')
      heading.append(
        el('span', '', name),
        el('span', 'tile-label', `${change > 0 ? '+' : '−'}${Math.abs(change)}%`),
      )
      box.append(heading)
      chart(
        box,
        {
          type: area,
          title: name,
          data: { labels: WEEKS, series: [{ name, values, color }] },
          x: { type: 'time', utc: true, show: false },
          y: { min: 0, max: 80, ticks: 3 },
          curve: 'monotone',
          fill: 'gradient',
          legend: false,
          aspectRatio: 2.1,
        },
        { 'margin-top': '8px' },
      )
      grid.append(box)
    }
    body.append(grid)
  },
})
