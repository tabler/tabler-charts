import { politics } from '../../../docs/src/showcase/politics.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(politics, 'US Electoral College, 2024', {
  title: 'US Electoral College',
  subtitle: '538 electors in 2024; 270 are a majority',
  width: 720,
  config: { aspectRatio: 6, radius: 4 },
  colors: { '#3333ff': 'var(--c-blue)', '#e81b23': 'var(--c-red)' },
})
