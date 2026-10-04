import { area, bar, Chart, line } from '@tabler/charts'
import type { Demo } from '../demo.ts'

export const syncDemo: Demo = {
  id: 'sync',
  title: 'Synced hover',
  description:
    'Charts with the same sync group share the hover: the day under the pointer is highlighted in all of them, with its tooltip, and they clear together. Categories are matched by label, so the charts need not have the same data.',
  mount(el) {
    el.classList.add('demo-trio')
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const host = () => {
      const div = document.createElement('div')
      el.append(div)
      return div
    }
    new Chart(host(), {
      type: line,
      locale: 'en-US',
      title: 'Visitors',
      sync: 'week',
      data: {
        labels: days,
        series: [{ name: 'Visitors', values: [820, 932, 901, 934, 1290, 1330, 1320] }],
      },
    })
    new Chart(host(), {
      type: bar,
      locale: 'en-US',
      title: 'Sign-ups',
      sync: 'week',
      data: { labels: days, series: [{ name: 'Sign-ups', values: [42, 51, 47, 63, 78, 71, 66] }] },
    })
    new Chart(host(), {
      type: area,
      locale: 'en-US',
      title: 'Revenue',
      sync: 'week',
      y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
      data: {
        labels: days,
        series: [{ name: 'Revenue', values: [4200, 5100, 4700, 6300, 7800, 7100, 6600] }],
      },
    })
  },
}
