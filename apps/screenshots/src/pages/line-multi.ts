import { line } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'Life expectancy at birth',
  subtitle: 'Years, by decade since 1950',
  source: 'UN World Population Prospects 2024',
  config: {
    type: line,
    data: {
      labels: [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020, 2023].map(String),
      series: [
        {
          name: 'Japan',
          values: [61.0, 67.7, 72.0, 76.1, 78.8, 81.1, 82.8, 84.6, 84.7],
          color: C.coral,
        },
        {
          name: 'World',
          values: [46.5, 50.9, 56.1, 60.6, 64.0, 66.5, 70.1, 72.0, 73.3],
          color: C.ink,
        },
        {
          name: 'India',
          values: [35.2, 41.4, 47.7, 53.8, 58.6, 62.5, 66.7, 70.1, 72.0],
          color: C.blue,
        },
        {
          name: 'Nigeria',
          values: [33.6, 37.0, 41.0, 45.1, 45.9, 46.3, 50.9, 52.7, 54.5],
          color: C.teal,
        },
      ],
    },
    curve: 'monotone',
    points: 'last',
    y: { min: 30, format: (v: number) => `${v} y` },
    aspectRatio: 2,
  },
})
