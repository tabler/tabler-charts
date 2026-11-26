import { line } from '@tabler/charts'
import { C, definePage, years } from '../page.ts'

export default definePage({
  title: 'Men’s 100 m world record',
  subtitle: 'Each step is a new record; the last one has stood since 2009',
  source: 'World Athletics, 1912–2009',
  config: {
    type: line,
    data: {
      labels: years([
        1912, 1921, 1930, 1936, 1956, 1960, 1968, 1983, 1988, 1991, 1994, 1996, 1999, 2005, 2007,
        2008, 2009, 2024,
      ]),
      series: [
        {
          name: 'Record',
          values: [
            10.6, 10.4, 10.3, 10.2, 10.1, 10.0, 9.95, 9.93, 9.92, 9.86, 9.85, 9.84, 9.79, 9.77,
            9.74, 9.69, 9.58, 9.58,
          ],
        },
      ],
    },
    x: { type: 'time', utc: true },
    curve: 'step-after',
    y: { format: (v: number) => `${v.toFixed(1)} s` },
    annotations: [{ x: Date.UTC(2009, 7, 16), label: 'Usain Bolt, 9.58 s', color: C.amber }],
    aspectRatio: 2,
  },
  style: { '--tc-color-1': C.violet },
})
