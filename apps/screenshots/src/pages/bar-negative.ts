import { economy } from '../../../docs/src/showcase/economy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(economy, 'S&P 500 annual returns', {
  title: 'S&P 500 annual returns',
  subtitle: 'Price return per calendar year; losses grow down from zero',
  config: { radius: 3 },
})
