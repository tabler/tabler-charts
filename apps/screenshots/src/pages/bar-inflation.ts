import { economy } from '../../../docs/src/showcase/economy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(economy, 'Monthly inflation, euro area vs. Poland', {
  title: 'Inflation: euro area and Poland',
  subtitle: 'Harmonised consumer prices by month, change on the year before',
  config: { radius: 3 },
})
