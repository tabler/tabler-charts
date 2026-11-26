import { Chart, map } from '@tabler/charts'
import { world } from '@tabler/charts/maps/world'
import '@tabler/charts/style.css'

// The map file is a separate import, so charts without a map do not carry it.
new Chart('#chart', {
  type: map,
  map: world,
  // A value per region code (ISO 3166-1 alpha-2 for countries).
  data: { US: 100, DE: 80, PL: 54, IN: 90, BR: 48, AU: 40 },
  // One hue (--tc-heat-color) by default; or a scale through several colors.
  colors: ['var(--tc-grid-color)', 'var(--tc-color-1)'],
  // Places by their coordinates, and dashed curves between them.
  markers: [
    { name: 'Warsaw', lat: 52.23, lng: 21.01 },
    { name: 'New York', lat: 40.71, lng: -74.01 },
  ],
  lines: [{ from: 'Warsaw', to: 'New York' }],
  // Buttons, the wheel, a double click and a pinch magnify the map; a drag moves it.
  zoom: true,
  // A click selects a region: 'single' or 'multiple'.
  select: 'multiple',
  onSelect: (selected) => console.log(selected),
  locale: 'en-US',
})
