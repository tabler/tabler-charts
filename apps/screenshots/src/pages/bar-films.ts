import { culture } from '../../../docs/src/showcase/culture.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(culture, 'Highest-grossing films', {
  title: 'Highest-grossing films',
  subtitle: 'Worldwide box office, not adjusted for inflation',
  width: 560,
  config: { aspectRatio: 1.4, radius: 3 },
})
