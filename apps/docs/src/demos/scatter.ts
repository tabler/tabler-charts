import { Chart, type ScatterSeries, scatter } from '@tabler/charts'
import type { Demo } from '../demo.ts'

// Three series: the palette's first three slots stay distinguishable when every
// point can sit next to every other one (scatter plots compare all pairs).
const TEAMS = [
  { name: 'Design', speed: 30, quality: 70 },
  { name: 'Frontend', speed: 55, quality: 55 },
  { name: 'Backend', speed: 70, quality: 40 },
]

let bubbles = false

function randomSeries(): ScatterSeries[] {
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2
  return TEAMS.map((team) => ({
    name: team.name,
    points: Array.from({ length: 24 }, (_, i) => ({
      x: Math.round(team.speed + gauss() * 12),
      y: Math.round(team.quality + gauss() * 12),
      label: `${team.name} #${i + 1}`,
      ...(bubbles ? { size: Math.round(1 + Math.random() * 40) } : {}),
    })),
  }))
}

export const scatterDemo: Demo = {
  id: 'scatter',
  title: 'Scatter & bubble',
  description:
    'Two value axes, nearest-point hit testing in 2D (binary search on x), a halo on the hovered point and area-proportional bubbles. Arrow keys walk the points left to right.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: scatter,
      data: { series: randomSeries() },
      x: { format: { maximumFractionDigits: 0 } },
      locale: 'en-US',
      aspectRatio: 2.2,
      title: 'Tickets: speed vs quality',
    })

    controls.button('Shuffle data', () => chart.setData({ series: randomSeries() }))
    controls.select('Points', ['dots', 'bubbles'] as const, 'dots', (value) => {
      bubbles = value === 'bubbles'
      chart.setData({ series: randomSeries() })
    })
    controls.select('Grid', ['horizontal', 'both'] as const, 'horizontal', (value) =>
      chart.update({ x: { format: { maximumFractionDigits: 0 }, grid: value === 'both' } }),
    )
  },
}
