import { health } from '../../../docs/src/showcase/health.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(health, 'Blood types', {
  title: 'Blood types',
  subtitle: 'ABO and Rh types in the US population',
  width: 560,
  config: { aspectRatio: 1.7, gap: 3, cornerRadius: 6 },
})
