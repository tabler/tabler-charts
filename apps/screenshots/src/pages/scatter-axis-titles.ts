import { society } from '../../../docs/src/showcase/society.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(society, 'Median age vs. fertility', {
  title: 'Median age and fertility',
  subtitle: 'A bubble per country, as large as its population',
  width: 720,
  config: {
    aspectRatio: 2,
    x: { min: 10, max: 55, title: 'Median age, years' },
    y: { min: 0, max: 8, title: 'Births per woman' },
  },
})
