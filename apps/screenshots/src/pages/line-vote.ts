import { politics } from '../../../docs/src/showcase/politics.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(politics, 'US presidential popular vote', {
  title: 'US presidential popular vote',
  subtitle: 'Share of the vote for the two major parties since 1980',
  config: { points: 'all' },
  // The parties' colors, toned down for the picture.
  colors: { '#3333ff': 'var(--c-blue)', '#e81b23': 'var(--c-red)' },
})
