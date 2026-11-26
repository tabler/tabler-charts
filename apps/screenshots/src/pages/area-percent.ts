import { area } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'Browser market share',
  subtitle: 'Share of page views worldwide, all platforms',
  source: 'StatCounter GlobalStats, 2009–2024',
  width: 720,
  config: {
    type: area,
    data: {
      labels: ['2009', '2012', '2015', '2018', '2021', '2024'],
      series: [
        { name: 'Chrome', values: [4, 33, 53, 61, 65, 66], color: C.blue },
        { name: 'Safari', values: [3, 7, 12, 15, 19, 18], color: C.teal },
        { name: 'Firefox', values: [27, 23, 15, 5, 4, 2.6], color: C.coral },
        { name: 'Internet Explorer / Edge', values: [65, 35, 13, 7, 3.5, 5.2], color: C.violet },
        { name: 'Other', values: [1, 2, 7, 12, 8.5, 8.2], color: C.slate },
      ],
    },
    stacked: 'percent',
    curve: 'monotone',
    aspectRatio: 2.2,
  },
  style: { '--tc-area-opacity': '0.28' },
})
