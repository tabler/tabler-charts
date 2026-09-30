import { Chart, donut, type PieSlice, pie } from '@tabler/charts'
import type { Demo } from '../demo.ts'

const SOURCES = ['Direct', 'Search', 'Social', 'Referral', 'Email']

function randomSlices(): PieSlice[] {
  return SOURCES.map((name, i) => ({
    name,
    value: Math.round(200 + Math.random() * 900 - i * 120),
  }))
}

export const pieDemo: Demo = {
  id: 'pie',
  title: 'Pie & donut',
  description:
    'Slices from the arc generator (d3-compatible) with a constant 2px gap and rounded corners. Legend toggles slices, the tooltip shows the share, the donut hole shows the total.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: donut,
      data: randomSlices(),
      locale: 'en-US',
      aspectRatio: 2.5,
      title: 'Sessions by source',
    })

    controls.button('Shuffle data', () => chart.setData(randomSlices()))
    controls.select('Type', ['donut', 'pie'] as const, 'donut', (type) =>
      chart.update({ type: type === 'pie' ? pie : donut }),
    )
    controls.select('Center', ['total', 'custom', 'none'] as const, 'total', (value) =>
      chart.update({
        center:
          value === 'none'
            ? false
            : value === 'custom'
              ? { value: '7 days', label: 'Last' }
              : undefined,
      }),
    )
    controls.range('Gap', { min: 0, max: 8, step: 1, value: 2 }, (gap) => chart.update({ gap }))
    controls.range('Corners', { min: 0, max: 12, step: 1, value: 4 }, (cornerRadius) =>
      chart.update({ cornerRadius }),
    )
  },
}
