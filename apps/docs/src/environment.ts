/**
 * Hostile page CSS and unusual containers: environment.html?case=<id>
 * renders one case on a page of its own (so its CSS cannot leak into the
 * others); environments.html shows every case side by side in iframes.
 * tests/visual/environments.spec.ts checks each case in three engines.
 */
import '@tabler/charts/style.css'
import { bar, Chart, type ChartConfig } from '@tabler/charts'
import { CHART, ENVIRONMENTS } from './environment-cases.ts'

export { ENVIRONMENTS }

/** The chart every case renders: grouped bars with a legend, a tooltip and a table. */
export const config: ChartConfig<object> = {
  type: bar,
  locale: 'en-US',
  title: 'Revenue by quarter',
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'],
    series: [
      { name: 'North', values: [42, 51, 47, 63, 58, 71] },
      { name: 'South', values: [31, 35, 33, 40, 44, 46] },
    ],
  },
  y: { format: { style: 'currency', currency: 'USD' } },
} as ChartConfig<object>

/** Render the case named in ?case= on this page. */
export async function renderEnvironment(): Promise<void> {
  const id = new URLSearchParams(location.search).get('case')
  const item = ENVIRONMENTS.find((e) => e.id === id)
  if (!item) {
    document.body.textContent = `Unknown case: ${id}`
    return
  }
  for (const [name, value] of Object.entries(item.root ?? {})) {
    document.documentElement.setAttribute(name, value)
  }
  if (item.css) {
    const style = document.createElement('style')
    style.textContent = item.css
    document.head.append(style)
  }
  document.body.innerHTML = item.html ?? CHART
  const host = document.querySelector('[data-chart]') as HTMLElement
  new Chart(host, config)
  await item.after?.(host)
  document.body.dataset.ready = ''
}
