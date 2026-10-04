import { area, bar, Chart, donut, line } from '@tabler/charts'
import type { Demo } from '../demo.ts'

export const patternsDemo: Demo = {
  id: 'patterns',
  title: 'Pattern fills',
  description:
    'Series that do not depend on color alone, for color vision deficiency, grayscale print and forced colors: every slot has a pattern (lines, dots, hatching…) over its color, lines a dash and points a shape. The patterns option draws them always (true), only in forced colors such as Windows High Contrast (auto, the default) or never (false). Legend and tooltip swatches match.',
  mount(el, controls) {
    el.classList.add('demo-quad')
    const host = () => {
      const div = document.createElement('div')
      el.append(div)
      return div
    }
    const labels = ['Q1', 'Q2', 'Q3', 'Q4']
    const charts = [
      new Chart(host(), {
        type: bar,
        locale: 'en-US',
        title: 'Signups by plan',
        patterns: true,
        data: {
          labels,
          series: [
            { name: 'Free', values: [42, 51, 47, 63] },
            { name: 'Pro', values: [31, 35, 39, 44] },
            { name: 'Team', values: [18, 22, 27, 31] },
            { name: 'Enterprise', values: [8, 11, 13, 17] },
          ],
        },
      }),
      new Chart(host(), {
        type: donut,
        locale: 'en-US',
        title: 'Traffic sources',
        patterns: true,
        data: [
          { name: 'Search', value: 42 },
          { name: 'Direct', value: 27 },
          { name: 'Social', value: 16 },
          { name: 'Email', value: 9 },
          { name: 'Other', value: 6 },
        ],
      }),
      new Chart(host(), {
        type: line,
        locale: 'en-US',
        title: 'Response time',
        patterns: true,
        points: 'all',
        data: {
          labels,
          series: [
            { name: 'API', values: [120, 135, 128, 142] },
            { name: 'Web', values: [180, 172, 190, 176] },
            { name: 'Jobs', values: [90, 110, 104, 98] },
          ],
        },
      }),
      new Chart(host(), {
        type: area,
        locale: 'en-US',
        title: 'Storage by region',
        patterns: true,
        stacked: true,
        data: {
          labels,
          series: [
            { name: 'EU', values: [12, 15, 19, 22] },
            { name: 'US', values: [9, 13, 14, 18] },
            { name: 'Asia', values: [4, 6, 9, 13] },
          ],
        },
      }),
    ]
    controls.select('Patterns', ['on', 'auto', 'off'] as const, 'on', (value) => {
      const patterns = value === 'on' ? true : value === 'off' ? false : 'auto'
      for (const chart of charts) chart.update({ patterns })
    })
  },
}
