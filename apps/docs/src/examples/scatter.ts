import { Chart, scatter } from '@tabler/charts'
import '@tabler/charts/style.css'

new Chart('#chart', {
  type: scatter,
  data: {
    series: [
      {
        name: 'Cities',
        // A size makes bubbles, with area-proportional radii.
        points: [
          { x: 12, y: 3.4, size: 8, label: 'Lyon' },
          { x: 18, y: 5.1, size: 21, label: 'Paris' },
          { x: 9, y: 2.2, size: 5, label: 'Nantes' },
        ],
      },
    ],
  },
  x: { format: { maximumFractionDigits: 0 } },
  locale: 'en-US',
})
