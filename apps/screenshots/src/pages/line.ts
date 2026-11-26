import { line } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'The falling cost of clean power',
  subtitle: 'Unsubsidized cost of new utility-scale generation, $ per MWh',
  source: 'Lazard LCOE analysis, 2009–2024 (midpoints)',
  config: {
    type: line,
    data: {
      labels: [
        2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2023, 2024,
      ].map(String),
      series: [
        {
          name: 'Utility solar',
          values: [359, 248, 157, 125, 104, 79, 65, 55, 50, 43, 40, 37, 36, 60, 61],
          color: C.amber,
        },
        {
          name: 'Onshore wind',
          values: [135, 124, 71, 72, 70, 59, 55, 47, 45, 42, 41, 40, 38, 50, 50],
          color: C.teal,
        },
      ],
    },
    curve: 'monotone',
    points: 'last',
    valueLabels: true,
    y: { format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }, zero: true },
    aspectRatio: 2,
  },
})
