import { radar } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'Democracy Index',
  subtitle: 'The five categories of the index, scored 0 to 10',
  source: 'Economist Intelligence Unit, 2023',
  width: 560,
  config: {
    type: radar,
    data: {
      labels: [
        'Electoral process',
        'Functioning of government',
        'Political participation',
        'Political culture',
        'Civil liberties',
      ],
      series: [
        { name: 'Norway', values: [10.0, 9.64, 10.0, 10.0, 9.71], color: C.teal },
        { name: 'United States', values: [9.17, 6.43, 8.89, 6.25, 8.24], color: C.blue },
        { name: 'Poland', values: [9.58, 5.36, 7.22, 5.0, 8.24], color: C.coral },
      ],
    },
    r: { min: 0, max: 10 },
    points: true,
    aspectRatio: 1.5,
  },
})
