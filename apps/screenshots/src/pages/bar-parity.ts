import { politics } from '../../../docs/src/showcase/politics.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(politics, 'Women in parliament', {
  title: 'Women in parliament',
  subtitle: 'Share of seats in the lower or single house, 2024',
  width: 560,
  config: { aspectRatio: 1.4, radius: 3 },
})
