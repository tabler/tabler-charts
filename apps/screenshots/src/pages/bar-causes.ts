import { health } from '../../../docs/src/showcase/health.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(health, 'Leading causes of death', {
  title: 'Leading causes of death',
  subtitle: 'Deaths worldwide in 2021, in millions',
  width: 560,
  config: { aspectRatio: 1.4, radius: 3 },
})
