import { economy } from '../../../docs/src/showcase/economy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(economy, 'Financial assets of Polish households pass PLN 4 trillion', {
  title: 'Financial assets of Polish households',
  subtitle: 'PLN trillion, quarterly, Q1 2005 – Q1 2026',
  width: 720,
  colors: { '#a8283a': 'var(--c-red)' },
})
