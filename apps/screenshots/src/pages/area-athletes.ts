import { sports } from '../../../docs/src/showcase/sports.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(sports, 'Athletes at the Summer Olympics', {
  title: 'Athletes at the Summer Olympics',
  subtitle: 'Competitors per Games, from 241 in Athens in 1896',
})
