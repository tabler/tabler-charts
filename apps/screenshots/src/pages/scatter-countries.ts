import { society } from '../../../docs/src/showcase/society.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(society, 'Median age vs. fertility', {
  title: 'Older societies have fewer children',
  subtitle: 'Median age against fertility rate; a bubble is as large as the population',
  width: 720,
  config: {
    aspectRatio: 2.2,
    x: { min: 10, max: 55, format: (v: number) => `${v} y` },
    y: { min: 0, max: 9 },
  },
})
