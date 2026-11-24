// @vitest-environment happy-dom
import { expect, test } from 'vitest'
import type { ChartConfig, ChartType } from './chart.ts'
import { Chart } from './chart.ts'
import { area } from './charts/area.ts'
import { bar } from './charts/bar.ts'
import { calendar } from './charts/calendar.ts'
import { candlestick } from './charts/candlestick.ts'
import { funnel } from './charts/funnel.ts'
import { gauge } from './charts/gauge.ts'
import { heatmap } from './charts/heatmap.ts'
import { line } from './charts/line.ts'
import { parliament } from './charts/parliament.ts'
import { percentageBar } from './charts/percentage-bar.ts'
import { donut, pie } from './charts/pie.ts'
import { radar } from './charts/radar.ts'
import { sankey } from './charts/sankey.ts'
import { scatter } from './charts/scatter.ts'
import { sparkline } from './charts/sparkline.ts'
import { treemap } from './charts/treemap.ts'
import './line.ts'
import { flush } from './scheduler.ts'
import { missingTypes } from './test-utils.ts'

/**
 * Updates between extreme states (empty, one point, all zeros, negative,
 * hundreds of points, nine series, everything hidden…) of every type:
 * after `update()` the DOM must be what a fresh chart of the new state
 * renders, and marks that stay on screen must keep the shape of their path
 * (same commands), so CSS can animate them instead of jumping. The bare
 * Chart, without the HTML plugins: happy-dom keeps the memory of every
 * destroyed legend and table (see bad-data.test.ts).
 */

const labels = (n: number, from = 0) => Array.from({ length: n }, (_, i) => `L${i + from}`)
const values = (n: number, f: (i: number) => number | null) =>
  Array.from({ length: n }, (_, i) => f(i))
const series = (n: number, len: number, f: (s: number, i: number) => number | null) =>
  Array.from({ length: n }, (_, s) => ({ name: `S${s}`, values: values(len, (i) => f(s, i)) }))
const wave = (s: number, i: number) => Math.round(50 + 40 * Math.sin(i / 2 + s))

const SERIES_STATES: Record<string, unknown> = {
  empty: { labels: [], series: [] },
  'no series': { labels: labels(5), series: [] },
  'one point': { labels: labels(1), series: series(1, 1, () => 5) },
  'all null': { labels: labels(6), series: series(2, 6, () => null) },
  'all zero': { labels: labels(6), series: series(2, 6, () => 0) },
  negative: { labels: labels(6), series: series(2, 6, (s, i) => -wave(s, i)) },
  'mixed sign': { labels: labels(6), series: series(2, 6, (s, i) => wave(s, i) - 50) },
  regular: { labels: labels(6), series: series(2, 6, wave) },
  shifted: { labels: labels(6, 1), series: series(2, 6, (s, i) => wave(s, i + 1)) },
  gaps: { labels: labels(6), series: series(2, 6, (s, i) => (i % 2 ? null : wave(s, i))) },
  tiny: { labels: labels(6), series: series(2, 6, (s, i) => wave(s, i) / 1e4) },
  huge: { labels: labels(6), series: series(2, 6, (s, i) => wave(s, i) * 1e9) },
  'nine series': { labels: labels(6), series: series(9, 6, wave) },
  'all hidden': {
    labels: labels(6),
    series: series(2, 6, wave).map((s) => ({ ...s, hidden: true })),
  },
  'many points': { labels: labels(120), series: series(3, 120, wave) },
}

const OPTION_STATES: Record<string, Record<string, unknown>> = {
  plain: {},
  stacked: { stacked: true },
  percent: { stacked: 'percent' },
  horizontal: { orientation: 'horizontal' },
}

const PIE_STATES: Record<string, unknown> = {
  empty: [],
  one: [{ name: 'A', value: 1 }],
  zeros: [
    { name: 'A', value: 0 },
    { name: 'B', value: 0 },
  ],
  regular: ['A', 'B', 'C', 'D'].map((name, i) => ({ name, value: 10 + i * 7 })),
  dominant: ['A', 'B', 'C'].map((name, i) => ({ name, value: i ? 1 : 1000 })),
  twenty: Array.from({ length: 20 }, (_, i) => ({ name: `P${i}`, value: i + 1 })),
  hidden: ['A', 'B'].map((name) => ({ name, value: 5, hidden: true })),
}

const GAUGE_STATES: Record<string, unknown> = {
  zero: 0,
  half: 50,
  full: 100,
  over: 250,
  negative: -20,
  rings: [
    { name: 'A', value: 30 },
    { name: 'B', value: 80 },
    { name: 'C', value: 100 },
  ],
}

const point = (s: number, i: number) => ({ x: i * 3, y: wave(s, i), size: (i % 4) + 1 })
const SCATTER_STATES: Record<string, unknown> = {
  empty: { series: [] },
  one: { series: [{ name: 'A', points: [{ x: 1, y: 1 }] }] },
  regular: {
    series: [0, 1].map((s) => ({
      name: `S${s}`,
      points: values(20, (i) => i).map((i) => point(s, i as number)),
    })),
  },
  bubbles: {
    series: [{ name: 'S0', points: values(20, (i) => i).map((i) => point(0, i as number)) }],
    bubbles: true,
  },
  many: {
    series: [{ name: 'S0', points: values(600, (i) => i).map((i) => point(0, i as number)) }],
  },
}

const candle = (i: number, k = 1) => ({
  x: `2026-01-${String(i + 1).padStart(2, '0')}`,
  open: (50 + i) * k,
  high: (60 + i) * k,
  low: (40 + i) * k,
  close: (55 - (i % 3) * 5 + i) * k,
})
const CANDLE_STATES: Record<string, unknown> = {
  empty: [],
  one: [candle(0)],
  regular: values(20, (i) => i).map((i) => candle(i as number)),
  falling: values(20, (i) => i).map((i) => ({ ...candle(i as number), open: 80, close: 20 })),
  negative: values(20, (i) => i).map((i) => candle(i as number, -1)),
}

const day = (i: number): { date: number; value: number | null } => ({
  date: Date.UTC(2026, 0, 5 + i),
  value: wave(0, i),
})
const days = (n: number, f: (i: number) => ReturnType<typeof day>) =>
  Array.from({ length: n }, (_, i) => f(i))
const CALENDAR_STATES: Record<string, unknown> = {
  empty: [],
  one: [day(0)],
  'all zero': days(14, (i) => ({ ...day(i), value: 0 })),
  'all null': days(14, (i) => ({ ...day(i), value: null })),
  regular: days(30, day),
  shifted: days(30, (i) => day(i + 7)),
  'two series': {
    series: [
      { name: 'A', values: days(30, day) },
      { name: 'B', values: days(10, (i) => day(i * 3)) },
    ],
  },
  'all hidden': { series: [{ name: 'A', hidden: true, values: days(30, day) }] },
  year: days(365, day),
}

const SPARK_STATES: Record<string, unknown> = {
  empty: [],
  one: [5],
  flat: [3, 3, 3, 3],
  regular: values(12, (i) => wave(0, i)),
  many: values(400, (i) => wave(0, i)),
}

const SEAT_STATES: Record<string, unknown> = {
  empty: [],
  one: [{ name: 'A', seats: 1 }],
  zeros: [
    { name: 'A', seats: 0 },
    { name: 'B', seats: 0 },
  ],
  regular: ['A', 'B', 'C'].map((name, i) => ({ name, seats: 40 + i * 25 })),
  shifted: ['A', 'B', 'C'].map((name, i) => ({ name, seats: 70 - i * 10 })),
  hidden: ['A', 'B'].map((name) => ({ name, seats: 5, hidden: true })),
  many: Array.from({ length: 12 }, (_, i) => ({ name: `P${i}`, seats: 10 + i * 9 })),
}

const TREE_STATES: Record<string, unknown> = {
  ...PIE_STATES,
  nested: [
    { name: 'A', value: 40 },
    {
      name: 'B',
      children: [
        { name: 'B1', value: 18 },
        { name: 'B2', value: 9 },
      ],
    },
    { name: 'C', value: 12 },
  ],
}

const link = (from: string, to: string, value: number) => ({ from, to, value })
const FLOW_STATES: Record<string, unknown> = {
  empty: { links: [] },
  one: { links: [link('A', 'B', 5)] },
  zeros: { links: [link('A', 'B', 0), link('A', 'C', 0)] },
  regular: {
    links: [link('A', 'C', 30), link('B', 'C', 20), link('C', 'D', 35), link('C', 'E', 15)],
  },
  shifted: {
    links: [link('A', 'C', 10), link('B', 'C', 40), link('C', 'D', 25), link('C', 'E', 25)],
  },
  hidden: {
    nodes: [{ name: 'A', hidden: true }],
    links: [link('A', 'C', 30), link('B', 'C', 20)],
  },
  deep: {
    links: Array.from({ length: 8 }, (_, i) => link(`N${i}`, `N${i + 1}`, 10 + i)),
  },
}

type Family = {
  types: ChartType<object>[]
  states: Record<string, unknown>
  options?: Record<string, Record<string, unknown>>
}

const FAMILIES: Family[] = [
  {
    types: [line, area, bar] as ChartType<object>[],
    states: SERIES_STATES,
    options: OPTION_STATES,
  },
  { types: [heatmap, radar] as ChartType<object>[], states: SERIES_STATES },
  { types: [pie, donut] as ChartType<object>[], states: PIE_STATES },
  { types: [gauge] as ChartType<object>[], states: GAUGE_STATES },
  { types: [scatter] as ChartType<object>[], states: SCATTER_STATES },
  { types: [candlestick] as ChartType<object>[], states: CANDLE_STATES },
  { types: [calendar] as ChartType<object>[], states: CALENDAR_STATES },
  { types: [sparkline] as ChartType<object>[], states: SPARK_STATES },
  { types: [percentageBar, funnel] as ChartType<object>[], states: PIE_STATES },
  { types: [treemap] as ChartType<object>[], states: TREE_STATES },
  { types: [parliament] as ChartType<object>[], states: SEAT_STATES },
  { types: [sankey] as ChartType<object>[], states: FLOW_STATES },
]

test('covers every built-in chart type', () => {
  expect(missingTypes(FAMILIES.flatMap((family) => family.types))).toEqual([])
})

const SIZE = { width: 400, height: 200 }

function configOf(type: ChartType<object>, state: unknown, options: Record<string, unknown>) {
  const record = !!state && typeof state === 'object' && !Array.isArray(state)
  const { bubbles, ...rest } = (record ? state : {}) as Record<string, unknown>
  return {
    type,
    id: 'tc',
    locale: 'en-US',
    animate: true,
    ...SIZE,
    ...options,
    ...(bubbles ? { bubbles: true } : {}),
    data: record ? rest : state,
  } as ChartConfig<object>
}

/** The DOM as it should look, without what only differs between a fresh mount and an update. */
const normalize = (html: string) =>
  html
    .replace(/ data-resizing=""/g, '')
    .replace(/ tc-entering/g, '')
    .replace(/ style=""/g, '')

/** Every list of values or points in a state, by length, with gaps marked. */
const shape = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(shape).join()}]`
    : v === null
      ? 'gap'
      : v && typeof v === 'object'
        ? `{${Object.entries(v)
            .map(([k, x]) => `${k}:${shape(x)}`)
            .join()}}`
        : typeof v === 'number' || typeof v === 'string'
          ? '0'
          : String(v)

/** Two states whose marks should morph: the same lengths and gaps, values aside. */
const comparable = (a: unknown, b: unknown): boolean => {
  const sa = shape(a)
  return !sa.includes('gap') && sa === shape(b)
}

/** The commands of a path (its shape, without the numbers). */
const commands = (d: string | null) => (d ?? '').replace(/[^a-zA-Z]/g, '')

function mount(config: ChartConfig<object>): [HTMLElement, Chart<object>] {
  const el = document.createElement('div')
  document.body.append(el)
  const chart = new Chart(el, config)
  flush()
  return [el, chart]
}

test('updates between extreme states render what a fresh chart would, and keep path shapes', () => {
  const mismatches = new Map<string, string>()
  const jumps = new Map<string, string[]>()
  let pairs = 0
  for (const family of FAMILIES) {
    const optionSets = Object.entries(family.options ?? { plain: {} })
    for (const typeA of family.types) {
      for (const typeB of family.types) {
        for (const [nameA, stateA] of Object.entries(family.states)) {
          for (const [nameB, stateB] of Object.entries(family.states)) {
            for (const [optA, a] of optionSets) {
              for (const [optB, b] of optionSets) {
                // Keep the matrix small: switch options or types only between regular states.
                if (
                  (optA !== optB || typeA !== typeB) &&
                  (nameA !== 'regular' || nameB !== 'regular')
                )
                  continue
                pairs++
                const step = `${typeA.name}/${optA} ${nameA} → ${typeB.name}/${optB} ${nameB}`
                const from = configOf(typeA, stateA, a)
                const to = configOf(typeB, stateB, b)
                const [el, chart] = mount(from)
                // Paths on screen before, by node.
                const before = new Map<Element, string>()
                for (const p of el.querySelectorAll('path'))
                  before.set(p, commands(p.getAttribute('d')))
                chart.update(to)
                flush()
                // update() merges: the new state is the old config with the new options.
                const [fresh, other] = mount({ ...from, ...to })
                const got = normalize(el.innerHTML)
                const want = normalize(fresh.innerHTML)
                if (got !== want) {
                  let i = 0
                  while (got[i] === want[i]) i++
                  mismatches.set(
                    step,
                    `…${got.slice(Math.max(0, i - 60), i + 80)}\n      vs …${want.slice(Math.max(0, i - 60), i + 80)}`,
                  )
                }
                // Paths keep their commands when the data keeps its shape (same length, no gaps).
                for (const [p, cmd] of comparable(stateA, stateB) ? before : []) {
                  if (!p.isConnected) continue
                  const now = commands(p.getAttribute('d'))
                  if (now !== cmd) {
                    const cls = p.getAttribute('class')?.split(' ')[0] ?? 'path'
                    const key = `${typeA.name}→${typeB.name} ${cls}`
                    const list = jumps.get(key) ?? []
                    list.push(`${optA} ${nameA} → ${optB} ${nameB}`)
                    jumps.set(key, list)
                  }
                }
                chart.destroy()
                other.destroy()
                el.remove()
                fresh.remove()
              }
            }
          }
        }
      }
    }
  }
  const report = [
    ...[...mismatches].map(([step, diff]) => `DIFFERS ${step}\n      ${diff}`),
    ...[...jumps].map(
      ([key, steps]) =>
        `JUMPS ${key} (${steps.length}×): ${[...new Set(steps)].slice(0, 6).join('; ')}`,
    ),
  ]
  expect(report.join('\n'), `${pairs} transitions`).toBe('')
}, 300_000)
