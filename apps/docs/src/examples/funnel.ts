import { Chart, funnel } from '@tabler/charts'
import '@tabler/charts/style.css'

// One entry per stage, in the order of the process.
new Chart('#chart', {
  type: funnel,
  data: [
    { name: 'Visits', value: 48200 },
    { name: 'Product views', value: 31400 },
    { name: 'Added to cart', value: 12800 },
    { name: 'Checkout', value: 6900 },
    { name: 'Purchases', value: 4100 },
  ],
  // format: { notation: 'compact' }, // 48K, 31K, …
  // labels: false, // only the shapes
  locale: 'en-US',
})

// The stages shade towards one color:
// #chart { --tc-funnel-color: var(--tc-color-3); }
