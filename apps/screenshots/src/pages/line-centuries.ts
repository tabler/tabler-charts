import { economy } from '../../../docs/src/showcase/economy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(economy, 'Five centuries of GDP per capita', {
  subtitle: 'International dollars at purchasing power parity, 1500–2008',
  width: 760,
  colors: { '#a8283a': 'var(--c-red)', '#d9a441': 'var(--c-amber)' },
})
