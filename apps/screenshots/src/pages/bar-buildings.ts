import { transport } from '../../../docs/src/showcase/transport.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(transport, 'Tallest buildings', {
  title: 'Tallest buildings',
  subtitle: 'Architectural height in metres; the axis starts at 400 m',
  width: 560,
  config: { aspectRatio: 1.4, radius: 3 },
})
