import { culture } from '../../../docs/src/showcase/culture.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(culture, 'Weekend box office by film', {
  subtitle: 'Share of the weekend gross, 8–10 February 2019',
  width: 760,
  config: { aspectRatio: 2.4, gap: 3, cornerRadius: 6 },
})
