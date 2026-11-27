import { heatmap } from '@tabler/charts'
import { C, definePage } from '../page.ts'
import { seeded } from '../random.ts'

// A made-up status page: the slowest response of each service in each hour,
// sorted into three named ranges instead of a continuous scale.
const SERVICES: [name: string, base: number][] = [
  ['API', 140],
  ['Checkout', 210],
  ['Search', 170],
  ['Images', 120],
  ['Webhooks', 240],
]
const random = seeded(41)
const HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}`)

export default definePage({
  title: 'Response time, hour by hour',
  subtitle: 'Slowest response of each service yesterday, in three ranges',
  width: 760,
  config: {
    type: heatmap,
    data: {
      labels: HOURS,
      series: SERVICES.map(([name, base], row) => ({
        name,
        values: HOURS.map((_, hour) => {
          // Traffic peaks in the evening; one incident hits checkout and webhooks at 14–16.
          const load = 1 + 0.9 * Math.exp(-((hour - 19) ** 2) / 10)
          const incident = (row === 1 || row === 4) && hour >= 14 && hour <= 16 ? 2.6 : 1
          return Math.round(base * load * incident * (0.8 + random() * 0.5))
        }),
      })),
    },
    ranges: [
      { to: 300, color: C.teal, name: 'Under 300 ms' },
      { from: 300, to: 600, color: C.amber, name: '300–600 ms' },
      { from: 600, color: C.coral, name: 'Over 600 ms' },
    ],
    format: (value: number) => `${value} ms`,
    gap: 3,
    radius: 3,
    aspectRatio: 3.4,
  },
})
