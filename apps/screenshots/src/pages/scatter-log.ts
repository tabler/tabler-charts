import { technology } from '../../../docs/src/showcase/technology.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(technology, "Moore's law", {
  title: 'Moore’s law',
  subtitle: 'Transistors per chip in landmark processors, logarithmic scale',
  width: 720,
  config: { aspectRatio: 2.2 },
})
