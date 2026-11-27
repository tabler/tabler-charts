import { calendar } from '@tabler/charts'
import { C, definePage } from '../page.ts'

// A year of running: easy days, a long run on Sundays, rest on Mondays and
// a build-up towards a marathon in October. The same on every run.
const DAY = 86_400_000
const FROM = Date.UTC(2025, 0, 1)
let seed = 7
const random = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
const values = Array.from({ length: 365 }, (_, i) => {
  const date = new Date(FROM + i * DAY)
  const weekday = date.getUTCDay()
  const month = date.getUTCMonth()
  // Training load through the year: a winter base, a peak in September, a taper and recovery.
  const load = [0.5, 0.55, 0.65, 0.75, 0.8, 0.85, 0.9, 1, 1.05, 0.7, 0.4, 0.45][month] as number
  let km = 0
  if (weekday === 0) km = 18 + random() * 14
  else if (weekday === 1 || (weekday === 5 && random() < 0.6)) km = 0
  else if (random() < 0.82) km = 6 + random() * 8
  return { date: date.toISOString().slice(0, 10), value: Math.round(km * load) }
}).filter((day) => day.value > 0)

export default definePage({
  title: 'A year of running',
  subtitle: `${values.reduce((sum, day) => sum + day.value, 0).toLocaleString('en-US')} km in 2025, with a marathon in October`,
  width: 800,
  config: {
    type: calendar,
    data: values,
    from: '2025-01-01',
    to: '2025-12-31',
    utc: true,
    max: 24,
    levels: 5,
    gap: 3,
    radius: 3,
    format: { style: 'unit', unit: 'kilometer' },
  },
  style: { '--tc-heat-color': C.teal },
})
