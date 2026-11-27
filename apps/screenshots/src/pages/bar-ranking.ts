import { bar } from '@tabler/charts'
import { definePage } from '../page.ts'

export default definePage({
  title: 'Most used programming languages',
  subtitle: 'Share of developers who used the language in the past year',
  source: 'Stack Overflow Developer Survey, 2024',
  width: 560,
  config: {
    type: bar,
    orientation: 'horizontal',
    maxBarWidth: 12,
    radius: 3,
    data: {
      labels: [
        'JavaScript',
        'HTML/CSS',
        'SQL',
        'Python',
        'TypeScript',
        'Bash/Shell',
        'Java',
        'C#',
        'C++',
        'C',
        'PHP',
        'Go',
      ],
      series: [
        {
          name: 'Developers using',
          values: [62.3, 52.9, 51.0, 51.0, 38.5, 33.9, 30.3, 27.1, 23.0, 20.2, 18.2, 13.5],
        },
      ],
    },
    valueLabels: true,
    y: { max: 80, format: (v: number) => `${v}%` },
    aspectRatio: 1.25,
  },
})
