import { climate } from '../../../docs/src/showcase/climate.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(climate, 'Sea level rise', {
  title: 'Sea level rise',
  subtitle: 'Global mean sea level relative to 1993, in millimetres',
  config: { fill: 'gradient', points: 'last' },
})
