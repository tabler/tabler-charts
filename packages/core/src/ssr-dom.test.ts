// @vitest-environment happy-dom
/**
 * The string renderer (SSR) and the DOM renderer must produce the same chart
 * for the same config: hydration then has nothing to patch. Random configs
 * of every type are rendered both ways and compared, after normalizing what
 * only differs in spelling (self-closing tags, `<` escaped in attributes, the
 * xmlns attribute, the spacing of styles) or only exists in the browser (tabindex, the transient
 * resize flag). FUZZ_ITERATIONS and FUZZ_SEED dig deeper locally.
 */
import { expect, test } from 'vitest'
import './annotations.ts'
import { area } from './charts/area.ts'
import { bar } from './charts/bar.ts'
import { calendar } from './charts/calendar.ts'
import { candlestick } from './charts/candlestick.ts'
import { gauge } from './charts/gauge.ts'
import { heatmap } from './charts/heatmap.ts'
import { line } from './charts/line.ts'
import { donut, pie } from './charts/pie.ts'
import { radar } from './charts/radar.ts'
import { scatter } from './charts/scatter.ts'
import { sparkline } from './charts/sparkline.ts'
import { Chart, type ChartConfig, chartToString } from './core.ts'
import './decimate.ts'
import './line.ts'
import './log.ts'
import './time.ts'

let seed = Number(process.env.FUZZ_SEED ?? 20261001)
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)] as T
const val = () =>
  rnd() < 0.08 ? null : Math.round((rnd() - 0.3) * pick([1, 100, 1e5]) * 100) / 100
const series = (n: number, len: number) =>
  Array.from({ length: n }, (_, i) => ({
    name: `${pick(['A', 'B & <C>', '"q"'])}${i}`,
    values: Array.from({ length: len }, val),
    type: rnd() < 0.15 ? pick(['line', 'area'] as const) : undefined,
    dash: rnd() < 0.1 ? 4 : undefined,
  }))

function config(): ChartConfig<object> {
  const len = pick([0, 1, 3, 12])
  const labels = Array.from({ length: len }, (_, i) =>
    rnd() < 0.3 ? Date.UTC(2026, 0, 1 + i) : `L${i}`,
  )
  const common = {
    id: 'x',
    locale: 'en-US',
    title: rnd() < 0.5 ? 'T & <t>' : undefined,
    description: rnd() < 0.3 ? 'D' : undefined,
  }
  const kind = pick([
    'line',
    'area',
    'bar',
    'pie',
    'donut',
    'scatter',
    'sparkline',
    'gauge',
    'heatmap',
    'calendar',
    'candlestick',
    'radar',
  ])
  const cart = {
    data: { labels, series: series(pick([1, 2, 3]), len) },
    annotations: rnd() < 0.3 ? [{ y: val() ?? 0, label: 'Goal' }] : undefined,
    stacked: rnd() < 0.2 ? pick([true, 'percent'] as const) : undefined,
    orientation: rnd() < 0.2 ? 'horizontal' : undefined,
  }
  switch (kind) {
    case 'line':
      return { type: line, ...common, ...cart, points: pick(['none', 'all', 'last']) } as never
    case 'area':
      return { type: area, ...common, ...cart } as never
    case 'bar':
      return { type: bar, ...common, ...cart } as never
    case 'pie':
    case 'donut':
      return {
        type: kind === 'pie' ? pie : donut,
        ...common,
        data: series(pick([1, 3, 5]), 1).map((s) => ({
          name: s.name,
          value: Math.abs(s.values[0] ?? 0),
        })),
      } as never
    case 'scatter':
      return {
        type: scatter,
        ...common,
        data: {
          series: series(2, len).map((s) => ({
            name: s.name,
            points: s.values.map((v, i) => ({
              x: i,
              y: v ?? 0,
              size: rnd() < 0.5 ? rnd() * 10 : undefined,
            })),
          })),
        },
      } as never
    case 'sparkline':
      return {
        type: sparkline,
        ...common,
        data: Array.from({ length: len }, val),
        variant: pick(['line', 'area', 'bar', 'tristate']),
      } as never
    case 'gauge':
      return { type: gauge, ...common, data: rnd() * 120 } as never
    case 'radar':
      return {
        type: radar,
        ...common,
        data: { labels: labels.map(String), series: series(pick([1, 2, 3]), len) },
        grid: rnd() < 0.3 ? 'circle' : undefined,
        points: rnd() < 0.3,
      } as never
    case 'calendar':
      return {
        type: calendar,
        ...common,
        utc: true,
        data: {
          series: series(pick([1, 2]), len).map((s) => ({
            name: s.name,
            values: s.values.map((value, i) => ({ date: Date.UTC(2026, 2, 1 + i * 3), value })),
          })),
        },
        weeks: rnd() < 0.3 ? 8 : undefined,
      } as never
    case 'heatmap':
      return {
        type: heatmap,
        ...common,
        data: { labels: labels.map(String), series: series(3, len) },
        colorBy: rnd() < 0.3 ? 'series' : 'value',
      } as never
    default:
      return {
        type: candlestick,
        ...common,
        data: labels.map((x) => ({ x, open: 10, high: 12 + rnd(), low: 8, close: 9 + rnd() * 3 })),
      } as never
  }
}

test('the string and DOM renderers agree on random configs', () => {
  const n = Number(process.env.FUZZ_ITERATIONS ?? 150)
  const mismatches: string[] = []
  for (let i = 0; i < n; i++) {
    const c = config()
    const size = { width: pick([200, 400, 700]), height: pick([120, 260]) }
    const ssr = chartToString(c, size)
    const el = document.createElement('div')
    document.body.append(el)
    const chart = new Chart(el, { ...c, ...size, animate: false } as never)
    const dom = (el.querySelector('svg') as SVGSVGElement).outerHTML
    chart.destroy()
    el.remove()
    // Spelling differences, and what only the browser needs.
    const norm = (s: string) =>
      s
        .replace(/<([a-zA-Z]+)([^<>]*?)\/>/g, '<$1$2></$1>')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(' xmlns="http://www.w3.org/2000/svg"', '')
        .replace(/ class="tc-chart( [^"]*)?"/, '')
        .replace(/ data-resizing=""/g, '')
        .replace(/ tabindex="0"/g, '')
        // The DOM sets styles through the CSSOM, which spells them its own way.
        .replace(/ style="([^"]*)"/g, (_, style: string) => {
          const rules = style.split(';').map((rule) => rule.trim().replace(/:\s*/, ':'))
          return ` style="${rules.filter(Boolean).join(';')}"`
        })
    if (norm(ssr) !== norm(dom)) {
      const a = norm(ssr),
        b = norm(dom)
      let k = 0
      while (k < a.length && a[k] === b[k]) k++
      mismatches.push(
        `${i} ${c.type.name}: …${a.slice(Math.max(0, k - 60), k + 60)}\n   vs …${b.slice(Math.max(0, k - 60), k + 60)}`,
      )
    }
  }
  expect(mismatches.slice(0, 3).join('\n'), `${mismatches.length} of ${n} differ`).toBe('')
}, 120_000)
