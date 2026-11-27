import { science } from '../../../docs/src/showcase/science.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(science, "Earth's crust", {
  title: 'What the Earth’s crust is made of',
  subtitle: 'Elements by mass',
  width: 560,
  config: { aspectRatio: 1.7, gap: 3, cornerRadius: 6 },
  // "Other" in the grid color would all but vanish on the dark card.
  colors: { 'var(--tc-grid-color)': 'var(--c-slate)' },
})
