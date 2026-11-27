import { percentageBar } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'Greenhouse gas emissions by sector',
  subtitle: 'Share of global emissions, CO₂ equivalent',
  source: 'Climate Watch / Our World in Data, 2016',
  width: 600,
  config: {
    type: percentageBar,
    data: [
      { name: 'Energy', value: 73.2, color: C.coral },
      { name: 'Agriculture, forestry & land use', value: 18.4, color: C.green },
      { name: 'Industry', value: 5.2, color: C.violet },
      { name: 'Waste', value: 3.2, color: C.slate },
    ],
    height: 20,
    gap: 3,
    radius: 6,
    format: (v: number) => `${v}%`,
  },
})
