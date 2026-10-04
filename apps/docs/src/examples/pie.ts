import { Chart, donut } from '@tabler/charts'
import '@tabler/charts/style.css'

new Chart('#chart', {
  type: donut, // or pie
  data: [
    { name: 'Direct', value: 42 },
    { name: 'Search', value: 31 },
    { name: 'Social', value: 17 },
    { name: 'Email', value: 10 },
  ],
  center: { value: '7 days', label: 'Last' }, // the total by default, false for none
  gap: 2,
  cornerRadius: 4,
  locale: 'en-US',
})
