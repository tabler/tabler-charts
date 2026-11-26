import { line } from '@tabler/charts'
import { C, definePage, MONTHS } from '../page.ts'

export default definePage({
  title: 'A year in Warsaw',
  subtitle: 'Average daily high and low by month',
  source: 'IMGW climate normals, 1991–2020',
  config: {
    type: line,
    data: {
      labels: MONTHS,
      series: [
        {
          name: 'Average high',
          values: [0.6, 1.9, 6.6, 13.6, 19.5, 22.4, 24.7, 24.2, 18.6, 12.7, 6.1, 1.7],
          color: C.coral,
        },
        {
          name: 'Average low',
          values: [-4.2, -3.6, -0.6, 3.9, 8.9, 12.1, 14.4, 13.7, 9.6, 5.1, 1.1, -2.6],
          color: C.blue,
        },
      ],
    },
    curve: 'monotone',
    points: 'all',
    pointRadius: 3,
    y: { format: { style: 'unit', unit: 'celsius' }, zero: true },
    aspectRatio: 2,
  },
})
