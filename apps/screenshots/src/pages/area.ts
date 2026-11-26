import { area } from '@tabler/charts'
import { C, definePage, years } from '../page.ts'

export default definePage({
  title: 'How America pays for music',
  subtitle: 'US recorded music revenue by format, nominal',
  source: 'RIAA US Sales Database, 1983–2023',
  width: 720,
  config: {
    type: area,
    data: {
      labels: years([1983, 1990, 1999, 2005, 2010, 2015, 2020, 2023]),
      series: [
        { name: 'Vinyl', values: [1.7, 0.1, 0.03, 0.03, 0.09, 0.42, 0.63, 1.4], color: C.slate },
        { name: 'Cassette', values: [1.8, 3.5, 1.1, 0.01, 0, 0, 0, 0], color: C.amber },
        { name: 'CD', values: [0.02, 3.5, 12.8, 10.5, 3.4, 1.5, 0.48, 0.54], color: C.blue },
        { name: 'Downloads', values: [0, 0, 0, 0.4, 2.3, 2.3, 0.67, 0.43], color: C.violet },
        { name: 'Streaming', values: [0, 0, 0, 0, 0.4, 2.3, 10.1, 14.4], color: C.teal },
      ].map((series) => ({ ...series, values: series.values.map((v) => v * 1e9) })),
    },
    x: { type: 'time', utc: true },
    stacked: true,
    curve: 'monotone',
    y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
    aspectRatio: 2.2,
  },
  style: { '--tc-area-opacity': '0.28' },
})
