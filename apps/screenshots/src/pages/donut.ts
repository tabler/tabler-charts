import { donut } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'Where the world’s electricity comes from',
  subtitle: 'Share of global generation',
  source: 'Ember Global Electricity Review, 2023',
  width: 560,
  config: {
    type: donut,
    data: [
      { name: 'Coal', value: 35.5, color: C.ink },
      { name: 'Gas', value: 22.5, color: C.coral },
      { name: 'Other fossil', value: 2.6, color: C.slate },
      { name: 'Hydro', value: 14.3, color: C.blue },
      { name: 'Nuclear', value: 9.1, color: C.violet },
      { name: 'Wind', value: 7.8, color: C.teal },
      { name: 'Solar', value: 5.5, color: C.amber },
      { name: 'Bioenergy & other', value: 2.7, color: C.green },
    ],
    format: (v: number) => `${v}%`,
    center: { value: '39%', label: 'clean' },
    gap: 2,
    cornerRadius: 3,
    aspectRatio: 1.7,
  },
})
