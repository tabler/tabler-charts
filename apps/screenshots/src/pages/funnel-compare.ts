import { funnel } from '@tabler/charts'
import { chart, el } from '../dom.ts'
import { C, definePage } from '../page.ts'

// An A/B test of a made-up checkout: the same visitors, two funnels.
const STAGES = ['Cart', 'Checkout', 'Payment', 'Paid']
const VARIANTS: [name: string, note: string, values: number[], color: string][] = [
  ['Three-step checkout', '18.9% of carts paid', [12400, 6820, 3610, 2340], C.slate],
  ['One-page checkout', '25.3% of carts paid', [12380, 8110, 4720, 3130], C.teal],
]

export default definePage({
  title: 'Two checkouts, one test',
  subtitle: 'Carts that reach each step, four weeks of an A/B test',
  width: 820,
  render(body) {
    const panels = el('div', 'panels')
    panels.style.gridTemplateColumns = '1fr 1fr'
    panels.style.marginTop = '0'
    for (const [name, note, values, color] of VARIANTS) {
      const panel = el('div', 'panel')
      const heading = el('div', 'tile-heading')
      heading.append(el('span', '', name), el('span', 'tile-label', note))
      panel.append(heading)
      chart(
        panel,
        {
          type: funnel,
          title: name,
          data: STAGES.map((stage, index) => ({ name: stage, value: values[index] as number })),
          aspectRatio: 1.45,
        },
        { '--tc-funnel-color': color, 'margin-top': '10px' },
      )
      panels.append(panel)
    }
    body.append(panels)
  },
})
