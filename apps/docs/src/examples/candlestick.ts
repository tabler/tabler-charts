import { Chart } from '@tabler/charts'
import { candlestick } from '@tabler/charts/candlestick'
import '@tabler/charts/style.css'

new Chart('#chart', {
  type: candlestick,
  data: [
    { x: '2026-01-05', open: 98, high: 102, low: 89, close: 94 },
    { x: '2026-01-06', open: 94, high: 99, low: 92, close: 97 },
    { x: '2026-01-07', open: 97, high: 104, low: 96, close: 103 },
  ],
  x: { type: 'time', utc: true },
  y: { format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } },
  locale: 'en-US',
})
