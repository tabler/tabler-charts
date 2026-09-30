import { Chart, line, type Series } from '@tabler/charts'
import type { Demo } from '../demo.ts'

const LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function walk(start: number, drift: number): number[] {
  let value = start
  return LABELS.map(() => {
    value = Math.max(0, value + (Math.random() - 0.4) * drift)
    return Math.round(value)
  })
}

function randomSeries(): Series[] {
  const visitors = walk(4200, 1400)
  // A gap in the data: tracking was down in April.
  const signups = walk(900, 500).map((v, i) => (i === 3 ? null : v))
  return [
    { name: 'Visitors', values: visitors },
    {
      name: 'Sign-ups',
      values: signups,
      dash: dashed ? 4 : undefined,
      width: dashed ? 1.5 : undefined,
    },
  ]
}

let dashed = false

export const lineDemo: Demo = {
  id: 'line',
  title: 'Line chart',
  description:
    'Built-in line type: nice y domain, auto margins from label sizes, gaps for missing values (April), crosshair and tooltip on hover. Shuffle to see CSS transitions on the same DOM nodes. Tab into the chart and use the arrow keys.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: line,
      data: { labels: LABELS, series: randomSeries() },
      points: 'last',
      y: { format: { notation: 'compact' } },
      locale: 'en-US',
      aspectRatio: 2.5,
      title: 'Visitors and sign-ups per month',
    })

    controls.button('Shuffle data', () => chart.setData({ labels: LABELS, series: randomSeries() }))
    controls.select('Curve', ['monotone', 'linear', 'step'] as const, 'monotone', (curve) =>
      chart.update({ curve }),
    )
    controls.select('Points', ['last', 'all', 'none'] as const, 'last', (points) =>
      chart.update({ points }),
    )
    controls.select('Gaps', ['leave', 'connect'] as const, 'leave', (gaps) =>
      chart.update({ connectNulls: gaps === 'connect' }),
    )
    controls.select('Animate', ['on', 'off'] as const, 'on', (value) =>
      chart.update({ animate: value === 'on' }),
    )
    controls.select('Fill', ['off', 'on'] as const, 'off', (fill) =>
      chart.update({ area: fill === 'on' }),
    )
    controls.select('Sign-ups', ['solid', 'dashed'] as const, 'solid', (style) => {
      dashed = style === 'dashed'
      chart.setData({ labels: LABELS, series: randomSeries() })
    })
  },
}
