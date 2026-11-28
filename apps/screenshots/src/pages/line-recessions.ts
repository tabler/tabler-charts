import { line } from '@tabler/charts'
import { C, definePage, years } from '../page.ts'

const YEARS = Array.from({ length: 25 }, (_, i) => 2000 + i)
const month = (year: number, index: number) => Date.UTC(year, index, 1)

export default definePage({
  title: 'Unemployment in the United States',
  subtitle: 'Yearly average, with the recessions shaded, 2000–2024',
  source: 'US Bureau of Labor Statistics; NBER business cycle dates',
  width: 720,
  config: {
    type: line,
    data: {
      labels: years(YEARS),
      series: [
        {
          name: 'Unemployment rate',
          values: [
            4.0, 4.7, 5.8, 6.0, 5.5, 5.1, 4.6, 4.6, 5.8, 9.3, 9.6, 8.9, 8.1, 7.4, 6.2, 5.3, 4.9,
            4.4, 3.9, 3.7, 8.1, 5.3, 3.6, 3.6, 4.0,
          ],
          color: C.blue,
        },
      ],
    },
    x: { type: 'time', utc: true },
    y: { min: 0, max: 12, format: (value: number) => `${value}%` },
    annotations: [
      { x: [month(2001, 2), month(2001, 10)], label: 'Dot-com' },
      { x: [month(2007, 11), month(2009, 5)], label: 'Financial crisis' },
      { x: [month(2020, 1), month(2020, 3)], label: 'Covid-19' },
    ],
    curve: 'linear',
    points: 'all',
    pointRadius: 3,
    legend: false,
    aspectRatio: 2.2,
  },
})
