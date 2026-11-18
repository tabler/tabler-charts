import { Chart, type FunnelStage, funnel } from '@tabler/charts'
import type { Demo } from '../demo.ts'

/** A month of a shop's checkout, from the first visit to the order. */
const CHECKOUT: FunnelStage[] = [
  { name: 'Visits', value: 48200 },
  { name: 'Product views', value: 31400 },
  { name: 'Added to cart', value: 12800 },
  { name: 'Checkout', value: 6900 },
  { name: 'Purchases', value: 4100 },
]

/** A sales pipeline in USD: the order is the process, so a stage may outgrow the one before. */
const PIPELINE: FunnelStage[] = [
  { name: 'Leads', value: 920000 },
  { name: 'Qualified', value: 540000 },
  { name: 'Proposal', value: 610000 },
  { name: 'Negotiation', value: 280000 },
  { name: 'Won', value: 195000 },
]

/** New values that only ever lose, each stage keeping 35–85% of the one before. */
const shuffle = (stages: readonly FunnelStage[]): FunnelStage[] => {
  let value = Math.round(20000 + Math.random() * 60000)
  return stages.map((stage, i) => {
    if (i > 0) value = Math.round(value * (0.35 + Math.random() * 0.5))
    return { ...stage, value }
  })
}

export const funnelDemo: Demo = {
  id: 'funnel',
  title: 'Funnel',
  description:
    'How many get from one stage of a process to the next. Every stage is a column with its name, its value and its share of the first stage on top; the shapes step down from each stage to the next in one color that deepens as the funnel narrows (--tc-funnel-color). Stages are drawn in their order, not sorted; hovering a column shows its value with the share of the first and of the previous stage.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: funnel,
      data: CHECKOUT,
      locale: 'en-US',
      aspectRatio: 2.4,
      title: 'Checkout funnel',
    })

    controls.select('Data', ['Checkout', 'Pipeline (USD)'] as const, 'Checkout', (v) =>
      chart.update(
        v === 'Checkout'
          ? { data: CHECKOUT, format: undefined, title: 'Checkout funnel' }
          : {
              data: PIPELINE,
              format: { style: 'currency', currency: 'USD', notation: 'compact' },
              title: 'Sales pipeline',
            },
      ),
    )
    controls.button('Random values', () =>
      chart.setData(shuffle(chart.config.data as FunnelStage[])),
    )
    controls.select('Labels', ['on', 'off'] as const, 'on', (value) =>
      chart.update({ labels: value === 'on' }),
    )
    controls.color('Color', '#2a78d6', (value) => el.style.setProperty('--tc-funnel-color', value))
    controls.range('Radius', { min: 0, max: 16, step: 1, value: 4 }, (radius) =>
      chart.update({ radius }),
    )
  },
}
