import { bar, Chart } from '@tabler/charts'
import '@tabler/charts/style.css'

// <html dir="rtl"> … <div id="sales"></div>
new Chart('#sales', {
  type: bar,
  rtl: 'auto', // follows the page; `true` mirrors on any page (and in SSR)
  locale: 'ar-EG',
  data: {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل'],
    series: [
      { name: 'المبيعات', values: [1200, 1850, 990, 2400] },
      { name: 'التكاليف', values: [800, 1100, 700, 1500] },
    ],
  },
  // x: { reverse: false }, // keep the months from the left
})
