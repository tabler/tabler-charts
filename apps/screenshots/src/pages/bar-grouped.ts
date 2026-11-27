import { bar } from '@tabler/charts'
import { C, definePage, MONTHS } from '../page.ts'

export default definePage({
  title: 'Rain in Warsaw and Lisbon',
  subtitle: 'Average monthly rainfall: wet summers against wet winters',
  source: 'IMGW and IPMA climate normals, 1991–2020',
  config: {
    type: bar,
    data: {
      labels: MONTHS,
      series: [
        { name: 'Warsaw', values: [27, 26, 29, 35, 55, 69, 73, 59, 46, 36, 36, 33], color: C.blue },
        {
          name: 'Lisbon',
          values: [100, 90, 55, 65, 40, 15, 5, 5, 30, 100, 110, 105],
          color: C.amber,
        },
      ],
    },
    radius: 3,
    y: { format: (v: number) => `${v} mm` },
    aspectRatio: 2,
  },
})
