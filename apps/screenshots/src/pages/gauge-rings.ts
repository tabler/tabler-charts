import { gauge } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'Today’s activity',
  subtitle: 'Three daily goals, one ring each',
  width: 420,
  config: {
    type: gauge,
    data: [
      { name: 'Move, kcal', value: 420, max: 500, color: C.coral },
      { name: 'Exercise, min', value: 24, max: 30, color: C.green },
      { name: 'Stand, hours', value: 10, max: 12, color: C.blue },
    ],
    thickness: 14,
    gap: 5,
    cornerRadius: 7,
    center: { value: '83%', label: 'of today’s goals' },
    aspectRatio: 1.25,
  },
})
