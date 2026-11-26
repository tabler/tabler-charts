import { health } from '../../../docs/src/showcase/health.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(health, 'Smoking in the United States', {
  title: 'Smoking in the United States',
  subtitle: 'Share of adults who smoke cigarettes',
  config: { points: 'all' },
  style: { '--tc-color-1': 'var(--c-ink)' },
})
