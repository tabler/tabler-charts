import { business } from '../../../docs/src/showcase/business.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(business, 'Amazon net sales by segment', {
  title: 'Amazon net sales by segment',
  subtitle: 'Quarterly sales in 2024, stacked by segment',
  config: { radius: 3 },
})
