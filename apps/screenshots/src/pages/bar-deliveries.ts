import { business } from '../../../docs/src/showcase/business.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(business, 'Tesla deliveries', {
  title: 'Tesla deliveries',
  subtitle: 'Vehicles delivered per year; 2024 was the first decline',
  config: { radius: 4 },
})
