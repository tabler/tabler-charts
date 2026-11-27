import { line } from '@tabler/charts'
import { C, definePage } from '../page.ts'

// The table every chart keeps for screen readers, shown under the chart.
export default definePage({
  title: 'Subscribers by plan',
  subtitle: 'The chart and its data table, side by side for every reader',
  config: {
    type: line,
    data: {
      labels: ['2021', '2022', '2023', '2024', '2025'],
      series: [
        { name: 'Free', values: [1890, 2610, 3180, 3720, 4150], color: C.slate },
        { name: 'Team', values: [520, 870, 1260, 1710, 2240], color: C.blue },
        { name: 'Business', values: [96, 188, 342, 561, 824], color: C.teal },
      ],
    },
    table: 'visible',
    points: 'all',
    curve: 'linear',
    aspectRatio: 3,
  },
})
