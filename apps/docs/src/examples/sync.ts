import { bar, Chart, line } from '@tabler/charts'
import '@tabler/charts/style.css'

const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Charts with the same sync group share the hover, matched by label.
new Chart('#visitors', {
  type: line,
  sync: 'week',
  data: { labels, series: [{ name: 'Visitors', values: [820, 932, 901, 934, 1290, 1330, 1320] }] },
})
new Chart('#signups', {
  type: bar,
  sync: 'week',
  data: { labels, series: [{ name: 'Sign-ups', values: [42, 51, 47, 63, 78, 71, 66] }] },
})
