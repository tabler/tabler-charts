import { area, Chart, type Series } from '@tabler/charts'
import type { Demo } from '../demo.ts'

const LABELS = Array.from({ length: 30 }, (_, i) => `Sep ${i + 1}`)

function wave(base: number, amplitude: number, phase: number): number[] {
  return LABELS.map((_, i) =>
    Math.round(
      base + amplitude * Math.sin(i / 4 + phase) + (Math.random() - 0.5) * amplitude * 0.6,
    ),
  )
}

function randomSeries(): Series[] {
  const phase = Math.random() * Math.PI
  return [
    { name: 'Desktop', values: wave(620, 180, phase) },
    { name: 'Mobile', values: wave(380, 140, phase + 1) },
    { name: 'Tablet', values: wave(140, 60, phase + 2) },
  ]
}

export const areaDemo: Demo = {
  id: 'area',
  title: 'Area chart',
  description:
    'Filled lines with zero in the domain. The fade is one shared SVG mask; its strength comes from --tc-area-gradient-start, the color from each series.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: area,
      data: { labels: LABELS, series: randomSeries() },
      locale: 'en-US',
      aspectRatio: 2.5,
      title: 'Daily sessions by device',
    })

    controls.button('Shuffle data', () => chart.setData({ labels: LABELS, series: randomSeries() }))
    controls.select('Fill', ['gradient', 'solid'] as const, 'gradient', (fill) =>
      chart.update({ fill }),
    )
    controls.select('Curve', ['monotone', 'linear', 'step'] as const, 'monotone', (curve) =>
      chart.update({ curve }),
    )
    controls.range('Fade', { min: 0.05, max: 0.6, step: 0.05, value: 0.24 }, (value) =>
      el.style.setProperty('--tc-area-gradient-start', String(value)),
    )
  },
}
