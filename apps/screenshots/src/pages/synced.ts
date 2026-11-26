import { climate } from '../../../docs/src/showcase/climate.ts'
import { chart, el } from '../dom.ts'
import { definePage } from '../page.ts'
import { fromShowcase } from '../showcase.ts'

// Two examples of the playground that share one sync group: hovering one
// opens the tooltip of the same year in both.
const co2 = fromShowcase(climate, 'Atmospheric CO₂')
const anomaly = fromShowcase(climate, 'Global temperature anomaly')

export default definePage({
  title: 'CO₂ and temperature, in step',
  subtitle: 'Two charts with one cursor: the same year in both',
  source: `${co2.source}; ${anomaly.source}`,
  width: 720,
  hover: { x: 0.74, y: 0.5 },
  render(body) {
    for (const [heading, page] of [
      ['Atmospheric CO₂, annual mean at Mauna Loa', co2],
      ['Global temperature, difference from the 1951–1980 mean', anomaly],
    ] as const) {
      body.append(el('div', 'stack-title', heading))
      chart(body, { title: heading, ...page.config, aspectRatio: 3.6 }, page.style)
    }
  },
})
