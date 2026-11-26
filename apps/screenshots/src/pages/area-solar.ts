import { energy } from '../../../docs/src/showcase/energy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(energy, 'Solar capacity installed', {
  title: 'Solar capacity installed',
  subtitle: 'Cumulative photovoltaic capacity worldwide',
  config: { fill: 'gradient', points: 'last' },
})
