import { Chart, percentageBar } from '@tabler/charts'
import '@tabler/charts/style.css'

// Each segment is as wide as its share of the total.
new Chart('#chart', {
  type: percentageBar,
  data: [
    { name: 'Paid', value: 412, color: 'var(--tc-color-6)' },
    { name: 'Open', value: 164 },
    { name: 'Draft', value: 73 },
    { name: 'Overdue', value: 38, color: 'var(--tc-color-8)' },
  ],
  // height: 16, // a strip by default; any height works
  // maxSlices: 5, // the four largest and one segment for the others
  // order: 'size', // the largest segment first
  // gap: 2, radius: 4, // space between the segments and their corners
  locale: 'en-US',
})
