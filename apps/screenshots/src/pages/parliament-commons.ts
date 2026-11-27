import { politics } from '../../../docs/src/showcase/politics.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(politics, 'UK House of Commons, 2024', {
  title: 'UK House of Commons',
  subtitle: 'Seats after the general election of 4 July 2024',
  width: 680,
  config: {
    aspectRatio: 2,
    // Party colors, toned down for the picture.
    data: [
      { name: 'Labour', seats: 411, color: '#dc6a72' },
      { name: 'Liberal Democrats', seats: 72, color: '#e6b25a' },
      { name: 'SNP', seats: 9, color: '#e9df8a' },
      { name: 'Green', seats: 4, color: '#6fb37a' },
      { name: 'Plaid Cymru', seats: 4, color: '#4f8f84' },
      { name: 'Sinn Féin', seats: 7, color: '#5d8a82' },
      { name: 'Others', seats: 12, color: '#a3acb9' },
      { name: 'DUP', seats: 5, color: '#d08a70' },
      { name: 'Conservative', seats: 121, color: '#5f9be0' },
      { name: 'Reform UK', seats: 5, color: '#5fbfd0' },
    ],
  },
})
