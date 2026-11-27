import { scatter } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'More spending, not always longer lives',
  subtitle: 'Health spending per person against life expectancy, OECD countries',
  source: 'OECD Health Statistics, 2022',
  width: 720,
  config: {
    type: scatter,
    data: {
      series: [
        {
          name: 'United States',
          color: C.coral,
          points: [{ x: 12555, y: 77.5, label: 'United States' }],
        },
        {
          name: 'Other OECD countries',
          color: C.blue,
          points: [
            { x: 8049, y: 83.5, label: 'Switzerland' },
            { x: 8011, y: 80.9, label: 'Germany' },
            { x: 7771, y: 83.2, label: 'Norway' },
            { x: 7275, y: 81.3, label: 'Austria' },
            { x: 6729, y: 81.7, label: 'Netherlands' },
            { x: 6630, y: 82.3, label: 'France' },
            { x: 6597, y: 83.3, label: 'Australia' },
            { x: 6438, y: 83.1, label: 'Sweden' },
            { x: 6319, y: 81.3, label: 'Canada' },
            { x: 5493, y: 80.9, label: 'United Kingdom' },
            { x: 5251, y: 84.1, label: 'Japan' },
            { x: 4570, y: 82.7, label: 'South Korea' },
            { x: 4432, y: 83.2, label: 'Spain' },
            { x: 4291, y: 83.0, label: 'Italy' },
            { x: 2973, y: 77.0, label: 'Poland' },
            { x: 1827, y: 77.3, label: 'Turkey' },
            { x: 1181, y: 75.2, label: 'Mexico' },
          ],
        },
      ],
    },
    radius: 6,
    x: { format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }, zero: true },
    y: { min: 72, max: 86, format: (v: number) => `${v} y` },
    aspectRatio: 2.2,
  },
})
