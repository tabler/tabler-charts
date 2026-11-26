import { climate } from '../../../docs/src/showcase/climate.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(climate, 'Global temperature anomaly', {
  title: 'Global temperature anomaly',
  subtitle: 'Difference from the 1951–1980 mean',
})
