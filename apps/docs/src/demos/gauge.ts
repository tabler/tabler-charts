import { Chart, gauge } from '@tabler/charts'
import type { Demo } from '../demo.ts'

export const gaugeDemo: Demo = {
  id: 'gauge',
  title: 'Gauge',
  description:
    'Progress towards a maximum as an arc on a track, with the share in the middle. Arcs transition to new values; several rings nest from the outside in, each toggled from the legend.',
  mount(el, controls) {
    let rings = 1
    const random = () => Math.round(Math.random() * 100)
    const data = () =>
      rings === 1
        ? { name: 'completed', value: random() }
        : ['Deliverability', 'Storage', 'Onboarding'].slice(0, rings).map((name) => ({
            name,
            value: random(),
          }))

    const chart = new Chart(el, {
      type: gauge,
      data: { name: 'completed', value: 58 },
      locale: 'en-US',
      aspectRatio: 2,
      title: 'Setup progress',
    })

    controls.button('Random value', () => chart.setData(data()))
    controls.select('Rings', ['1', '2', '3'] as const, '1', (value) => {
      rings = Number(value)
      chart.setData(data())
    })
    controls.select('Shape', ['ring', 'dial', 'half'] as const, 'ring', (shape) =>
      chart.update(
        shape === 'ring'
          ? { startAngle: 0, angle: 360 }
          : shape === 'dial'
            ? { startAngle: -135, angle: 270 }
            : { startAngle: -90, angle: 180 },
      ),
    )
    controls.range('Thickness', { min: 2, max: 40, step: 1, value: 12 }, (thickness) =>
      chart.update({ thickness }),
    )
    controls.range('Corners', { min: 0, max: 20, step: 1, value: 6 }, (cornerRadius) =>
      chart.update({ cornerRadius }),
    )
  },
}
