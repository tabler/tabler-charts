import { parliament } from '@tabler/charts'
import { definePage } from '../page.ts'

export default definePage({
  title: 'European Parliament',
  subtitle: 'Political groups at the start of the tenth term',
  source: 'European Parliament, July 2024',
  width: 600,
  config: {
    type: parliament,
    total: 720,
    center: { label: 'seats' },
    data: [
      { name: 'The Left', seats: 46, color: '#b5544f' },
      { name: 'S&D', seats: 136, color: '#e0706b' },
      { name: 'Greens/EFA', seats: 53, color: '#6fb37a' },
      { name: 'Renew Europe', seats: 77, color: '#e3bf52' },
      { name: 'EPP', seats: 188, color: '#5f9be0' },
      { name: 'ECR', seats: 78, color: '#3f6fb0' },
      { name: 'Patriots for Europe', seats: 84, color: '#4a5a8c' },
      { name: 'ESN', seats: 25, color: '#39415f' },
      { name: 'Non-attached', seats: 32, color: '#a3acb9' },
    ],
    aspectRatio: 1.7,
  },
})
