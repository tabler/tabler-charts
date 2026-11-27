import { bar } from '@tabler/charts'
import { C, definePage, MONTHS } from '../page.ts'

// Patterns on top of the colors: the series stay apart in a grayscale print
// and for readers who do not tell the colors apart.
export default definePage({
  title: 'Tickets by priority',
  subtitle: 'Every series has a pattern as well as a color',
  config: {
    type: bar,
    data: {
      labels: MONTHS.slice(0, 8),
      series: [
        { name: 'Low', values: [84, 92, 78, 101, 96, 88, 110, 104], color: C.teal },
        { name: 'Normal', values: [61, 58, 70, 66, 74, 69, 81, 77], color: C.blue },
        { name: 'High', values: [28, 31, 25, 36, 33, 41, 38, 44], color: C.amber },
        { name: 'Urgent', values: [9, 12, 8, 14, 11, 17, 13, 19], color: C.coral },
      ],
    },
    stacked: true,
    patterns: true,
    radius: 3,
    aspectRatio: 1.9,
  },
})
