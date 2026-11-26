import { politics } from '../../../docs/src/showcase/politics.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(politics, 'Polish presidential election, 2025', {
  title: 'Polish presidential election',
  subtitle: 'Second round, 1 June 2025',
  width: 520,
  config: {
    aspectRatio: 1.7,
    gap: 2,
    cornerRadius: 3,
    locale: 'en-US',
    center: { value: '1.78 pp', label: 'margin' },
    data: [
      { name: 'Karol Nawrocki', value: 50.89, color: 'var(--c-indigo)' },
      { name: 'Rafał Trzaskowski', value: 49.11, color: 'var(--c-orange)' },
    ],
  },
})
