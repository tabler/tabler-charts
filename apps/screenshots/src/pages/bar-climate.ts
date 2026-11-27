import { bar } from '@tabler/charts'
import { C, definePage, MONTHS } from '../page.ts'

// A climate chart: rain as bars on the left axis, temperature as a line on the right one.
export default definePage({
  title: 'The climate of Warsaw',
  subtitle: 'Monthly precipitation and mean temperature, 1991–2020 normals',
  source: 'IMGW-PIB climate normals, 1991–2020',
  config: {
    type: bar,
    data: {
      labels: MONTHS,
      series: [
        {
          name: 'Precipitation',
          values: [29, 27, 31, 37, 57, 69, 84, 62, 49, 39, 36, 35],
          color: C.blue,
        },
        {
          name: 'Temperature',
          values: [-1.9, -0.8, 3, 9.1, 14.3, 17.6, 19.7, 19.1, 13.9, 8.6, 3.7, -0.2],
          type: 'line',
          axis: 'y2',
          color: C.coral,
        },
      ],
    },
    y: { title: 'mm', max: 100 },
    y2: { title: '°C', min: -5, max: 20, format: (value: number) => `${value}°` },
    curve: 'monotone',
    radius: 3,
    aspectRatio: 1.9,
  },
})
