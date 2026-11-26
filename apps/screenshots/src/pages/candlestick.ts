import { candlestick } from '@tabler/charts'
import { definePage } from '../page.ts'

// Thirty trading days of a made-up share: the same on every run.
const DAY = 86_400_000
const START = Date.UTC(2026, 0, 5)
let close = 96
const data = Array.from({ length: 30 }, (_, i) => {
  const open = close
  const move = Math.sin(i * 1.7) * 3 + Math.cos(i * 0.6) * 2 + 0.4
  close = Math.round((open + move) * 10) / 10
  const spread = 1.5 + Math.abs(Math.sin(i * 2.3)) * 2.5
  return {
    x: START + i * DAY,
    open,
    close,
    high: Math.round((Math.max(open, close) + spread) * 10) / 10,
    low: Math.round((Math.min(open, close) - spread) * 10) / 10,
  }
})

export default definePage({
  title: 'Share price',
  subtitle: 'Daily open, high, low and close',
  config: {
    type: candlestick,
    data,
    x: { type: 'time', utc: true },
    y: { format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } },
    aspectRatio: 2,
  },
})
