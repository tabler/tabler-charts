import { sports } from '../../../docs/src/showcase/sports.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(sports, "Magnus Carlsen's rating", {
  title: 'Magnus Carlsen’s rating',
  subtitle: 'FIDE classical rating each January',
})
