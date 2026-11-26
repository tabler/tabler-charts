import { climate } from '../../../docs/src/showcase/climate.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(climate, 'CO₂ emissions per person', {
  title: 'CO₂ emissions per person',
  subtitle: 'Fossil emissions per capita in tonnes, with the world average',
  width: 560,
  config: { aspectRatio: 1.4, radius: 3 },
})
