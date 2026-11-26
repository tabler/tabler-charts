import { area } from '@tabler/charts'
import { definePage, years } from '../page.ts'

const YEARS = Array.from({ length: 25 }, (_, i) => 2000 + i)

export default definePage({
  title: 'Fed funds rate',
  subtitle: 'Upper bound of the target range at year end',
  source: 'Federal Reserve, 2000–2024',
  config: {
    type: area,
    data: {
      labels: years(YEARS),
      series: [
        {
          name: 'Target rate',
          values: [
            6.5, 1.75, 1.25, 1.0, 2.25, 4.25, 5.25, 4.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25,
            0.5, 0.75, 1.5, 2.5, 1.75, 0.25, 0.25, 4.5, 5.5, 4.5,
          ],
        },
      ],
    },
    x: { type: 'time', utc: true },
    curve: 'step-after',
    fill: 'solid',
    y: { format: (v: number) => `${v}%` },
    annotations: [
      { x: [Date.UTC(2008, 8, 1), Date.UTC(2009, 5, 1)], label: 'Financial crisis' },
      { x: [Date.UTC(2020, 2, 1), Date.UTC(2021, 11, 1)], label: 'Pandemic' },
    ],
    aspectRatio: 2,
  },
})
