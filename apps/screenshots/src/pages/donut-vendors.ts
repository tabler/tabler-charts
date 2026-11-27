import { business } from '../../../docs/src/showcase/business.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(business, 'Smartphone shipments by vendor', {
  title: 'Who ships the world’s smartphones',
  subtitle: 'Units shipped by vendor, 2024',
  width: 560,
  config: { aspectRatio: 1.7, gap: 3, cornerRadius: 6 },
  // "Others" in the grid color would all but vanish on the dark card.
  colors: { 'var(--tc-grid-color)': 'var(--c-slate)' },
})
