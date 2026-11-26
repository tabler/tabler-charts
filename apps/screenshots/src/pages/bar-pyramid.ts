import { bar } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'Japan’s population pyramid',
  subtitle: 'People by age group, in millions',
  source: 'Statistics Bureau of Japan, 2023 estimate',
  width: 560,
  config: {
    type: bar,
    orientation: 'horizontal',
    stacked: true,
    maxBarWidth: 18,
    radius: 3,
    data: {
      labels: [
        '90+',
        '80–89',
        '70–79',
        '60–69',
        '50–59',
        '40–49',
        '30–39',
        '20–29',
        '10–19',
        '0–9',
      ],
      series: [
        {
          name: 'Men',
          values: [-0.6, -3.8, -7.0, -7.3, -8.4, -8.6, -6.6, -6.3, -5.4, -4.4],
          color: C.blue,
        },
        {
          name: 'Women',
          values: [2.0, 6.0, 8.2, 7.6, 8.4, 8.4, 6.4, 6.0, 5.1, 4.2],
          color: C.rose,
        },
      ],
    },
    y: { format: (v: number) => `${Math.abs(v)}M` },
    aspectRatio: 1.4,
  },
})
