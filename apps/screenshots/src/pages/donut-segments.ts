import { business } from '../../../docs/src/showcase/business.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(business, 'Apple revenue by segment', {
  title: 'Where Apple’s revenue comes from',
  subtitle: 'Net sales by product line, fiscal 2024',
  width: 560,
  config: { aspectRatio: 1.7, gap: 2, cornerRadius: 3 },
})
