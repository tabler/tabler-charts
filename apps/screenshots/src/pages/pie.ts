import { pie } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'How Copenhagen commutes',
  subtitle: 'Trips to work or education, by mode',
  source: 'City of Copenhagen Bicycle Account, 2022',
  width: 520,
  config: {
    type: pie,
    data: [
      { name: 'Bicycle', value: 49, color: C.teal },
      { name: 'Car', value: 27, color: C.slate },
      { name: 'Public transport', value: 18, color: C.blue },
      { name: 'Walking', value: 6, color: C.amber },
    ],
    format: (v: number) => `${v}%`,
    valueLabels: true,
    gap: 3,
    cornerRadius: 6,
    aspectRatio: 1.7,
  },
})
