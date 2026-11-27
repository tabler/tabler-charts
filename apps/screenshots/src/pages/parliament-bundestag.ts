import { parliament } from '@tabler/charts'
import { definePage } from '../page.ts'

export default definePage({
  title: 'Bundestag',
  subtitle: 'Seats after the federal election of 23 February 2025',
  source: 'Bundeswahlleiterin, 2025',
  width: 600,
  config: {
    type: parliament,
    center: { label: 'seats' },
    data: [
      { name: 'Die Linke', seats: 64, color: '#c4628f' },
      { name: 'SPD', seats: 120, color: '#e0706b' },
      { name: 'Grüne', seats: 85, color: '#6fb37a' },
      { name: 'SSW', seats: 1, color: '#3f6fb0' },
      { name: 'CDU/CSU', seats: 208, color: '#56606e' },
      { name: 'AfD', seats: 152, color: '#5fa9d9' },
    ],
    aspectRatio: 1.7,
  },
})
