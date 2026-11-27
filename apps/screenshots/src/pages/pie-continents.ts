import { society } from '../../../docs/src/showcase/society.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(society, 'Population by continent', {
  title: 'Population by continent',
  subtitle: 'Mid-2024 population, in billions',
  width: 560,
  config: { aspectRatio: 1.7, gap: 3, cornerRadius: 6 },
})
