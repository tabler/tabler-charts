import { Chart, type TreemapNode, treemap } from '@tabler/charts'
import type { Demo } from '../demo.ts'

/** Where a small product team's monthly budget goes, in USD. */
const BUDGET: TreemapNode[] = [
  {
    name: 'Engineering',
    children: [
      { name: 'Salaries', value: 182000 },
      { name: 'Cloud', value: 46000 },
      { name: 'Tools', value: 12500 },
      { name: 'Contractors', value: 28000 },
    ],
  },
  {
    name: 'Marketing',
    children: [
      { name: 'Ads', value: 64000 },
      { name: 'Events', value: 22000 },
      { name: 'Content', value: 15000 },
    ],
  },
  {
    name: 'Sales',
    children: [
      { name: 'Salaries', value: 71000 },
      { name: 'Travel', value: 9500 },
    ],
  },
  { name: 'Office', value: 31000 },
  { name: 'Legal', value: 8000 },
]

/** Visits by browser, a flat list. */
const BROWSERS: TreemapNode[] = [
  { name: 'Chrome', value: 6480 },
  { name: 'Safari', value: 1820 },
  { name: 'Edge', value: 520 },
  { name: 'Firefox', value: 250 },
  { name: 'Samsung Internet', value: 240 },
  { name: 'Opera', value: 190 },
]

const shuffle = (nodes: readonly TreemapNode[]): TreemapNode[] =>
  nodes.map((node) =>
    node.children
      ? { ...node, children: shuffle(node.children) }
      : { ...node, value: Math.round(5000 + Math.random() * 150000) },
  )

export const treemapDemo: Demo = {
  id: 'treemap',
  title: 'Treemap',
  description:
    'Parts of a whole as tiles, each as large as its value, squarified with the largest in the top left corner. Entries with children are groups: their tiles stay together and share a palette color. Names and values are written where they fit, and --tc-treemap-opacity fades the tiles; hovering a tile shows its value and share, and the legend toggles the groups.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: treemap,
      data: BUDGET,
      locale: 'en-US',
      aspectRatio: 2,
      format: { style: 'currency', currency: 'USD', notation: 'compact' },
      title: 'Monthly budget',
    })

    controls.select(
      'Data',
      ['Budget (groups)', 'Browsers (flat)'] as const,
      'Budget (groups)',
      (v) =>
        chart.update(
          v === 'Budget (groups)'
            ? {
                data: BUDGET,
                format: { style: 'currency', currency: 'USD', notation: 'compact' },
                title: 'Monthly budget',
              }
            : { data: BROWSERS, format: undefined, title: 'Visits by browser' },
        ),
    )
    controls.button('Random values', () =>
      chart.setData(shuffle(chart.config.data as TreemapNode[])),
    )
    controls.select('Labels', ['on', 'off'] as const, 'on', (value) =>
      chart.update({ labels: value === 'on' }),
    )
    controls.range('Fade', { min: 0.2, max: 1, step: 0.05, value: 1 }, (value) =>
      el.style.setProperty('--tc-treemap-opacity', String(value)),
    )
    controls.range('Gap', { min: 0, max: 8, step: 1, value: 2 }, (gap) => chart.update({ gap }))
    controls.range('Radius', { min: 0, max: 12, step: 1, value: 3 }, (radius) =>
      chart.update({ radius }),
    )
  },
}
