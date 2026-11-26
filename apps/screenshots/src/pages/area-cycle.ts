import { science } from '../../../docs/src/showcase/science.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(science, 'Sunspot cycle', {
  title: 'The eleven-year sunspot cycle',
  subtitle: 'Yearly mean sunspot number, solar cycles 23 to 25',
  width: 720,
  config: { aspectRatio: 2.2 },
})
