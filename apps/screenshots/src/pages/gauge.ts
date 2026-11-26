import { gauge } from '@tabler/charts'
import { definePage } from '../page.ts'

export default definePage({
  title: 'Storage',
  subtitle: 'Used of the 2.4 TB plan',
  width: 360,
  config: {
    type: gauge,
    data: { name: 'GB used', value: 1392, max: 2400 },
    startAngle: -135,
    angle: 270,
    thickness: 12,
    cornerRadius: 6,
  },
})
