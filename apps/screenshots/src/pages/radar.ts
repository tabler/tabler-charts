import { radar } from '@tabler/charts'
import { definePage } from '../page.ts'

export default definePage({
  title: 'Plan comparison',
  subtitle: 'Feature scores, 0–100',
  width: 480,
  config: {
    type: radar,
    data: {
      labels: ['Support', 'Security', 'Speed', 'Storage', 'Integrations', 'Price'],
      series: [
        { name: 'Pro', values: [70, 65, 80, 60, 75, 85] },
        { name: 'Enterprise', values: [95, 90, 85, 90, 80, 55] },
      ],
    },
    r: { max: 100 },
  },
})
