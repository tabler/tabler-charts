import { heatmap } from '@tabler/charts'
import { C, definePage, MONTHS } from '../page.ts'

export default definePage({
  title: 'A year of weather in eight cities',
  subtitle: 'Average daily high by month',
  source: 'WMO climate normals, 1991–2020',
  width: 720,
  config: {
    type: heatmap,
    data: {
      labels: MONTHS,
      series: [
        { name: 'Reykjavík', values: [3, 3, 4, 6, 10, 12, 14, 14, 11, 7, 4, 3] },
        { name: 'Warsaw', values: [1, 2, 7, 14, 20, 22, 25, 24, 19, 13, 6, 2] },
        { name: 'New York', values: [4, 6, 10, 17, 22, 27, 30, 29, 25, 18, 12, 7] },
        { name: 'Tokyo', values: [10, 11, 14, 19, 23, 26, 30, 31, 27, 22, 17, 12] },
        { name: 'Lisbon', values: [15, 16, 19, 20, 22, 26, 28, 29, 27, 23, 18, 15] },
        { name: 'Sydney', values: [26, 26, 25, 23, 20, 17, 17, 18, 20, 22, 24, 25] },
        { name: 'Singapore', values: [30, 31, 32, 32, 32, 31, 31, 31, 31, 31, 30, 30] },
        { name: 'Dubai', values: [24, 25, 29, 33, 38, 40, 41, 42, 39, 35, 30, 26] },
      ],
    },
    min: 0,
    max: 42,
    colors: [C.blue, C.grid, C.amber, C.coral],
    format: { style: 'unit', unit: 'celsius' },
    gap: 3,
    radius: 4,
    aspectRatio: 2.2,
  },
})
