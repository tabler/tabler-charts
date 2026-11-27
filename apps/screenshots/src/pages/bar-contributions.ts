import { economy } from '../../../docs/src/showcase/economy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(economy, 'What drives Polish GDP growth', {
  subtitle: 'Contributions to annual GDP growth, percentage points',
  width: 800,
  colors: {
    '#a8283a': 'var(--c-red)',
    '#9dbde3': 'var(--c-azure)',
    '#c5b8e8': 'var(--c-violet)',
    '#f0cd8c': 'var(--c-yellow)',
    '#ccd1d7': 'var(--c-slate)',
  },
})
