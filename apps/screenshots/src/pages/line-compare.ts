import { economy } from '../../../docs/src/showcase/economy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(economy, 'Unemployment rate', {
  title: 'Unemployment rate',
  subtitle: 'Annual average, four economies',
  config: { curve: 'monotone', points: 'last' },
})
