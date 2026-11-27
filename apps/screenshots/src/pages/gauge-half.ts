import { gauge } from '@tabler/charts'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'Physical inactivity',
  subtitle: 'Adults who do not move enough, worldwide',
  source: 'WHO / The Lancet Global Health, 2022',
  width: 400,
  config: {
    type: gauge,
    data: { name: 'of adults insufficiently active', value: 31.3 },
    thickness: 12,
    cornerRadius: 6,
    center: { value: '31%', label: 'of adults inactive' },
    format: (v: number) => `${v}%`,
    aspectRatio: 1.7,
  },
  style: { '--tc-color-1': C.coral },
})
