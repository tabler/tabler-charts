import { scatter } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'The planets',
  subtitle: 'Distance from the Sun against mass; a bubble is as large as the planet',
  source: 'NASA Planetary Fact Sheet',
  width: 720,
  config: {
    type: scatter,
    data: {
      series: [
        {
          name: 'Rocky planets',
          color: C.coral,
          points: [
            { x: 0.39, y: 0.055, size: 2440, label: 'Mercury' },
            { x: 0.72, y: 0.815, size: 6052, label: 'Venus' },
            { x: 1.0, y: 1.0, size: 6371, label: 'Earth' },
            { x: 1.52, y: 0.107, size: 3390, label: 'Mars' },
          ],
        },
        {
          name: 'Giant planets',
          color: C.blue,
          points: [
            { x: 5.2, y: 317.8, size: 69911, label: 'Jupiter' },
            { x: 9.58, y: 95.2, size: 58232, label: 'Saturn' },
            { x: 19.2, y: 14.5, size: 25362, label: 'Uranus' },
            { x: 30.1, y: 17.1, size: 24622, label: 'Neptune' },
          ],
        },
      ],
    },
    x: { scale: 'log', format: (v: number) => `${v} AU` },
    y: { scale: 'log', max: 10_000, format: (v: number) => `${v}× Earth` },
    size: { min: 5, max: 28 },
    aspectRatio: 2.2,
  },
})
