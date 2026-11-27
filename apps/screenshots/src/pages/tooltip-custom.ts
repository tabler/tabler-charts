import { bar, h } from '@tabler/charts'
import { C, definePage } from '../page.ts'

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

// A tooltip written by the page: each plan with its share of the quarter, and the total below.
export default definePage({
  title: 'Recurring revenue by plan',
  subtitle: 'A custom tooltip: the share of every plan, and the quarter’s total',
  hover: { x: 0.69, y: 0.42 },
  config: {
    type: bar,
    data: {
      labels: ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026'],
      series: [
        { name: 'Starter', values: [48, 53, 57, 61, 66, 70], color: C.teal },
        { name: 'Team', values: [112, 126, 141, 163, 180, 204], color: C.blue },
        { name: 'Enterprise', values: [64, 71, 92, 118, 139, 171], color: C.violet },
      ].map((series) => ({ ...series, values: series.values.map((value) => value * 1000) })),
    },
    stacked: true,
    y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
    tooltip: {
      format: (hit: { title: string; items: { name: string; value: number | null }[] }) => {
        const total = hit.items.reduce((sum, item) => sum + (item.value ?? 0), 0)
        const row = { display: 'flex', gap: '20px', justifyContent: 'space-between' }
        return [
          h('div', { class: 'tc-tooltip-title' }, hit.title),
          hit.items.map((item) =>
            h(
              'div',
              { style: row },
              h('span', null, item.name),
              h(
                'span',
                null,
                `${usd.format(item.value ?? 0)} · ${Math.round(((item.value ?? 0) / total) * 100)}%`,
              ),
            ),
          ),
          h(
            'div',
            { class: 'tc-tooltip-footer', style: row },
            h('span', null, 'Total'),
            h('span', null, usd.format(total)),
          ),
        ]
      },
    },
    radius: 3,
    aspectRatio: 1.9,
  },
})
