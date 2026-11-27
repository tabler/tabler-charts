import { map } from '@tabler/charts'
import { world } from '@tabler/charts/maps/world'
import { C, definePage } from '../page.ts'

// The year each country took up the euro, and the countries at each year.
const BY_YEAR: Record<number, string> = {
  1999: 'AT BE FI FR DE IE IT LU NL PT ES',
  2001: 'GR',
  2007: 'SI',
  2008: 'CY MT',
  2009: 'SK',
  2011: 'EE',
  2014: 'LV',
  2015: 'LT',
  2023: 'HR',
  2026: 'BG',
}
const data: Record<string, number> = {}
for (const [year, codes] of Object.entries(BY_YEAR)) {
  for (const code of codes.split(' ')) data[code] = Number(year)
}

export default definePage({
  title: 'The euro area',
  subtitle: 'The year each country adopted the euro; the two newest members are selected',
  source: 'European Central Bank, 2026',
  width: 720,
  config: {
    type: map,
    map: world,
    data,
    colors: [C.blue, C.teal],
    min: 1999,
    max: 2026,
    format: { useGrouping: false },
    // The map opens on Europe; the buttons, the wheel and a drag move it from there.
    zoom: true,
    view: { x: 400, y: 66, scale: 3.2 },
    select: 'multiple',
    selected: ['HR', 'BG'],
    aspectRatio: 1.75,
  },
})
