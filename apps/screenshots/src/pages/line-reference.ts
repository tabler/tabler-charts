import { society } from '../../../docs/src/showcase/society.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(society, 'Fertility rate', {
  title: 'Fertility rate',
  subtitle: 'Children per woman, against the replacement level of 2.1',
  config: { curve: 'monotone' },
})
