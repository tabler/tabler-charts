import { culture } from '../../../docs/src/showcase/culture.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(culture, 'Eurovision wins', {
  title: 'Eurovision wins',
  subtitle: 'Countries with three or more victories',
  width: 720,
  config: { radius: 4 },
})
