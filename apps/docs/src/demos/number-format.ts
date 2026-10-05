import { bar, Chart, type NumberFormatOptions } from '@tabler/charts'
import type { Demo } from '../demo.ts'

const formats = {
  compact: { notation: 'compact' },
  'compact long': { notation: 'compact', compactDisplay: 'long' },
  'compact symbols': { notation: 'compact', compactSymbols: ['k', 'M', 'G'] },
  'compact currency': { style: 'currency', currency: 'USD', notation: 'compact' },
  standard: {},
} as const satisfies Record<string, NumberFormatOptions>

type FormatName = keyof typeof formats

export const numberFormatDemo: Demo = {
  id: 'number-format',
  title: 'Number format',
  description:
    'Long numbers shortened with compact notation: 1000 → 1K, 1 100 000 → 1.1M. Formats are plain Intl.NumberFormat options, so the suffixes and the decimal separator follow the locale (1,1 mln in Polish); compactSymbols sets suffixes of your own (1,1M). Ticks stay short, while value labels and tooltips keep three significant digits.',
  mount(el, controls) {
    let format: FormatName = 'compact'
    let locale = 'en-US'
    const chart = new Chart(el, {
      type: bar,
      locale,
      title: 'Monthly revenue',
      valueLabels: true,
      y: { format: formats[format] },
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        series: [
          {
            name: 'Revenue',
            values: [850_000, 1_100_000, 1_480_000, 1_000_000, 1_920_000, 2_310_000],
          },
        ],
      },
    })
    const apply = () => chart.update({ locale, y: { format: formats[format] } })
    controls.select('Format', Object.keys(formats) as FormatName[], format, (value) => {
      format = value
      apply()
    })
    controls.select('Locale', ['en-US', 'pl-PL', 'de-DE'] as const, 'en-US', (value) => {
      locale = value
      apply()
    })
  },
}
