import { Chart, type ParliamentParty, parliament } from '@tabler/charts'
import type { Demo } from '../demo.ts'

/** The Hungarian National Assembly after the 2022 election: 199 seats. */
const HUNGARY: ParliamentParty[] = [
  { name: 'Fidesz–KDNP', seats: 135, color: '#f08c2e' },
  { name: 'United for Hungary', seats: 57, color: '#2a9d8f' },
  { name: 'Mi Hazánk', seats: 6, color: '#8bc34a' },
  { name: 'German minority', seats: 1, color: '#555' },
]

/** The Sejm of Poland after the 2023 election: 460 seats. */
const POLAND: ParliamentParty[] = [
  { name: 'PiS', seats: 194, color: '#263778' },
  { name: 'KO', seats: 157, color: '#f68f3c' },
  { name: 'Trzecia Droga', seats: 65, color: '#ffc62a' },
  { name: 'Lewica', seats: 26, color: '#8e2a7b' },
  { name: 'Konfederacja', seats: 18, color: '#1d3f8a' },
]

export const parliamentDemo: Demo = {
  id: 'parliament',
  title: 'Parliament',
  description:
    'Election results as a hemicycle: a dot per seat on concentric benches, each party a wedge of them from the left in data order, the number of seats in the middle. Hovering a seat shows its party; the legend toggles parties, and the arc, rows and inner radius are options.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: parliament,
      data: HUNGARY,
      locale: 'en-US',
      aspectRatio: 2,
      center: { label: 'seats' },
      title: 'Hungarian National Assembly, 2022',
    })

    controls.select('Data', ['Hungary 2022', 'Poland 2023'] as const, 'Hungary 2022', (value) =>
      chart.update(
        value === 'Hungary 2022'
          ? { data: HUNGARY, total: undefined, title: 'Hungarian National Assembly, 2022' }
          : { data: POLAND, total: undefined, title: 'Sejm of Poland, 2023' },
      ),
    )
    controls.button('Random seats', () =>
      chart.setData(
        (chart.config.data as ParliamentParty[]).map((party) => ({
          ...party,
          seats: Math.round(Math.random() * 150),
        })),
      ),
    )
    controls.select('Arc', ['180', '220', '360'] as const, '180', (value) =>
      chart.update({ angle: Number(value) }),
    )
    controls.select('Rows', ['auto', '4', '6', '8', '12'] as const, 'auto', (value) =>
      chart.update({ rows: value === 'auto' ? undefined : Number(value) }),
    )
    controls.range('Inner radius', { min: 0, max: 0.9, step: 0.05, value: 0.45 }, (innerRadius) =>
      chart.update({ innerRadius }),
    )
    controls.range('Gap', { min: 0, max: 0.8, step: 0.05, value: 0.35 }, (gap) =>
      chart.update({ gap }),
    )
  },
}
