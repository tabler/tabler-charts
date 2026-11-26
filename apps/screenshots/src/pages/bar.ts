import { bar } from '@tabler/charts'
import { definePage } from '../page.ts'

export default definePage({
  title: 'Revenue and costs',
  subtitle: 'By quarter, with the target as a line',
  config: {
    type: bar,
    data: {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      series: [
        { name: 'Revenue', values: [42_000, 51_500, 47_200, 63_800] },
        { name: 'Costs', values: [31_000, 35_400, 33_900, 44_100] },
        { name: 'Target', values: [45_000, 50_000, 55_000, 60_000], type: 'line' },
      ],
    },
    radius: 4,
    y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
    aspectRatio: 2,
  },
})
