import { gauge } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'Electric cars in Norway',
  subtitle: 'Battery-electric share of new registrations',
  source: 'Norwegian Road Federation (OFV), 2024',
  width: 400,
  config: {
    type: gauge,
    data: { name: 'battery electric', value: 88.9 },
    startAngle: -135,
    angle: 270,
    thickness: 14,
    cornerRadius: 7,
    center: { value: '88.9%', label: 'of new cars' },
    format: (v: number) => `${v}%`,
    aspectRatio: 1.5,
  },
  style: { '--tc-color-1': C.teal },
})
