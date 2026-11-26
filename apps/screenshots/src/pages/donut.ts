import { donut } from '@tabler/charts'
import { definePage } from '../page.ts'

export default definePage({
  title: 'Traffic sources',
  subtitle: 'Share of sessions, last 7 days',
  width: 480,
  config: {
    type: donut,
    data: [
      { name: 'Direct', value: 42 },
      { name: 'Search', value: 31 },
      { name: 'Social', value: 17 },
      { name: 'Email', value: 10 },
    ],
    center: { value: '7 days', label: 'Last' },
    gap: 2,
    cornerRadius: 4,
  },
})
