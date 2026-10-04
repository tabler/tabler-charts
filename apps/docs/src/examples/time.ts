import { Chart, line } from '@tabler/charts'
import '@tabler/charts/style.css'

// Labels are dates (Date, timestamps or ISO strings): points sit at their real
// distance in time, with calendar ticks (hours, days, weeks, months, years).
new Chart('#chart', {
  type: line,
  data: {
    labels: ['2026-01-05', '2026-01-06', '2026-01-09', '2026-01-20', '2026-02-02'],
    series: [{ name: 'Requests', values: [1200, 1350, 980, 2100, 1870] }],
  },
  x: { type: 'time' },
  y: { format: { notation: 'compact' } }, // scale: 'log' for a log axis
  points: 'none',
  locale: 'en-US',
})
