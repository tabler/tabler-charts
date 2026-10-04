import { Chart, line } from '@tabler/charts'
import '@tabler/charts/style.css'

const chart = new Chart('#chart', {
  type: line,
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    series: [
      { name: 'Visitors', values: [8200, 9320, 9010, null, 12900, 13300] }, // null: a gap
      { name: 'Sign-ups', values: [620, 730, 700, 734, 990, 1130] },
    ],
  },
  curve: 'monotone', // or 'linear', 'step'
  points: 'last',
  y: { format: { notation: 'compact' } },
  locale: 'en-US',
  aspectRatio: 2.5,
  annotations: [{ y: 10_000, label: 'Goal' }],
})

// New data morphs the lines in place.
chart.setData({ labels: ['Jul'], series: [{ name: 'Visitors', values: [14100] }] })
