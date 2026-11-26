import { funnel } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'From visit to purchase',
  subtitle: 'Online store checkout, last 30 days',
  width: 600,
  config: {
    type: funnel,
    data: [
      { name: 'Visits', value: 48_200 },
      { name: 'Product views', value: 31_400 },
      { name: 'Added to cart', value: 12_800 },
      { name: 'Checkout', value: 6_900 },
      { name: 'Purchases', value: 4_100 },
    ],
    aspectRatio: 2,
  },
  style: { '--tc-funnel-color': C.blue },
})
