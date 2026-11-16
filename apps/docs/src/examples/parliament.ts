import { Chart, parliament } from '@tabler/charts'
import '@tabler/charts/style.css'

// Parties in their order along the benches, from the left.
new Chart('#chart', {
  type: parliament,
  data: [
    { name: 'Fidesz–KDNP', seats: 135, color: '#f08c2e' },
    { name: 'United for Hungary', seats: 57, color: '#2a9d8f' },
    { name: 'Mi Hazánk', seats: 6, color: '#8bc34a' },
    { name: 'German minority', seats: 1, color: '#555' },
  ],
  center: { label: 'seats' }, // the total sits in the middle; false hides it
  angle: 180, // a hemicycle; 360 for a full circle
  // rows: 8, // defaults to the fewest rows that seat everyone
  // total: 199, // more than the parties' sum leaves vacant seats
  locale: 'en-US',
})
