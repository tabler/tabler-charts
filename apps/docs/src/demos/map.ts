import { Chart, map } from '@tabler/charts'
import { world } from '@tabler/charts/maps/world'
import type { Demo } from '../demo.ts'

const COUNTRIES = [
  ...['US', 'CA', 'MX', 'BR', 'AR', 'GB', 'DE', 'FR', 'ES', 'PL', 'SE', 'TR', 'EG', 'NG', 'ZA'],
  ...['SA', 'IN', 'CN', 'JP', 'KR', 'ID', 'AU', 'NZ', 'SG', 'MT'],
]

/** Visits per country, a few thousand each. */
const randomValues = (): Record<string, number> =>
  Object.fromEntries(COUNTRIES.map((code) => [code, Math.round(Math.random() ** 2 * 9000) + 200]))

const OFFICES = [
  { name: 'Warsaw', lat: 52.23, lng: 21.01 },
  { name: 'New York', lat: 40.71, lng: -74.01 },
  { name: 'São Paulo', lat: -23.55, lng: -46.63 },
  { name: 'Singapore', lat: 1.35, lng: 103.82 },
  { name: 'Sydney', lat: -33.87, lng: 151.21 },
]
const ROUTES = OFFICES.slice(1).map((office) => ({ from: 'Warsaw', to: office.name }))

export const mapDemo: Demo = {
  id: 'map',
  title: 'Map',
  description:
    'Countries as SVG shapes from a map file, shaded by value: one hue from the empty shade to the full color, or a scale through several colors. Countries too small for a shape are dots, markers sit at their coordinates with dashed routes between them, and the bar below names the range. The shapes are projected when the map file is built (Natural Earth, public domain), so no geo library ships to the browser. Hover a country, or use the arrow keys to walk the ones with a value. Zoom with the buttons, the wheel, a double click, a pinch or the + and - keys, and drag the map; click a country (or press Enter) to select it.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: map,
      map: world,
      data: randomValues(),
      zoom: true,
      select: 'multiple',
      locale: 'en-US',
      title: 'Visits by country',
    })

    controls.button('Shuffle data', () => chart.setData(randomValues()))
    controls.select('Colors', ['one hue', 'scale', 'diverging'] as const, 'one hue', (mode) =>
      chart.update({
        colors:
          mode === 'scale'
            ? ['var(--tc-grid-color)', 'var(--tc-color-1)', '#14366b']
            : mode === 'diverging'
              ? ['var(--tc-color-8)', 'var(--tc-grid-color)', 'var(--tc-color-1)']
              : undefined,
        mid: mode === 'diverging' ? 3000 : undefined,
      }),
    )
    controls.color('Color', '#066fd1', (color) => el.style.setProperty('--tc-heat-color', color))
    controls.select('Markers', ['none', 'offices', 'routes'] as const, 'none', (mode) =>
      chart.update({
        markers: mode === 'none' ? [] : OFFICES,
        lines: mode === 'routes' ? ROUTES : [],
      }),
    )
    let showSelected: (text: string) => void = () => {}
    controls.select('Zoom', ['off', 'on'] as const, 'on', (mode) =>
      chart.update({ zoom: mode === 'on', view: undefined }),
    )
    controls.select('Select', ['none', 'single', 'multiple'] as const, 'multiple', (mode) => {
      chart.update({ select: mode === 'none' ? undefined : mode, selected: [] })
      showSelected('')
    })
    showSelected = controls.output('Selected')
    chart.update({ onSelect: (codes) => showSelected(codes.join(', ')) })
  },
}
