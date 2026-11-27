import { economy } from '../../../docs/src/showcase/economy.ts'
import { EU_BALANCE } from '../../../docs/src/showcase/poland.ts'
import { C } from '../page.ts'
import { fromShowcase } from '../showcase.ts'

/** The frame holds fourteen rows with every name: the seven largest beneficiaries and payers. */
const rows = [...EU_BALANCE.slice(0, 7), ...EU_BALANCE.slice(-7)]

export default fromShowcase(economy, 'Poland is the largest net beneficiary of the EU budget', {
  title: 'Net balance with the EU budget',
  subtitle: 'The seven largest net beneficiaries and payers, EUR billion, 2004–2025',
  width: 640,
  config: {
    aspectRatio: 1.5,
    data: {
      labels: rows.map(([name]) => name),
      series: [
        {
          name: 'Poland',
          color: 'var(--c-red)',
          values: rows.map(([name, v]) => (name === 'Poland' ? v : null)),
          valueLabels: true,
        },
        {
          name: 'Net beneficiaries',
          color: 'var(--tc-baseline-color)',
          values: rows.map(([name, v]) => (name !== 'Poland' && v > 0 ? v : null)),
        },
        {
          name: 'Net payers',
          color: C.slate,
          values: rows.map(([, v]) => (v < 0 ? v : null)),
        },
      ],
    },
  },
})
