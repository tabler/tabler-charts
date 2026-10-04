import { bar, Chart, donut, line } from '@tabler/charts'
import type { Demo } from '../demo.ts'

export const valueLabelsDemo: Demo = {
  id: 'value-labels',
  title: 'Value labels',
  description:
    'Values written on the marks: bars at their end (inside when there is no room outside), stacked segments inside, slices their share, lines their last point or every point. A label that does not fit, or would cover another label or mark, is left out, so labels never overlap.',
  mount(el, controls) {
    el.classList.add('demo-quad')
    const host = () => {
      const div = document.createElement('div')
      el.append(div)
      return div
    }
    const labels = ['Q1', 'Q2', 'Q3', 'Q4']
    const money = { style: 'currency', currency: 'USD', notation: 'compact' } as const
    const charts = [
      new Chart(host(), {
        type: bar,
        locale: 'en-US',
        title: 'Revenue and costs',
        valueLabels: true,
        y: { format: money },
        data: {
          labels,
          series: [
            { name: 'Revenue', values: [42_000, 51_500, 47_200, 63_800] },
            { name: 'Costs', values: [31_000, 35_400, -4_200, 44_100] },
          ],
        },
      }),
      new Chart(host(), {
        type: bar,
        locale: 'en-US',
        title: 'Tickets by priority',
        valueLabels: true,
        stacked: true,
        data: {
          labels,
          series: [
            { name: 'Low', values: [34, 41, 28, 39] },
            { name: 'Normal', values: [27, 22, 31, 25] },
            { name: 'High', values: [12, 18, 9, 3] },
          ],
        },
      }),
      new Chart(host(), {
        type: line,
        locale: 'en-US',
        title: 'Active users',
        valueLabels: true,
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          series: [
            { name: 'Web', values: [820, 932, 901, 934, 1290, 1330, 1320] },
            { name: 'Mobile', values: [620, 732, 701, 734, 990, 1130, 1020] },
          ],
        },
      }),
      new Chart(host(), {
        type: donut,
        locale: 'en-US',
        title: 'Traffic sources',
        valueLabels: true,
        data: [
          { name: 'Search', value: 42 },
          { name: 'Direct', value: 27 },
          { name: 'Social', value: 16 },
          { name: 'Email', value: 9 },
          { name: 'Other', value: 6 },
        ],
      }),
    ]
    let points: 'last' | 'all' = 'last'
    let on = true
    const apply = () => {
      for (const chart of charts) chart.update({ valueLabels: on && { points } })
    }
    controls.select('Labels', ['on', 'off'] as const, 'on', (value) => {
      on = value === 'on'
      apply()
    })
    controls.select('Line points', ['last', 'all'] as const, 'last', (value) => {
      points = value
      apply()
    })
  },
}
