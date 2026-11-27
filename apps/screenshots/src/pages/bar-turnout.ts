import { politics } from '../../../docs/src/showcase/politics.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(politics, 'Turnout in Polish parliamentary elections', {
  title: 'Turnout in Polish parliamentary elections',
  subtitle: 'Share of eligible voters who voted, 1991 to the record of 2023',
  config: { radius: 4 },
})
