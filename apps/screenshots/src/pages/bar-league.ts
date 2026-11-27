import { sports } from '../../../docs/src/showcase/sports.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(sports, 'Premier League 2023–24', {
  title: 'Premier League 2023–24',
  subtitle: 'Final points of the top eight clubs',
  width: 720,
  config: { radius: 4 },
  style: { '--tc-color-1': 'var(--c-violet)' },
})
