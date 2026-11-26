import { science } from '../../../docs/src/showcase/science.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(science, 'Orbital launch attempts', {
  title: 'Orbital launch attempts',
  subtitle: 'Rockets launched toward orbit per year',
  config: { radius: 3 },
})
