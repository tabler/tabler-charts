import { line } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'The cost of a gigabyte',
  subtitle: 'Hard drive storage, USD per GB on a logarithmic scale',
  source: 'Historical price surveys (mkomo.com, Backblaze), 1980–2024',
  config: {
    type: line,
    data: {
      labels: ['1980', '1985', '1990', '1995', '2000', '2005', '2010', '2015', '2020', '2024'],
      series: [
        {
          name: 'USD per GB',
          values: [437_500, 100_000, 9_000, 1_000, 10, 0.9, 0.09, 0.03, 0.02, 0.012],
        },
      ],
    },
    points: 'all',
    y: {
      scale: 'log',
      format: {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 3,
      },
    },
    aspectRatio: 2,
  },
  style: { '--tc-color-1': C.violet },
})
