import { energy } from '../../../docs/src/showcase/energy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(energy, 'Electric cars in new sales', {
  title: 'Electric cars in new sales',
  subtitle: 'Battery and plug-in hybrid share of new cars, 2023',
  width: 560,
  config: { aspectRatio: 1.4, radius: 3 },
})
