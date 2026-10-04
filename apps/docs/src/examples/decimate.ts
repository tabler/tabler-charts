import { Chart, line } from '@tabler/charts'
import '@tabler/charts/style.css'

// 50,000 points, one per minute.
const start = Date.UTC(2026, 0, 1)
const labels = Array.from({ length: 50_000 }, (_, i) => start + i * 60_000)
const values = labels.map((_, i) => 50 + 20 * Math.sin(i / 600) + Math.random() * 10)

new Chart('#chart', {
  type: line,
  data: { labels, series: [{ name: 'CPU', values }] },
  x: { type: 'time' },
  // Draw the line from 500 points chosen by LTTB downsampling: spikes survive.
  decimate: 500,
  aspectRatio: 3,
})
