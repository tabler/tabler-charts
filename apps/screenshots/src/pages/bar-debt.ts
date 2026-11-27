import { economy } from '../../../docs/src/showcase/economy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(economy, 'Public debt to GDP', {
  title: 'Public debt to GDP',
  subtitle: 'General government gross debt as a share of GDP',
  width: 560,
  config: { aspectRatio: 1.4, radius: 3 },
})
