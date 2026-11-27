import { business } from '../../../docs/src/showcase/business.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(business, 'Starbucks stores worldwide', {
  title: 'Starbucks stores worldwide',
  subtitle: 'Store count at fiscal year end',
  config: { points: 'all' },
  style: { '--tc-color-1': 'var(--c-green)' },
})
