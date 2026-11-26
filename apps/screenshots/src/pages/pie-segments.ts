import { business } from '../../../docs/src/showcase/business.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(business, 'Microsoft revenue by segment', {
  title: 'Microsoft revenue by segment',
  subtitle: 'Three segments, fiscal 2024',
  width: 560,
  config: { aspectRatio: 1.7, gap: 3, cornerRadius: 6 },
})
