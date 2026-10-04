import { Chart, radar } from '@tabler/charts'
import '@tabler/charts/style.css'

new Chart('#chart', {
  type: radar,
  data: {
    labels: ['Comfort', 'Safety', 'Economy', 'Speed', 'Space'],
    series: [
      { name: 'Sedan', values: [80, 90, 70, 60, 75] },
      { name: 'SUV', values: [75, 85, 50, 55, 95] },
    ],
  },
  r: { max: 100 },
  grid: 'circle', // or 'polygon'
  locale: 'en-US',
})
