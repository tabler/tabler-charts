import { Chart, treemap } from '@tabler/charts'
import '@tabler/charts/style.css'

// Each tile is as large as its value; entries with children are groups.
new Chart('#chart', {
  type: treemap,
  data: [
    {
      name: 'Engineering',
      children: [
        { name: 'Salaries', value: 182000 },
        { name: 'Cloud', value: 46000 },
        { name: 'Contractors', value: 28000 },
      ],
    },
    {
      name: 'Marketing',
      children: [
        { name: 'Ads', value: 64000 },
        { name: 'Events', value: 22000 },
      ],
    },
    { name: 'Office', value: 31000 },
  ],
  format: { style: 'currency', currency: 'USD', notation: 'compact' },
  // labels: false, // no names in the tiles
  // gap: 2, radius: 3, // space between the tiles and their corners
  locale: 'en-US',
})
