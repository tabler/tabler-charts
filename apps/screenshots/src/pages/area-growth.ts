import { business } from '../../../docs/src/showcase/business.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(business, 'Netflix paid memberships', {
  title: 'Netflix paid memberships',
  subtitle: 'Subscribers at year end, in millions',
  style: { '--tc-color-1': 'var(--c-red)' },
})
