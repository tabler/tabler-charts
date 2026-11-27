import { economy } from '../../../docs/src/showcase/economy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(
  economy,
  'Polish labour productivity is a fifth below the OECD average',
  {
    title: 'Labour productivity in the OECD',
    subtitle: 'GDP per hour worked, USD at purchasing power parity',
    width: 840,
    config: { aspectRatio: 1.8 },
    colors: { '#a8283a': 'var(--c-red)', '#ccd1d7': 'var(--tc-baseline-color)' },
  },
)
