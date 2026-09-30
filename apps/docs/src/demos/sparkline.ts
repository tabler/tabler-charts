import { Chart, formatNumber, type SparklineOptions, sparkline } from '@tabler/charts'
import type { Demo } from '../demo.ts'

const DAYS = Array.from({ length: 14 }, (_, i) => `Sep ${i + 17}`)

const walk = (start: number, drift: number) => {
  // Keep four decimals for ratios like the conversion rate, integers otherwise.
  const scale = start < 1 ? 1e4 : 1
  let value = start
  return DAYS.map(() => {
    value = Math.max(0, value + (Math.random() - 0.45) * drift)
    return Math.round(value * scale) / scale
  })
}

const TILES: {
  label: string
  format: Intl.NumberFormatOptions
  options: Partial<SparklineOptions>
  start: number
  drift: number
  /** Custom data instead of a random walk. */
  data?: () => number[]
}[] = [
  {
    label: 'Revenue',
    format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
    options: { variant: 'area' },
    start: 4200,
    drift: 900,
  },
  { label: 'Orders', format: {}, options: { variant: 'bar' }, start: 120, drift: 40 },
  {
    label: 'Net change',
    format: { signDisplay: 'exceptZero' },
    options: { variant: 'tristate' },
    start: 0,
    drift: 0,
    // Daily change in active users: mostly up, some down, a few flat days.
    data: () =>
      DAYS.map(() => Math.round((Math.random() - 0.35) * 40) * (Math.random() < 0.15 ? 0 : 1)),
  },
  {
    label: 'Visitors',
    format: { notation: 'compact' },
    options: { markers: 'minmax' },
    start: 18000,
    drift: 5000,
  },
  {
    label: 'Conversion',
    format: { style: 'percent', maximumFractionDigits: 1 },
    options: { curve: 'linear' },
    start: 0.03,
    drift: 0.01,
  },
]

export const sparklineDemo: Demo = {
  id: 'sparkline',
  title: 'Sparklines',
  description:
    'Tiny line, area and bar charts without axes for stat tiles: fitted range for lines, zero baseline for areas and bars, last-value dot, min/max markers and a tooltip. Tristate shows only the sign: up, down or flat.',
  mount(el, controls) {
    el.classList.add('tiles')
    const charts = TILES.map((tile) => {
      const card = document.createElement('div')
      card.className = 'tile'
      const label = document.createElement('div')
      label.className = 'tile-label'
      label.textContent = tile.label
      const value = document.createElement('div')
      value.className = 'tile-value'
      const spark = document.createElement('div')
      spark.className = 'tile-spark'
      card.append(label, value, spark)
      el.append(card)

      const fmt = formatNumber(tile.format, 'en-US')
      const data = tile.data?.() ?? walk(tile.start, tile.drift)
      value.textContent = fmt(data.at(-1) ?? 0)
      const chart = new Chart(spark, {
        type: sparkline,
        data,
        labels: DAYS,
        name: tile.label,
        format: tile.format,
        height: 40,
        locale: 'en-US',
        title: `${tile.label}, last 14 days`,
        ...tile.options,
      })
      return { chart, tile, value, fmt }
    })

    controls.button('Shuffle data', () => {
      for (const { chart, tile, value, fmt } of charts) {
        const data = tile.data?.() ?? walk(tile.start, tile.drift)
        value.textContent = fmt(data.at(-1) ?? 0)
        chart.setData(data)
      }
    })
  },
}
