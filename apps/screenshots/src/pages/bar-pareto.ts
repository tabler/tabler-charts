import { bar } from '@tabler/charts'
import { C, definePage } from '../page.ts'

// A Pareto chart of a made-up help desk: causes sorted by count, and the
// running share of all tickets on the second axis.
const CAUSES: [string, number][] = [
  ['Login', 412],
  ['Billing', 286],
  ['Shipping', 174],
  ['App crash', 96],
  ['Returns', 61],
  ['Account', 38],
  ['Other', 27],
]
const total = CAUSES.reduce((sum, [, count]) => sum + count, 0)
let running = 0
const cumulative = CAUSES.map(([, count]) => {
  running += count
  return Math.round((running / total) * 1000) / 10
})

export default definePage({
  title: 'Where support tickets come from',
  subtitle: `${total.toLocaleString('en-US')} tickets last quarter: three causes make up 80% of them`,
  config: {
    type: bar,
    data: {
      labels: CAUSES.map(([name]) => name),
      series: [
        { name: 'Tickets', values: CAUSES.map(([, count]) => count), color: C.blue },
        {
          name: 'Cumulative share',
          values: cumulative,
          type: 'line',
          axis: 'y2',
          color: C.amber,
        },
      ],
    },
    // The two axes share their grid: the top of the left one is every ticket, 100% on the right.
    y: { max: total, nice: false, ticks: 5 },
    y2: { min: 0, max: 100, nice: false, format: (value: number) => `${value}%` },
    annotations: [{ y: total * 0.8, label: '80% of tickets', color: C.amber }],
    curve: 'linear',
    points: 'all',
    radius: 3,
    aspectRatio: 1.9,
  },
})
