import { bar } from '@tabler/charts'
import { definePage } from '../page.ts'

export default definePage({
  title: 'Paris 2024 medal table',
  subtitle: 'Gold, silver and bronze, the ten best teams by golds',
  source: 'International Olympic Committee, 2024',
  config: {
    type: bar,
    orientation: 'horizontal',
    stacked: true,
    maxBarWidth: 14,
    radius: 3,
    data: {
      labels: [
        'United States',
        'China',
        'Japan',
        'Australia',
        'France',
        'Netherlands',
        'Great Britain',
        'South Korea',
        'Italy',
        'Germany',
      ],
      series: [
        { name: 'Gold', values: [40, 40, 20, 18, 16, 15, 14, 13, 12, 12], color: '#d9b25a' },
        { name: 'Silver', values: [44, 27, 12, 19, 26, 7, 22, 9, 13, 13], color: '#aab3c0' },
        { name: 'Bronze', values: [42, 24, 13, 16, 22, 12, 29, 10, 15, 8], color: '#bd8f6c' },
      ],
    },
    aspectRatio: 1.7,
  },
})
