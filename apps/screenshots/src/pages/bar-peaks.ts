import { science } from '../../../docs/src/showcase/science.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(science, 'The 8,000-metre peaks', {
  title: 'The 8,000-metre peaks',
  subtitle: 'The ten highest mountains; the axis starts at 7,500 m',
  width: 560,
  config: { aspectRatio: 1.4, radius: 3 },
})
