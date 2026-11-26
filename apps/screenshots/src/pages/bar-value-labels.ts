import { bar } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'Nvidia revenue',
  subtitle: 'By fiscal year: the AI boom in two bars',
  source: 'Nvidia annual reports, FY2015–FY2025',
  config: {
    type: bar,
    data: {
      labels: Array.from({ length: 11 }, (_, i) => `FY${15 + i}`),
      series: [
        {
          name: 'Revenue',
          values: [4.68, 5.01, 6.91, 9.71, 11.72, 10.92, 16.68, 26.91, 26.97, 60.92, 130.5].map(
            (billions) => billions * 1e9,
          ),
        },
      ],
    },
    radius: 4,
    valueLabels: true,
    y: {
      format: {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 0,
      },
    },
    aspectRatio: 2,
  },
  style: { '--tc-color-1': C.green },
})
