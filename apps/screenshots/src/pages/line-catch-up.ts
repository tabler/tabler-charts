import { economy } from '../../../docs/src/showcase/economy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(economy, 'Poland overtakes Japan and Spain in GDP per capita', {
  title: 'Poland catches up in GDP per capita',
  subtitle: "Poland's GDP per capita at purchasing power parity, as a share of each country's",
  width: 840,
  config: { aspectRatio: 1.9, legend: false },
})
