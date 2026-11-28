import { line } from '@tabler/charts'
import { C, definePage } from '../page.ts'
import { seeded } from '../random.ts'

// Two days of a made-up cold room, read every half hour. The sensor was off
// for a few hours: the line breaks there, it does not guess.
const HALF_HOUR = 1_800_000
const FROM = Date.UTC(2026, 5, 9)
const random = seeded(23)
const times = Array.from({ length: 96 }, (_, i) => FROM + i * HALF_HOUR)
const offline = (i: number) => i >= 52 && i < 63
const readings = times.map((_, i) => {
  if (offline(i)) return null
  // A defrost cycle every eight hours, and a door left open on the second afternoon.
  const defrost = i % 16 === 3 ? 1.6 : i % 16 === 4 ? 0.8 : 0
  const door = i >= 74 && i <= 77 ? ([1.2, 2.9, 3.6, 1.4][i - 74] as number) : 0
  return (
    Math.round((3.4 + Math.sin(i / 7) * 0.35 + (random() - 0.5) * 0.4 + defrost + door) * 10) / 10
  )
})

export default definePage({
  title: 'Cold room temperature',
  subtitle: 'A reading every half hour, with the hours the sensor was offline',
  width: 720,
  config: {
    type: line,
    data: { labels: times, series: [{ name: 'Cold room 2', values: readings, color: C.blue }] },
    x: { type: 'time', utc: true },
    y: { min: 2, max: 8, format: (value: number) => `${value} °C` },
    annotations: [
      { x: [times[52] as number, times[62] as number], label: 'Sensor offline' },
      { y: 5, label: 'Limit, 5 °C', color: C.coral },
    ],
    curve: 'monotone',
    legend: false,
    aspectRatio: 2.2,
  },
})
