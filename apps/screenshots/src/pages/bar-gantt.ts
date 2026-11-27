import { bar } from '@tabler/charts'
import { C, definePage } from '../page.ts'

// A project plan from stacked horizontal bars: an unseen series moves each
// task to its first week.
const TASKS: [name: string, start: number, done: number, left: number][] = [
  ['Research', 0, 3, 0],
  ['Design', 2, 4, 0],
  ['Prototype', 5, 3, 0],
  ['Build', 7, 3, 4],
  ['Testing', 12, 0, 3],
  ['Launch', 15, 0, 1],
]
const column = (index: 1 | 2 | 3) => TASKS.map((task) => task[index] || null)

export default definePage({
  title: 'Mobile app, release plan',
  subtitle: 'Sixteen weeks: done in teal, still ahead in gray',
  config: {
    type: bar,
    orientation: 'horizontal',
    data: {
      labels: TASKS.map(([name]) => name),
      series: [
        { name: 'Offset', values: column(1), color: 'transparent' },
        { name: 'Done', values: column(2), color: C.teal },
        { name: 'Ahead', values: column(3), color: C.slate },
      ],
    },
    stacked: true,
    legend: false,
    tooltip: false,
    y: { min: 0, max: 16, ticks: 8, format: (week: number) => (week < 16 ? `W${week + 1}` : '') },
    annotations: [{ y: 10, label: 'Today', color: C.coral }],
    radius: 4,
    aspectRatio: 2,
  },
})
