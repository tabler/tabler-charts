import { bar, Chart } from '@tabler/charts'
import '@tabler/charts/style.css'

new Chart('#revenue', {
  type: bar,
  data: {
    labels: ['Jan', 'Feb', 'Mar'],
    series: [{ name: 'Revenue', values: [850_000, 1_100_000, 1_480_000] }],
  },
  y: { format: { notation: 'compact' } }, // 1M, 1.1M; 1 mln, 1,1 mln with locale: 'pl-PL'
  valueLabels: true, // tooltips and labels keep three digits: 1.48M
  locale: 'en-US',
})
