import { Chart, gauge } from '@tabler/charts'
import '@tabler/charts/style.css'

// One value of a maximum (100 by default), or several rings.
new Chart('#chart', {
  type: gauge,
  data: { name: 'completed', value: 1392, max: 2400 },
  startAngle: -135, // a dial: from -135° over 270°
  angle: 270,
  thickness: 12,
  cornerRadius: 6,
  locale: 'en-US',
})
