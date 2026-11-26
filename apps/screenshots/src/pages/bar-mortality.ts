import { health } from '../../../docs/src/showcase/health.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(health, 'Child mortality', {
  title: 'Child mortality, more than halved',
  subtitle: 'Deaths under age five per 1,000 live births, worldwide',
  config: { radius: 4 },
})
