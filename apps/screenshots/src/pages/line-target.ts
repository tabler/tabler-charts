import { line } from '@tabler/charts'
import { C, definePage } from '../page.ts'

const YEARS = Array.from({ length: 25 }, (_, i) => 2000 + i)

export default definePage({
  title: 'US inflation',
  subtitle: 'Consumer prices, change on the year before',
  source: 'US Bureau of Labor Statistics, 2000–2024',
  config: {
    type: line,
    data: {
      labels: YEARS.map(String),
      series: [
        {
          name: 'CPI, year over year',
          values: [
            3.4, 2.8, 1.6, 2.3, 2.7, 3.4, 3.2, 2.9, 3.8, -0.4, 1.6, 3.2, 2.1, 1.5, 1.6, 0.1, 1.3,
            2.1, 2.4, 1.8, 1.2, 4.7, 8.0, 4.1, 2.9,
          ],
        },
      ],
    },
    curve: 'linear',
    points: 'all',
    pointRadius: 2.5,
    y: { format: (v: number) => `${v}%`, zero: true },
    x: { format: (label: string | number, i: number) => (i % 4 === 0 ? String(label) : '') },
    annotations: [{ y: 2, label: '2% target', color: C.teal }],
    aspectRatio: 2,
  },
  style: { '--tc-color-1': C.coral },
})
