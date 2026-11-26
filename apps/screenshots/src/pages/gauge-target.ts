import { energy } from '../../../docs/src/showcase/energy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(energy, 'EU renewable energy target', {
  title: 'EU renewable energy target',
  subtitle: 'Renewables in final energy use, 2023',
  width: 460,
  config: { aspectRatio: 1.6, thickness: 14, cornerRadius: 7 },
})
