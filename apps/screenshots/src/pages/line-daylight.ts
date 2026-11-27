import { climate } from '../../../docs/src/showcase/climate.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(climate, 'Hours of daylight', {
  title: 'Hours of daylight',
  subtitle: 'Day length through the year at three latitudes',
  config: { curve: 'monotone' },
})
