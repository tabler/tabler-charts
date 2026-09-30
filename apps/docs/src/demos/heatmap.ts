import { Chart, heatmap, type Series } from '@tabler/charts'
import type { Demo } from '../demo.ts'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, h) => `${h}:00`)

/** Commits per hour: busy on weekday afternoons, quiet at night and on weekends. */
function randomSeries(): Series[] {
  return DAYS.map((name, d) => ({
    name,
    values: HOURS.map((_, h) => {
      const work = h >= 9 && h <= 18 ? 1 : h >= 7 && h <= 21 ? 0.4 : 0.05
      const weekday = d < 5 ? 1 : 0.3
      return Math.round(Math.random() * 12 * work * weekday)
    }),
  }))
}

export const heatmapDemo: Demo = {
  id: 'heatmap',
  title: 'Heatmap',
  description:
    'Rows are series, columns are labels — the same data as line and bar charts. One hue from the empty shade to the full color (color-mix), so it reads as magnitude. Hover or use the arrow keys to move across cells.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: heatmap,
      data: { labels: HOURS, series: randomSeries() },
      locale: 'en-US',
      aspectRatio: 3,
      title: 'Commits per hour',
    })

    controls.button('Shuffle data', () => chart.setData({ labels: HOURS, series: randomSeries() }))
    controls.color('Color', '#066fd1', (color) => el.style.setProperty('--tc-heat-color', color))
    controls.range('Gap', { min: 0, max: 6, step: 1, value: 2 }, (gap) => chart.update({ gap }))
    controls.range('Radius', { min: 0, max: 8, step: 1, value: 3 }, (radius) =>
      chart.update({ radius }),
    )
  },
}
