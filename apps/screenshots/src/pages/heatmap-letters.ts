import { culture } from '../../../docs/src/showcase/culture.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(culture, 'Letter frequency in four languages', {
  title: 'Letter frequency in four languages',
  subtitle: 'Share of each letter in running text',
  width: 800,
  config: { aspectRatio: 3.2, gap: 2, radius: 3 },
})
