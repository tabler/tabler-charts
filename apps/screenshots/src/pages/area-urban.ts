import { society } from '../../../docs/src/showcase/society.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(society, 'Urban and rural population', {
  title: 'The world moves to the city',
  subtitle: 'Share of the world’s people in urban and rural areas',
  config: { curve: 'monotone', annotations: [{ y: 0.5, label: 'Half' }] },
  style: { '--tc-area-opacity': '0.28' },
})
