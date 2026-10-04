import { area, Chart } from '@tabler/charts'
import '@tabler/charts/style.css'

new Chart('#chart', {
  type: area,
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    series: [
      { name: 'Organic', values: [420, 510, 470, 630, 580, 710, 690] },
      { name: 'Paid', values: [210, 260, 240, 300, 330, 280, 260] },
    ],
  },
  stacked: true, // or 'percent' for 100%
  fill: 'solid', // or 'gradient'
  curve: 'monotone',
  locale: 'en-US',
})
