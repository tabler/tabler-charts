import { energy } from '../../../docs/src/showcase/energy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(energy, 'Nuclear share of electricity', {
  title: 'Nuclear share of electricity',
  subtitle: 'Electricity from nuclear plants by country, 2023',
  width: 720,
  config: { radius: 4 },
})
