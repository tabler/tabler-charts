import { business } from '../../../docs/src/showcase/business.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(business, 'Smartphone shipments by vendor', {
  title: 'Smartphone shipments by vendor',
  subtitle: 'Units shipped, 2024',
  width: 560,
  config: { aspectRatio: 2.2, gap: 3, cornerRadius: 6, legend: { position: 'right' } },
  // "Others" in the grid color would all but vanish on the dark card.
  colors: { 'var(--tc-grid-color)': 'var(--c-slate)' },
})
