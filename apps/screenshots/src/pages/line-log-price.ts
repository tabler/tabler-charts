import { economy } from '../../../docs/src/showcase/economy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(economy, 'Bitcoin, year-end price', {
  title: 'Bitcoin at year end',
  subtitle: 'Price in USD on a logarithmic scale',
  config: { points: 'all' },
})
