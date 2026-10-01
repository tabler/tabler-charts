// @vitest-environment happy-dom
import { describe, expect, test } from 'vitest'
import type { ChartConfig, ChartType } from './chart.ts'
import { Chart } from './chart-default.ts'
import { area } from './charts/area.ts'
import { bar } from './charts/bar.ts'
import { candlestick } from './charts/candlestick.ts'
import { gauge } from './charts/gauge.ts'
import { heatmap } from './charts/heatmap.ts'
import { line } from './charts/line.ts'
import { donut, pie } from './charts/pie.ts'
import { scatter } from './charts/scatter.ts'
import { sparkline } from './charts/sparkline.ts'
import './annotations.ts'
import './decimate.ts'
import './line.ts'
import './log.ts'
import { flush } from './scheduler.ts'
import './time.ts'

/**
 * Randomized DOM-level test: mount charts with random configs, then apply
 * random sequences of updates, hovers, legend toggles and type switches,
 * checking the DOM stays consistent after every step. Seeded, so failures
 * reproduce; bump ITERATIONS locally to dig deeper.
 */
const ITERATIONS = 60
const STEPS = 12

let seed = 20260930
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)] as T
const maybe = <T>(p: number, v: T): T | undefined => (rnd() < p ? v : undefined)

const value = (): number | null => {
  const r = rnd()
  if (r < 0.06) return null
  const magnitude = pick([1, 10, 1000, 1e6])
  return (rnd() - (rnd() < 0.3 ? 0.5 : 0)) * magnitude
}

const series = (n: number, len: number) =>
  Array.from({ length: n }, (_, i) => ({
    name: `${pick(['A', 'B', 'Long name & <b>', ''])}${i}`,
    values: Array.from({ length: len }, value),
    hidden: maybe(0.15, true),
    color: maybe(0.2, '#f00'),
    type: maybe(0.15, pick(['line', 'area'] as const)),
    dash: maybe(0.1, 4),
  }))

const cartesianTypes: ChartType<object>[] = [line, area, bar] as ChartType<object>[]
const pieTypes: ChartType<object>[] = [pie, donut] as ChartType<object>[]

/** Whether two chart types share a data shape (so configs can be mixed). */
const sameFamily = (a: ChartType<object>, b: ChartType<object>): boolean =>
  a === b ||
  (cartesianTypes.includes(a) && cartesianTypes.includes(b)) ||
  (pieTypes.includes(a) && pieTypes.includes(b)) ||
  // A heatmap takes the same data as line / area / bar.
  (a === heatmap && cartesianTypes.includes(b)) ||
  (b === heatmap && cartesianTypes.includes(a))

/** A random config for the same family as `type`. */
function randomConfigLike(type: ChartType<object>): ChartConfig<object> {
  for (;;) {
    const next = randomConfig()
    if (sameFamily(next.type, type)) return { ...next, type }
  }
}

function randomConfig(): ChartConfig<object> {
  const len = pick([0, 1, 2, 5, 12, 40])
  const n = pick([0, 1, 2, 3])
  const timeLabels = rnd() < 0.3
  const labels = timeLabels
    ? Array.from({ length: len }, (_, i) => Date.UTC(2026, 0, 1) + i * 86400e3)
    : Array.from({ length: len }, (_, i) => `L${i}`)
  const base = {
    width: pick([200, 400, 800]),
    height: pick([120, 240]),
    locale: 'en-US',
    title: maybe(0.5, 'Title'),
    tooltip: maybe(0.2, false),
    legend: maybe(0.3, pick([false, true, { position: 'bottom' as const }])),
    table: maybe(0.3, pick([false, 'visible' as const])),
    keyboard: maybe(0.2, false),
    animate: maybe(0.3, false),
  }
  const kind = pick([
    'cartesian',
    'cartesian',
    'pie',
    'scatter',
    'sparkline',
    'gauge',
    'heatmap',
    'candlestick',
  ])
  if (kind === 'candlestick') {
    return {
      type: candlestick,
      ...base,
      data: labels.map((x) => {
        const open = value() ?? Number.NaN
        const close = value() ?? 0
        return {
          x,
          open,
          close,
          high: Math.max(open, close) + rnd() * 10,
          low: Math.min(open, close) - rnd() * 10,
        }
      }),
      x: { type: timeLabels && rnd() < 0.7 ? 'time' : 'category', utc: true },
      y: { scale: maybe(0.2, 'log' as const) },
    } as ChartConfig<object>
  }
  if (kind === 'heatmap') {
    return {
      type: heatmap,
      ...base,
      data: { labels: labels.map(String), series: series(n, len) },
      min: maybe(0.2, 0),
      max: maybe(0.2, pick([0, 10])),
      gap: maybe(0.3, pick([0, 50])),
    } as ChartConfig<object>
  }
  if (kind === 'gauge') {
    const rings = series(n, 1).map((s) => ({
      name: s.name,
      value: s.values[0] ?? 0,
      max: maybe(0.3, pick([0, 50, 1000])),
      hidden: s.hidden,
    }))
    return {
      type: gauge,
      ...base,
      data: n === 0 ? rnd() * 150 : rings,
      angle: maybe(0.4, pick([0, 180, 270])),
      startAngle: maybe(0.4, -135),
      thickness: maybe(0.3, pick([1, 30, 400])),
    } as ChartConfig<object>
  }
  if (kind === 'pie') {
    return {
      type: pick([pie, donut]),
      ...base,
      data: series(n, 1).map((s) => ({
        name: s.name,
        value: Math.abs(s.values[0] ?? 0),
        hidden: s.hidden,
      })),
    } as ChartConfig<object>
  }
  if (kind === 'scatter') {
    return {
      type: scatter,
      ...base,
      data: {
        series: series(n, len).map((s) => ({
          ...s,
          points: s.values.map((v, i) => ({
            x: i * (rnd() + 0.5),
            y: v ?? 0,
            size: maybe(0.5, rnd() * 10),
          })),
        })),
      },
      y: maybe(0.3, { scale: 'log' as const }),
    } as ChartConfig<object>
  }
  if (kind === 'sparkline') {
    return {
      type: sparkline,
      ...base,
      data: Array.from({ length: len }, value),
      variant: pick(['line', 'area', 'bar']),
      markers: maybe(0.5, 'minmax'),
    } as ChartConfig<object>
  }
  return {
    type: pick(cartesianTypes),
    ...base,
    data: { labels, series: series(n, len) },
    x: { type: timeLabels && rnd() < 0.7 ? 'time' : 'category', utc: true, grid: maybe(0.3, true) },
    y: {
      scale: maybe(0.2, 'log' as const),
      zero: maybe(0.3, true),
      format: maybe(0.3, { style: 'percent' as const }),
    },
    stacked: maybe(0.3, pick([true, 'percent' as const])),
    orientation: maybe(0.3, 'horizontal' as const),
    curve: pick(['linear', 'monotone', 'step']),
    points: pick(['none', 'last', 'all']),
    decimate: maybe(0.2, 3),
    annotations: maybe(
      0.3,
      Array.from({ length: pick([1, 2, 3]) }, () =>
        pick([
          { y: value() ?? 0, label: maybe(0.5, 'Target') },
          { y: [value() ?? 0, value() ?? 1] as [number, number], label: maybe(0.5, 'Band') },
          { x: labels.length ? pick<string | number>(labels) : 'none', label: maybe(0.5, 'Event') },
          {
            x: [labels[0] ?? 'a', labels[labels.length - 1] ?? 'b'] as [
              string | number,
              string | number,
            ],
            color: maybe(0.5, '#f00'),
          },
        ]),
      ),
    ),
  } as ChartConfig<object>
}

/** Invariants that must hold for any mounted chart. */
function check(el: HTMLElement, chart: Chart<object>, step: string): void {
  const html = el.innerHTML
  const bad = html.match(/.{0,80}(NaN|Infinity|undefined).{0,40}/)
  expect(bad?.[0] ?? '', `${step}: NaN in DOM`).toBe('')
  const svgs = el.querySelectorAll(':scope > svg.tc-chart')
  expect(svgs.length, `${step}: exactly one svg`).toBe(1)
  // Ids inside the chart are unique.
  const ids = Array.from(el.querySelectorAll('[id]')).map((n) => n.id)
  expect(new Set(ids).size, `${step}: duplicate ids ${ids.join(',')}`).toBe(ids.length)
  // At most one legend, one tooltip, one table, one live region.
  for (const cls of ['.tc-legend', '.tc-tooltip', '.tc-table-wrap', '[aria-live]']) {
    expect(el.querySelectorAll(cls).length, `${step}: ${cls}`).toBeLessThanOrEqual(1)
  }
  // Legend buttons mirror hidden state.
  for (const button of el.querySelectorAll<HTMLButtonElement>('.tc-legend-item')) {
    const key = button.dataset.key ?? ''
    expect(button.getAttribute('aria-pressed'), `${step}: legend ${key}`).toBe(
      String(!chart.isHidden(key)),
    )
  }
  // Hidden series draw nothing.
  for (const group of el.querySelectorAll<SVGGElement>('.tc-series-list .tc-series')) {
    const name = group.dataset.series
    if (name !== undefined) expect(chart.isHidden(name), `${step}: hidden series drawn`).toBe(false)
  }
}

describe('randomized DOM sessions', () => {
  test(`survive ${ITERATIONS} sessions of ${STEPS} steps`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const el = document.createElement('div')
      document.body.appendChild(el)
      let config = randomConfig()
      let chart: Chart<object> | undefined
      try {
        chart = new Chart(el, config)
        const svg = () => el.querySelector('svg') as SVGSVGElement
        svg().getBoundingClientRect = () =>
          ({ left: 0, top: 0, width: config.width, height: config.height }) as DOMRect
        check(el, chart, `session ${i} mount`)
        for (let s = 0; s < STEPS; s++) {
          const action = pick([
            'update',
            'hover',
            'leave',
            'toggle',
            'key',
            'retype',
            'resize',
            'data',
          ])
          switch (action) {
            case 'update':
              config = randomConfigLike(config.type)
              chart.update(config)
              break
            case 'data':
              chart.update({
                data: (randomConfigLike(config.type) as unknown as { data: unknown }).data,
              } as never)
              break
            case 'hover':
              svg().dispatchEvent(
                new PointerEvent('pointermove', {
                  clientX: rnd() * (config.width ?? 400),
                  clientY: rnd() * (typeof config.height === 'number' ? config.height : 200),
                  bubbles: true,
                }),
              )
              break
            case 'leave':
              el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
              break
            case 'toggle': {
              const buttons = el.querySelectorAll<HTMLButtonElement>('.tc-legend-item')
              if (buttons.length) pick(Array.from(buttons)).click()
              else chart.toggleSeries(Math.floor(rnd() * 3))
              break
            }
            case 'key':
              svg().dispatchEvent(
                new KeyboardEvent('keydown', {
                  key: pick([
                    'ArrowRight',
                    'ArrowLeft',
                    'ArrowDown',
                    'ArrowUp',
                    'Home',
                    'End',
                    'Escape',
                  ]),
                  bubbles: true,
                  cancelable: true,
                }),
              )
              break
            case 'retype':
              if (cartesianTypes.includes(config.type)) {
                config = { ...config, type: pick(cartesianTypes) }
                chart.update({ type: config.type })
              }
              break
            case 'resize':
              config = { ...config, width: pick([150, 400, 900]) }
              chart.update({ width: config.width })
              break
          }
          flush()
          check(el, chart, `session ${i} step ${s} (${action})`)
        }
      } finally {
        chart?.destroy()
        expect(el.innerHTML, `session ${i}: clean after destroy`).toBe('')
        el.remove()
      }
    }
  })
})
