import { treemap } from '@tabler/charts'
import { definePage } from '../page.ts'

const economies = (list: [string, number][]) =>
  list.map(([name, trillions]) => ({ name, value: trillions * 1e12 }))

export default definePage({
  title: 'The fifteen largest economies',
  subtitle: 'Nominal GDP, by region',
  source: 'IMF World Economic Outlook, 2023',
  width: 720,
  config: {
    type: treemap,
    data: [
      {
        name: 'Americas',
        children: economies([
          ['United States', 27.4],
          ['Brazil', 2.2],
          ['Canada', 2.1],
          ['Mexico', 1.8],
        ]),
      },
      {
        name: 'Asia & Pacific',
        children: economies([
          ['China', 17.8],
          ['Japan', 4.2],
          ['India', 3.6],
          ['S. Korea', 1.7],
          ['Australia', 1.7],
        ]),
      },
      {
        name: 'Europe',
        children: economies([
          ['Germany', 4.5],
          ['UK', 3.4],
          ['France', 3.0],
          ['Italy', 2.3],
          ['Russia', 2.0],
          ['Spain', 1.6],
        ]),
      },
    ],
    format: { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 },
    gap: 3,
    radius: 4,
    aspectRatio: 2,
  },
})
