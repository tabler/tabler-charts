import { bar } from '@tabler/charts'
import { C, definePage } from '../page.ts'

// A waterfall from a stacked bar chart: an unseen series lifts each step to
// where the one before it ended. A made-up company, in millions of dollars.
const STEPS = ['Revenue', 'Cost of goods', 'Operations', 'R&D', 'Taxes', 'Net profit']
const usd = (value: number) => `$${value}M`

export default definePage({
  title: 'From revenue to profit',
  subtitle: 'Fiscal year 2025, millions of dollars',
  config: {
    type: bar,
    data: {
      labels: STEPS,
      series: [
        {
          name: 'Offset',
          values: [null, 260, 170, 110, 80, null],
          color: 'transparent',
          valueLabels: false,
        },
        { name: 'Total', values: [420, null, null, null, null, 80], color: C.blue },
        { name: 'Cost', values: [null, 160, 90, 60, 30, null], color: C.coral },
      ],
    },
    stacked: true,
    legend: false,
    tooltip: false,
    valueLabels: { format: usd },
    y: { format: usd },
    radius: 3,
    maxBarWidth: 56,
    aspectRatio: 1.9,
  },
})
