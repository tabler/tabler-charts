import { Chart, sparkline } from '@tabler/charts'
import '@tabler/charts/style.css'

// A stat tile: the number, and a sparkline of its last days below it.
new Chart('#revenue-spark', {
  type: sparkline,
  data: [3120, 3410, 3290, 3680, 3540, 3820, 3968],
  height: 40,
  format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
  locale: 'en-US',
})

// Bars, and a zero baseline for values that go negative.
new Chart('#orders-spark', {
  type: sparkline,
  data: [54, 61, 48, 70, 66],
  variant: 'bar',
  height: 40,
})
