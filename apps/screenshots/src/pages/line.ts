import { line } from '@tabler/charts'
import { definePage } from '../page.ts'

export default definePage({
  title: 'Website traffic',
  subtitle: 'Visitors and sign-ups, first half of the year',
  config: {
    type: line,
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      series: [
        { name: 'Visitors', values: [8200, 9320, 9010, 10400, 12900, 13300] },
        { name: 'Sign-ups', values: [3620, 4730, 4700, 5340, 6990, 8130] },
      ],
    },
    curve: 'monotone',
    points: 'last',
    y: { format: { notation: 'compact' } },
    aspectRatio: 2,
    annotations: [{ y: 10_000, label: 'Goal' }],
  },
})
