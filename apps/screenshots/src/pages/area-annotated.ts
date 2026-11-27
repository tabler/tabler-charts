import { area } from '@tabler/charts'
import { C, definePage, years } from '../page.ts'

export default definePage({
  title: 'Arctic sea ice is shrinking',
  subtitle: 'September minimum extent, million km²',
  source: 'NSIDC Sea Ice Index, 1980–2024',
  config: {
    type: area,
    data: {
      labels: years([1980, 1985, 1990, 1995, 2000, 2005, 2010, 2012, 2015, 2020, 2024]),
      series: [
        {
          name: 'September extent',
          values: [7.67, 6.7, 6.14, 6.08, 6.25, 5.5, 4.87, 3.57, 4.63, 3.92, 4.28],
        },
      ],
    },
    x: { type: 'time', utc: true },
    fill: 'gradient',
    points: 'last',
    y: { zero: true, format: (v: number) => `${v}M` },
    annotations: [{ x: Date.UTC(2012, 0, 1), label: '2012 record low', color: C.coral }],
    aspectRatio: 2,
  },
  style: { '--tc-color-1': C.blue },
})
