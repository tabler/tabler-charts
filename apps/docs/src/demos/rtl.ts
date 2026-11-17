import { bar, Chart } from '@tabler/charts'
import type { Demo } from '../demo.ts'

type Direction = 'rtl' | 'ltr'
type Orientation = 'vertical' | 'horizontal'
type Months = 'with the page' | 'from the left'

export const rtlDemo: Demo = {
  id: 'rtl',
  title: 'Right to left',
  description:
    'rtl: "auto" mirrors the chart on a right-to-left page (it reads the direction of its container; rtl: true mirrors anywhere): the value axis on the right, categories from the right, the first series of a group on the right, and the arrow keys following the screen. x: { reverse: false } keeps the categories from the left.',
  mount(el, controls) {
    // The page of the playground reads left to right: the demo is its own right-to-left island.
    el.dir = 'rtl'
    const chart = new Chart(el, {
      type: bar,
      rtl: 'auto',
      locale: 'ar-EG',
      title: 'المبيعات والتكاليف',
      y: { format: { notation: 'compact' } },
      data: {
        labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
        series: [
          { name: 'المبيعات', values: [1200, 1850, 990, 2400, 2100, 2750] },
          { name: 'التكاليف', values: [800, 1100, 700, 1500, 1350, 1600] },
        ],
      },
    })
    let months: Months = 'with the page'
    const x = () => (months === 'from the left' ? { reverse: false } : {})

    controls.select('Page direction', ['rtl', 'ltr'] as const, 'rtl', (value: Direction) => {
      el.dir = value
      // 'auto' is read again with the options.
      chart.update({ rtl: 'auto' })
    })
    controls.select(
      'Orientation',
      ['vertical', 'horizontal'] as const,
      'vertical',
      (value: Orientation) => {
        chart.update({ orientation: value })
      },
    )
    controls.select('Months', ['with the page', 'from the left'] as const, months, (value) => {
      months = value
      chart.update({ x: x() })
    })
  },
}
