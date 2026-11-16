import { Chart, type SankeyData, sankey } from '@tabler/charts'
import type { Demo } from '../demo.ts'

const MLN = 1_000_000

/** A city budget: sources of income, grouped, then split into current and property income. */
const BUDGET: SankeyData = {
  nodes: [
    { name: 'Dochody własne', color: '#206bc4' },
    { name: 'Transfery z państwa', color: '#2fb344' },
    { name: 'Środki UE / inne', color: '#f59f00' },
  ],
  links: [
    { from: 'PIT (udział)', to: 'Dochody własne', value: 53.7 * MLN },
    { from: 'Podatki lokalne', to: 'Dochody własne', value: 13.42 * MLN },
    { from: 'Opłaty i dochody z majątku', to: 'Dochody własne', value: 7.05 * MLN },
    { from: 'Subwencja ogólna', to: 'Transfery z państwa', value: 11.64 * MLN },
    { from: 'Dotacje celowe', to: 'Transfery z państwa', value: 11.38 * MLN },
    { from: 'Inne', to: 'Środki UE / inne', value: 7.82 * MLN },
    { from: 'Dochody własne', to: 'Dochody bieżące', value: 74.17 * MLN },
    { from: 'Transfery z państwa', to: 'Dochody bieżące', value: 23.02 * MLN },
    { from: 'Środki UE / inne', to: 'Dochody bieżące', value: 1.88 * MLN },
    { from: 'Środki UE / inne', to: 'Dochody majątkowe', value: 5.94 * MLN },
  ],
}

/** Where the time of a week goes: a simpler, English flow. */
const WEEK: SankeyData = {
  links: [
    { from: 'Weekdays', to: 'Work', value: 40 },
    { from: 'Weekdays', to: 'Sleep', value: 38 },
    { from: 'Weekdays', to: 'Free time', value: 42 },
    { from: 'Weekend', to: 'Sleep', value: 18 },
    { from: 'Weekend', to: 'Free time', value: 30 },
    { from: 'Free time', to: 'Family', value: 36 },
    { from: 'Free time', to: 'Sport', value: 14 },
    { from: 'Free time', to: 'Reading', value: 22 },
  ],
}

export const sankeyDemo: Demo = {
  id: 'sankey',
  title: 'Sankey diagram',
  description:
    'Flows between nodes as ribbons as wide as their value: nodes come from the links and sit in columns by the longest path from a source, with their name and total next to them. Nodes with a color make the legend, which toggles everything of that color; hovering a ribbon or a node shows its flows.',
  mount(el, controls) {
    let data: SankeyData = BUDGET
    const chart = new Chart(el, {
      type: sankey,
      data,
      locale: 'pl-PL',
      format: {
        style: 'currency',
        currency: 'PLN',
        notation: 'compact',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      aspectRatio: 1.9,
      title: 'Dochody budżetu miasta',
    })

    controls.select('Data', ['budget', 'week'] as const, 'budget', (value) => {
      data = value === 'budget' ? BUDGET : WEEK
      chart.update(
        value === 'budget'
          ? {
              data,
              locale: 'pl-PL',
              title: 'Dochody budżetu miasta',
              format: {
                style: 'currency',
                currency: 'PLN',
                notation: 'compact',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            }
          : {
              data,
              locale: 'en-US',
              title: 'Hours of a week',
              format: { style: 'unit', unit: 'hour' },
            },
      )
    })
    controls.select('Align', ['justify', 'left'] as const, 'justify', (align) =>
      chart.update({ align }),
    )
    controls.range('Node width', { min: 4, max: 40, step: 1, value: 12 }, (nodeWidth) =>
      chart.update({ nodeWidth }),
    )
    controls.range('Node padding', { min: 0, max: 40, step: 1, value: 16 }, (nodePadding) =>
      chart.update({ nodePadding }),
    )
  },
}
