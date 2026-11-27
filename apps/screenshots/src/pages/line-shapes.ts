import { line } from '@tabler/charts'
import { C, definePage, MONTHS } from '../page.ts'

// A shape for every series, on the line and in the legend.
export default definePage({
  title: 'Response time by region',
  subtitle: 'Median, milliseconds: each region has its own point shape',
  config: {
    type: line,
    data: {
      labels: MONTHS,
      series: [
        {
          name: 'Europe',
          values: [182, 176, 171, 168, 160, 155, 158, 149, 141, 138, 131, 127],
          color: C.blue,
        },
        {
          name: 'North America',
          values: [214, 220, 205, 198, 201, 190, 186, 192, 178, 171, 169, 160],
          color: C.teal,
        },
        {
          name: 'Asia',
          values: [268, 259, 262, 240, 236, 241, 222, 215, 219, 204, 196, 188],
          color: C.amber,
        },
        {
          name: 'South America',
          values: [301, 310, 289, 294, 276, 281, 262, 255, 248, 251, 236, 229],
          color: C.coral,
        },
      ],
    },
    shapes: true,
    points: 'all',
    pointRadius: 4,
    curve: 'linear',
    y: { min: 100, format: (value: number) => `${value} ms` },
    aspectRatio: 1.9,
  },
})
