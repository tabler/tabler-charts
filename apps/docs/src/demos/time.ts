import { Chart, line, type Series } from '@tabler/charts'
import type { Demo } from '../demo.ts'

type Range = '24 hours' | '30 days' | '2 years'

const HOUR = 3600_000
const DAY = 24 * HOUR

/** Timestamps for a range: hourly, daily or weekly, ending now. */
function stamps(range: Range): number[] {
  const now = Date.now()
  const [count, step] =
    range === '24 hours' ? [24 * 4, HOUR / 4] : range === '30 days' ? [30, DAY] : [104, 7 * DAY]
  const end = Math.floor(now / step) * step
  return Array.from({ length: count + 1 }, (_, i) => end - (count - i) * step)
}

function randomSeries(labels: number[], growth: boolean): Series[] {
  let value = growth ? 20 : 400
  const values = labels.map((_, i) => {
    value = growth
      ? value * (1 + 0.03 + (Math.random() - 0.45) * 0.08)
      : Math.max(50, value + (Math.random() - 0.48) * 120 + Math.sin(i / 5) * 30)
    return Math.round(value)
  })
  return [{ name: growth ? 'Users' : 'Requests', values }]
}

export const timeDemo: Demo = {
  id: 'time',
  title: 'Time & log axes',
  description:
    'x: { type: "time" } places points at their real distance in time with calendar-aware ticks (hours, days, weeks, months, years; the larger unit shows at its boundary). y: { scale: "log" } for exponential data.',
  mount(el, controls) {
    let range: Range = '30 days'
    let growth = false
    let logScale = false
    const build = () => {
      const labels = stamps(range)
      return { labels, series: randomSeries(labels, growth) }
    }
    const chart = new Chart(el, {
      type: line,
      data: build(),
      x: { type: 'time' },
      y: { format: { notation: 'compact' } },
      points: 'none',
      locale: 'en-US',
      aspectRatio: 2.5,
      title: 'Requests over time',
    })
    const refresh = () =>
      chart.update({
        data: build(),
        y: { format: { notation: 'compact' }, scale: logScale ? 'log' : 'linear' },
        title: growth ? 'Users over time' : 'Requests over time',
      })

    controls.button('Shuffle data', refresh)
    controls.select('Range', ['30 days', '24 hours', '2 years'] as const, '30 days', (value) => {
      range = value
      refresh()
    })
    controls.select('Data', ['steady', 'exponential'] as const, 'steady', (value) => {
      growth = value === 'exponential'
      refresh()
    })
    controls.select('Y scale', ['linear', 'log'] as const, 'linear', (value) => {
      logScale = value === 'log'
      refresh()
    })
  },
}
