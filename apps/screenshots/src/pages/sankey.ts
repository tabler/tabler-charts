import { sankey } from '@tabler/charts'
import { C, definePage } from '../page.ts'

const LINKS: [string, string, number][] = [
  ['Google Search', 'Revenue', 198.1],
  ['YouTube ads', 'Revenue', 36.1],
  ['Google Network', 'Revenue', 30.4],
  ['Subscriptions & devices', 'Revenue', 40.3],
  ['Google Cloud', 'Revenue', 43.2],
  ['Other Bets', 'Revenue', 1.6],
  ['Revenue', 'Cost of revenue', 146.3],
  ['Revenue', 'R&D', 49.3],
  ['Revenue', 'Sales & marketing', 27.8],
  ['Revenue', 'General & admin', 14.2],
  ['Revenue', 'Operating income', 112.4],
]

export default definePage({
  title: 'How Alphabet makes its money',
  subtitle: 'Revenue by source, and where it goes',
  source: 'Alphabet Form 10-K, 2024',
  width: 800,
  config: {
    type: sankey,
    data: {
      nodes: [
        { name: 'Google Search', color: C.blue },
        { name: 'YouTube ads', color: C.coral },
        { name: 'Google Network', color: C.violet },
        { name: 'Subscriptions & devices', color: C.rose },
        { name: 'Google Cloud', color: C.teal },
        { name: 'Other Bets', color: C.slate },
        { name: 'Revenue', color: C.slate },
        { name: 'Cost of revenue', color: C.coral },
        { name: 'R&D', color: C.amber },
        { name: 'Sales & marketing', color: C.amber },
        { name: 'General & admin', color: C.amber },
        { name: 'Operating income', color: C.green },
      ],
      links: LINKS.map(([from, to, value]) => ({ from, to, value: value * 1e9 })),
    },
    format: { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 },
    legend: false,
    nodeWidth: 10,
    nodePadding: 14,
    padding: { top: 8, right: 8, bottom: 8, left: 8 },
    aspectRatio: 1.9,
  },
})
