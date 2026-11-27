import { bar } from '@tabler/charts'
import { C, definePage } from '../page.ts'

// A made-up staff survey as a diverging stack: disagreement runs left of
// zero, agreement right of it. The rest of each row answered "neutral".
const STATEMENTS: [string, number, number, number, number][] = [
  ['I know what is expected of me', 3, 8, 46, 35],
  ['My manager gives useful feedback', 6, 14, 41, 24],
  ['I can grow in this company', 11, 21, 33, 15],
  ['My workload is manageable', 14, 27, 31, 9],
  ['Pay is fair for the work', 19, 30, 24, 7],
]
const column = (index: 1 | 2 | 3 | 4, sign: 1 | -1) => STATEMENTS.map((row) => sign * row[index])

export default definePage({
  title: 'What the team thinks',
  subtitle: 'Share of answers to the yearly staff survey, 2025',
  width: 760,
  config: {
    type: bar,
    orientation: 'horizontal',
    data: {
      labels: STATEMENTS.map(([statement]) => statement),
      series: [
        { name: 'Disagree', values: column(2, -1), color: C.amber },
        { name: 'Strongly disagree', values: column(1, -1), color: C.coral },
        { name: 'Agree', values: column(3, 1), color: C.teal },
        { name: 'Strongly agree', values: column(4, 1), color: C.blue },
      ],
    },
    stacked: true,
    y: { min: -60, max: 100, format: (value: number) => `${Math.abs(value)}%` },
    annotations: [{ y: 0 }],
    radius: 3,
    aspectRatio: 2.2,
  },
})
