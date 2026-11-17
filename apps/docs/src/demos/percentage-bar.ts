import { Chart, type PercentageBarSegment, percentageBar } from '@tabler/charts'
import type { Demo } from '../demo.ts'

/** Invoices by status. */
const INVOICES: PercentageBarSegment[] = [
  { name: 'Paid', value: 412, color: 'var(--tc-color-6)' },
  { name: 'Open', value: 164 },
  { name: 'Draft', value: 73, color: 'var(--tc-text-muted)' },
  { name: 'Overdue', value: 38, color: 'var(--tc-color-8)' },
]

/** Disk space by kind of file, in gigabytes. */
const STORAGE: PercentageBarSegment[] = [
  { name: 'Documents', value: 38 },
  { name: 'Photos', value: 96 },
  { name: 'Videos', value: 212 },
  { name: 'Music', value: 41 },
  { name: 'Apps', value: 58 },
  { name: 'Other', value: 27 },
]

/** Visits by country: more entries than the bar shows. */
const COUNTRIES: PercentageBarSegment[] = [
  ['United States', 4210],
  ['Germany', 1980],
  ['United Kingdom', 1640],
  ['France', 1320],
  ['Poland', 1180],
  ['India', 960],
  ['Brazil', 720],
  ['Canada', 610],
  ['Spain', 540],
  ['Italy', 470],
  ['Netherlands', 390],
  ['Japan', 310],
].map(([name, value]) => ({ name, value }) as PercentageBarSegment)

export const percentageBarDemo: Demo = {
  id: 'percentage-bar',
  title: 'Percentage bar',
  description:
    'Parts of a whole as segments of one bar, each as wide as its share: a donut unrolled into a strip to put under a number. Hovering a segment shows its value and share, the legend toggles segments (the rest share the bar); with more entries than maxSlices the smallest are grouped into Others, and the order, gap, corners and height are options.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: percentageBar,
      data: INVOICES,
      locale: 'en-US',
      title: 'Invoices by status',
    })

    controls.select('Data', ['Invoices', 'Storage', 'Countries'] as const, 'Invoices', (value) =>
      chart.update(
        value === 'Invoices'
          ? { data: INVOICES, format: undefined, title: 'Invoices by status' }
          : value === 'Countries'
            ? { data: COUNTRIES, format: undefined, title: 'Visits by country' }
            : {
                data: STORAGE,
                format: { style: 'unit', unit: 'gigabyte' },
                title: 'Disk space by kind of file',
              },
      ),
    )
    controls.button('Random values', () =>
      chart.setData(
        (chart.config.data as PercentageBarSegment[]).map((segment) => ({
          ...segment,
          value: Math.round(10 + Math.random() * 300),
        })),
      ),
    )
    controls.select('Order', ['data', 'size'] as const, 'data', (order) => chart.update({ order }))
    controls.select('Max slices', ['3', '5', '9', 'all'] as const, '9', (value) =>
      chart.update({ maxSlices: value === 'all' ? 0 : Number(value) }),
    )
    controls.range('Height', { min: 4, max: 48, step: 2, value: 16 }, (height) =>
      chart.update({ height }),
    )
    controls.range('Gap', { min: 0, max: 8, step: 1, value: 2 }, (gap) => chart.update({ gap }))
    controls.range('Radius', { min: 0, max: 24, step: 1, value: 4 }, (radius) =>
      chart.update({ radius }),
    )
  },
}
