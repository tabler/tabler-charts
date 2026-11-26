import { area } from '@tabler/charts'
import { definePage } from '../page.ts'

export default definePage({
  title: 'Sessions by channel',
  subtitle: 'Organic and paid, last 7 days',
  config: {
    type: area,
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      series: [
        { name: 'Organic', values: [420, 510, 470, 630, 580, 710, 690] },
        { name: 'Paid', values: [210, 260, 240, 300, 330, 280, 260] },
      ],
    },
    stacked: true,
    fill: 'gradient',
    curve: 'monotone',
    aspectRatio: 2,
  },
})
