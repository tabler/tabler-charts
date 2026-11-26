import { technology } from '../../../docs/src/showcase/technology.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(technology, 'Cloud infrastructure market', {
  title: 'Cloud infrastructure market',
  subtitle: 'Share of worldwide spending, Q4 2024',
  width: 560,
  config: { aspectRatio: 1.7, gap: 2 },
  // "Others" in the grid color would all but vanish on the dark card.
  colors: { 'var(--tc-grid-color)': 'var(--c-slate)' },
})
