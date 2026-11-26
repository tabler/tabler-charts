import { bar } from '@tabler/charts'
import { C, definePage } from '../page.ts'

const DECADES = [
  1880, 1890, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020,
]
const ANOMALY = [
  -0.27, -0.26, -0.26, -0.27, -0.17, -0.03, 0.04, -0.02, -0.01, 0.0, 0.2, 0.38, 0.61, 0.86, 1.14,
]

export default definePage({
  title: 'Every decade warmer than the last',
  subtitle: 'Global temperature by decade, difference from the 1951–1980 mean',
  source: 'NASA GISS Surface Temperature Analysis, 1880–2024',
  width: 720,
  config: {
    type: bar,
    data: {
      labels: DECADES.map((year) => `${year}s`),
      series: [
        {
          name: 'Cooler than 1951–1980',
          values: ANOMALY.map((v) => (v < 0 ? v : null)),
          color: C.blue,
        },
        {
          name: 'Warmer than 1951–1980',
          values: ANOMALY.map((v) => (v >= 0 ? v : null)),
          color: C.coral,
        },
      ],
    },
    stacked: true,
    radius: 3,
    y: {
      format: {
        style: 'unit',
        unit: 'celsius',
        signDisplay: 'exceptZero',
        maximumFractionDigits: 1,
      },
    },
    aspectRatio: 2.2,
  },
})
