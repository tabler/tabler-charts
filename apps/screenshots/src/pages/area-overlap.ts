import { area } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'Spotify users',
  subtitle: 'Monthly active users and paying subscribers, in millions',
  source: 'Spotify quarterly reports, 2016–2024',
  config: {
    type: area,
    data: {
      labels: Array.from({ length: 9 }, (_, i) => String(2016 + i)),
      series: [
        {
          name: 'Monthly active users',
          values: [123, 160, 207, 271, 345, 406, 489, 602, 675],
          color: C.green,
        },
        {
          name: 'Premium subscribers',
          values: [48, 71, 96, 124, 155, 180, 205, 236, 263],
          color: C.ink,
        },
      ],
    },
    curve: 'monotone',
    fill: 'gradient',
    points: 'last',
    valueLabels: true,
    y: { format: (v: number) => `${v}M` },
    aspectRatio: 2,
  },
})
