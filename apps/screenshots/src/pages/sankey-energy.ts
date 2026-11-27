import { energy } from '../../../docs/src/showcase/energy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(energy, 'US energy flows', {
  title: 'Where America’s energy goes',
  subtitle: 'Primary energy by source and the sectors that use it, in quads',
  width: 800,
  config: { aspectRatio: 1.9, legend: false, nodeWidth: 10 },
})
