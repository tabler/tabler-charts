import { bar, Chart, formatNumber, type Series } from '@tabler/charts'
import type { Demo } from '../demo.ts'

const LABELS = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026']
const NAMES = ['North', 'South', 'West']

let seriesCount = 2
let negatives = false

function randomSeries(): Series[] {
  return NAMES.slice(0, seriesCount).map((name, i) => ({
    name,
    values: LABELS.map(() => {
      const value = Math.round(20 + Math.random() * 60 - i * 8)
      return negatives && Math.random() < 0.35 ? -Math.round(value / 2) : value
    }),
  }))
}

export const barDemo: Demo = {
  id: 'bar',
  title: 'Bar chart',
  description:
    'Grouped bars capped at 24px with a 2px gap, rounded only at the data end and growing from zero — negative values grow down.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: bar,
      data: { labels: LABELS, series: randomSeries() },
      y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
      locale: 'en-US',
      aspectRatio: 2.5,
      title: 'Profit by region',
    })

    const refresh = () => chart.setData({ labels: LABELS, series: randomSeries() })

    const fmt = formatNumber(
      { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
      'en-US',
    )
    const readout = controls.output('Clicked')
    chart.on('click', ({ hit }) => {
      const item = hit.seriesIndex === undefined ? undefined : hit.items[hit.seriesIndex]
      readout(item ? `${hit.title} — ${item.name}: ${fmt(item.value ?? 0)}` : hit.title)
    })

    controls.button('Shuffle data', refresh)
    controls.select('Series', ['1', '2', '3'] as const, '2', (value) => {
      seriesCount = Number(value)
      refresh()
    })
    controls.select('Negative values', ['off', 'on'] as const, 'off', (value) => {
      negatives = value === 'on'
      refresh()
    })
    controls.select(
      'Data table',
      ['screen readers', 'visible'] as const,
      'screen readers',
      (value) => chart.update({ table: value === 'visible' ? 'visible' : true }),
    )
    controls.range('Radius', { min: 0, max: 12, step: 1, value: 4 }, (radius) =>
      chart.update({ radius }),
    )
  },
}
