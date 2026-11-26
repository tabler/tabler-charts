import { map } from '@tabler/charts'
import { world } from '@tabler/charts/maps/world'
import { definePage } from '../page.ts'

export default definePage({
  title: 'Customers by country',
  subtitle: 'Active accounts, in thousands',
  width: 760,
  config: {
    type: map,
    map: world,
    data: {
      US: 100,
      CA: 46,
      BR: 48,
      GB: 62,
      DE: 80,
      FR: 58,
      PL: 54,
      IN: 90,
      CN: 72,
      JP: 66,
      AU: 40,
    },
    markers: [
      { name: 'Warsaw', lat: 52.23, lng: 21.01 },
      { name: 'New York', lat: 40.71, lng: -74.01 },
    ],
    lines: [{ from: 'Warsaw', to: 'New York' }],
  },
})
