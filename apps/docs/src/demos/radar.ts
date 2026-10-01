import { Chart, radar, type Series } from '@tabler/charts'
import type { Demo } from '../demo.ts'

const SKILLS = ['Speed', 'Range', 'Comfort', 'Safety', 'Price', 'Design']
const NAMES = ['Model S', 'Model X', 'Model Y']

let seriesCount = 2

function randomSeries(): Series[] {
  return NAMES.slice(0, seriesCount).map((name) => ({
    name,
    values: SKILLS.map(() => Math.round(30 + Math.random() * 70)),
  }))
}

export const radarDemo: Demo = {
  id: 'radar',
  title: 'Radar chart',
  description:
    'One spoke per measure and a polygon per series, growing from the center. Rings are polygons or circles; values morph to new data, hovering a spoke shows every series there, and labels that do not fit are cut short.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: radar,
      data: { labels: SKILLS, series: randomSeries() },
      r: { max: 100 },
      locale: 'en-US',
      aspectRatio: 1.6,
      title: 'Car ratings',
    })

    controls.button('Shuffle data', () => chart.setData({ labels: SKILLS, series: randomSeries() }))
    controls.select('Series', ['1', '2', '3'] as const, '2', (value) => {
      seriesCount = Number(value)
      chart.setData({ labels: SKILLS, series: randomSeries() })
    })
    controls.select('Grid', ['polygon', 'circle'] as const, 'polygon', (grid) =>
      chart.update({ grid }),
    )
    controls.select('Fill', ['on', 'off'] as const, 'on', (value) =>
      chart.update({ fill: value === 'on' }),
    )
    controls.select('Points', ['off', 'on'] as const, 'off', (value) =>
      chart.update({ points: value === 'on' }),
    )
  },
}
