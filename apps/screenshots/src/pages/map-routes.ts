import { map } from '@tabler/charts'
import { world } from '@tabler/charts/maps/world'
import { C, definePage } from '../page.ts'

export default definePage({
  title: 'The world’s longest flights',
  subtitle: 'Seven non-stop routes of more than 14,000 km, joined city to city',
  source: 'Airline schedules, 2024',
  width: 800,
  config: {
    type: map,
    map: world,
    data: {},
    markers: [
      { name: 'Singapore', lat: 1.36, lng: 103.99 },
      { name: 'New York', lat: 40.64, lng: -73.78 },
      { name: 'Doha', lat: 25.27, lng: 51.61 },
      { name: 'Auckland', lat: -37.01, lng: 174.79 },
      { name: 'Perth', lat: -31.94, lng: 115.97 },
      { name: 'London', lat: 51.47, lng: -0.45 },
      { name: 'Melbourne', lat: -37.67, lng: 144.84 },
      { name: 'Dallas', lat: 32.9, lng: -97.04 },
      { name: 'Paris', lat: 49.01, lng: 2.55 },
      { name: 'Dubai', lat: 25.25, lng: 55.36 },
    ],
    lines: [
      { from: 'Singapore', to: 'New York' },
      { from: 'Doha', to: 'Auckland' },
      { from: 'Perth', to: 'London' },
      { from: 'Melbourne', to: 'Dallas' },
      { from: 'Perth', to: 'Paris' },
      { from: 'Auckland', to: 'New York' },
      { from: 'Dubai', to: 'Auckland' },
    ],
    markerRadius: 4,
    scale: false,
  },
  style: { '--tc-color-1': C.coral },
})
