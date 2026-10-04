import { bar, Chart, line } from '@tabler/charts'
import '@tabler/charts/style.css'

new Chart('#bars', {
  type: bar,
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [{ name: 'Revenue', values: [42_000, 51_500, 47_200, 63_800] }],
  },
  y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
  valueLabels: true, // in the axis format: $42K
  locale: 'en-US',
})

new Chart('#line', {
  type: line,
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    series: [{ name: 'Active users', values: [820, 932, 901, 934, 1290] }],
  },
  valueLabels: { points: 'all' }, // the last point by default
  locale: 'en-US',
})
