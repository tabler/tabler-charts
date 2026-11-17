// @vitest-environment happy-dom
/**
 * Colors and dashes often come from user data (a dashboard's settings, an
 * API). None may inject CSS into the chart's elements, nor make the browser
 * load anything: on the server (chartToString) and in the DOM.
 */
import { afterEach, describe, expect, test } from 'vitest'
import { type ChartConfig, chartToString } from './chart.ts'
import { Chart } from './chart-default.ts'
import './annotations.ts'
import { bar } from './charts/bar.ts'
import { calendar } from './charts/calendar.ts'
import { gauge } from './charts/gauge.ts'
import { heatmap } from './charts/heatmap.ts'
import { line } from './charts/line.ts'
import { parliament } from './charts/parliament.ts'
import { percentageBar } from './charts/percentage-bar.ts'
import { pie } from './charts/pie.ts'
import { scatter } from './charts/scatter.ts'
import { treemap } from './charts/treemap.ts'
import { flush } from './scheduler.ts'
import { normalizeStyle } from './vnode.ts'

const EVIL = 'red;position:fixed;inset:0;background:url(https://attacker.example/x)'
/** Anything that escaped its value: an extra declaration, or a resource. */
const injected = (markup: string) => /position:fixed|url\(https|attacker/.test(markup)

const size = { width: 400, height: 200 }
const labels = ['a', 'b']
const cases: [string, Record<string, unknown>][] = [
  [
    'series color',
    { type: line, data: { labels, series: [{ name: 'A', color: EVIL, values: [1, 2] }] } },
  ],
  [
    'series dash',
    { type: line, data: { labels, series: [{ name: 'A', dash: EVIL, values: [1, 2] }] } },
  ],
  // From JSON (an element attribute), a width can be any string.
  [
    'series width',
    { type: bar, data: { labels, series: [{ name: 'A', width: EVIL, values: [1, 2] }] } },
  ],
  [
    'pie slice',
    {
      type: pie,
      data: [
        { name: 'A', value: 1, color: EVIL },
        { name: 'B', value: 2 },
      ],
    },
  ],
  ['gauge ring', { type: gauge, data: { name: 'A', value: 4, color: EVIL } }],
  ['parliament party', { type: parliament, data: [{ name: 'A', seats: 4, color: EVIL }] }],
  ['percentage bar segment', { type: percentageBar, data: [{ name: 'A', value: 4, color: EVIL }] }],
  [
    'treemap tile',
    {
      type: treemap,
      data: [
        { name: 'A', value: 4, color: EVIL },
        { name: 'B', children: [{ name: 'C', value: 2, color: EVIL }] },
      ],
    },
  ],
  [
    'scatter series',
    { type: scatter, data: { series: [{ name: 'A', color: EVIL, points: [{ x: 1, y: 2 }] }] } },
  ],
  [
    'calendar series',
    {
      type: calendar,
      data: { series: [{ name: 'A', color: EVIL, values: [{ date: '2026-01-05', value: 1 }] }] },
    },
  ],
  [
    'heatmap ranges',
    {
      type: heatmap,
      data: { labels, series: [{ name: 'A', values: [1, 2] }] },
      ranges: [{ to: 5, color: EVIL }],
    },
  ],
  [
    'heatmap scale',
    {
      type: heatmap,
      data: { labels, series: [{ name: 'A', values: [1, 2] }] },
      colors: [EVIL, 'blue'],
    },
  ],
  [
    'heatmap rows',
    {
      type: heatmap,
      colorBy: 'series',
      data: { labels, series: [{ name: 'A', color: EVIL, values: [1, 2] }] },
    },
  ],
  [
    'annotation',
    {
      type: line,
      data: { labels, series: [{ name: 'A', values: [1, 2] }] },
      annotations: [{ y: 1, color: EVIL }],
    },
  ],
]

afterEach(() => {
  document.body.innerHTML = ''
})

describe('style injection', () => {
  for (const [name, config] of cases) {
    test(`a ${name} cannot inject CSS, on the server or in the DOM`, () => {
      const full = { locale: 'en-US', id: 's', ...config } as ChartConfig<object>
      expect(injected(chartToString(full, size))).toBe(false)
      const el = document.createElement('div')
      document.body.append(el)
      const chart = new Chart(el, { ...full, width: 400, height: 200 })
      // The legend, tooltip and hover marks carry the colors too.
      chart.highlightIndex(0)
      flush()
      expect(injected(el.innerHTML)).toBe(false)
      chart.destroy()
    })
  }

  test('a safe color still applies', () => {
    const svg = chartToString(
      {
        type: line,
        locale: 'en-US',
        id: 's',
        data: { labels, series: [{ name: 'A', color: 'var(--bs-success)', values: [1, 2] }] },
      } as ChartConfig<object>,
      size,
    )
    expect(svg).toContain('--tc-series-color:var(--bs-success)')
  })

  test('only a reference to an element of the page passes as url()', () => {
    expect(normalizeStyle({ fill: 'url(#tc-pattern-1)' })).toBe('fill:url(#tc-pattern-1)')
    for (const bad of [
      'url(https://attacker.example/x)',
      'url(#a) url(//attacker.example)',
      'url( #a)',
      'url(#a b)',
      'url(#a?x)',
      'URL(data:x)',
    ]) {
      expect(normalizeStyle({ fill: bad }), bad).toBe('')
    }
  })
})
