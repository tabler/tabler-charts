import { Chart, heatmap } from '@tabler/charts'
import '@tabler/charts/style.css'

// Rows are series, columns are labels: the same data as line and bar charts.
new Chart('#chart', {
  type: heatmap,
  data: {
    labels: ['00', '04', '08', '12', '16', '20'],
    series: [
      { name: 'Mon', values: [0, 1, 6, 9, 7, 2] },
      { name: 'Tue', values: [0, 0, 5, 8, 9, 3] },
    ],
  },
  // Named bands instead of one hue; or colors: [...] for a scale.
  ranges: [
    { to: 1, color: 'var(--tc-grid-color)', name: 'None' },
    { from: 1, to: 5, color: '#a3d9b1', name: 'Some' },
    { from: 5, color: '#2fb344', name: 'Busy' },
  ],
  gap: 2,
  locale: 'en-US',
})
