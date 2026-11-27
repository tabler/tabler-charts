import { technology } from '../../../docs/src/showcase/technology.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(technology, 'Internet users', {
  title: 'Internet users',
  subtitle: 'People online worldwide, in billions',
  config: { points: 'last' },
})
