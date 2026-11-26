import { sankey } from '@tabler/charts'
import { definePage } from '../page.ts'

export default definePage({
  title: 'Budget flow',
  subtitle: 'From sources of income to the budget, in millions',
  width: 720,
  config: {
    type: sankey,
    data: {
      links: [
        { from: 'Income tax', to: 'Own income', value: 53.7 },
        { from: 'Local taxes', to: 'Own income', value: 13.4 },
        { from: 'Grants', to: 'Transfers', value: 23 },
        { from: 'Own income', to: 'Current income', value: 67.1 },
        { from: 'Transfers', to: 'Current income', value: 20 },
        { from: 'Transfers', to: 'Capital income', value: 3 },
      ],
    },
    format: { style: 'currency', currency: 'USD', notation: 'compact' },
    nodeWidth: 12,
    nodePadding: 16,
    aspectRatio: 2,
  },
})
