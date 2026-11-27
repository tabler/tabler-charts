import { science } from '../../../docs/src/showcase/science.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(science, "Earth's atmosphere", {
  title: 'What the air is made of',
  subtitle: 'Dry air by volume',
  width: 560,
  config: { aspectRatio: 1.7, gap: 3, cornerRadius: 6 },
})
