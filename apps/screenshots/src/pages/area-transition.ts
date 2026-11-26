import { energy } from '../../../docs/src/showcase/energy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(energy, 'Germany: electricity generation', {
  title: 'Germany’s energy transition',
  subtitle: 'Gross electricity generation by source, TWh',
  width: 720,
  config: { aspectRatio: 2.2, curve: 'monotone' },
  style: { '--tc-area-opacity': '0.28' },
})
