import { bar, Chart } from '@tabler/charts'
import '@tabler/charts/style.css'

new Chart('#chart', {
  type: bar,
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [
      { name: 'Revenue', values: [42_000, 51_500, 47_200, 63_800] },
      { name: 'Costs', values: [31_000, 35_400, -4_200, 44_100] },
      // A series can be drawn as a line over the bars.
      { name: 'Target', values: [45_000, 50_000, 55_000, 60_000], type: 'line' },
    ],
  },
  stacked: false, // true, or 'percent'
  orientation: 'vertical', // or 'horizontal'
  radius: 4,
  y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
  locale: 'en-US',
})
