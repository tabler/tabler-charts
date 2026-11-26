import { climate } from '../../../docs/src/showcase/climate.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(climate, 'Atmospheric CO₂', {
  title: 'Atmospheric CO₂',
  subtitle: 'Annual mean at Mauna Loa, parts per million',
  config: { fill: 'gradient', points: 'last' },
})
