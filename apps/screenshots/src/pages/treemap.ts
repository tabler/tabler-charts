import { treemap } from '@tabler/charts'
import { definePage } from '../page.ts'

export default definePage({
  title: 'Spending by team',
  subtitle: 'This year, by category',
  config: {
    type: treemap,
    data: [
      {
        name: 'Engineering',
        children: [
          { name: 'Salaries', value: 182_000 },
          { name: 'Cloud', value: 46_000 },
          { name: 'Contractors', value: 28_000 },
        ],
      },
      {
        name: 'Marketing',
        children: [
          { name: 'Ads', value: 64_000 },
          { name: 'Events', value: 22_000 },
        ],
      },
      { name: 'Office', value: 31_000 },
    ],
    format: { style: 'currency', currency: 'USD', notation: 'compact' },
    aspectRatio: 2,
  },
})
