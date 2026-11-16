import { Chart, sankey } from '@tabler/charts'
import '@tabler/charts/style.css'

new Chart('#chart', {
  type: sankey,
  data: {
    // Optional: nodes with a color (and their order in a column); the rest come from the links.
    nodes: [{ name: 'Own income', color: '#206bc4' }],
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
  nodeWidth: 12, // bar width in pixels
  nodePadding: 16, // gap between the nodes of a column
  align: 'justify', // or 'left': sinks stay in the column after their sources
  locale: 'en-US',
})
