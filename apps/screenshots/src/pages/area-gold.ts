import { economy } from '../../../docs/src/showcase/economy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(economy, 'Gold price', {
  title: 'Gold price',
  subtitle: 'Yearly average, USD per troy ounce',
  config: { points: 'last', valueLabels: true },
})
