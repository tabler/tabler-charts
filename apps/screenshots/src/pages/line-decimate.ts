import { line } from '@tabler/charts'
import { C, definePage } from '../page.ts'
import { seeded } from '../random.ts'

// A day of a made-up power meter, one reading every two seconds. The chart
// draws 600 of the 43,200 points and keeps every peak.
const COUNT = 43_200
const FROM = Date.UTC(2026, 2, 12)
const random = seeded(5)
let drift = 0
const watts = Array.from({ length: COUNT }, (_, i) => {
  const hour = (i / COUNT) * 24
  // A quiet night, a morning and an evening peak, and an oven at lunch.
  const day =
    260 +
    900 * Math.exp(-((hour - 7.5) ** 2) / 1.2) +
    1500 * Math.exp(-((hour - 19) ** 2) / 3) +
    (hour > 12.2 && hour < 12.9 ? 2100 : 0)
  drift = drift * 0.995 + (random() - 0.5) * 30
  const kettle = random() < 0.0004 ? 1800 : 0
  return Math.max(120, Math.round(day + drift + kettle + (random() - 0.5) * 60))
})

export default definePage({
  title: 'A day of household power',
  subtitle: '43,200 readings drawn with 600 points: the peaks stay where they were',
  width: 720,
  config: {
    type: line,
    data: {
      labels: Array.from({ length: COUNT }, (_, i) => FROM + i * 2000),
      series: [{ name: 'Power', values: watts, color: C.violet }],
    },
    x: { type: 'time', utc: true },
    y: { format: (value: number) => (value >= 1000 ? `${value / 1000} kW` : `${value} W`) },
    decimate: 600,
    curve: 'linear',
    area: true,
    legend: false,
    aspectRatio: 2.2,
  },
})
