// @vitest-environment happy-dom
import { expect, test } from 'vitest'
import type { ChartConfig, ChartType } from './chart.ts'
import { Chart } from './chart-default.ts'
import { area } from './charts/area.ts'
import { bar } from './charts/bar.ts'
import { candlestick } from './charts/candlestick.ts'
import { gauge } from './charts/gauge.ts'
import { heatmap } from './charts/heatmap.ts'
import { line } from './charts/line.ts'
import { donut, pie } from './charts/pie.ts'
import { radar } from './charts/radar.ts'
import { scatter } from './charts/scatter.ts'
import { sparkline } from './charts/sparkline.ts'
import { chartToString } from './core.ts'
import './annotations.ts'
import './decimate.ts'
import './line.ts'
import './log.ts'
import { flush } from './scheduler.ts'
import './time.ts'
import './value-labels.ts'

/**
 * Bad input: data from users, APIs and JSON attributes is often not what the
 * types say. Every type gets junk in every slot (null, strings, NaN,
 * Infinity, objects, dates…) and broken structure (missing or extra
 * series, mismatched lengths, duplicates). A chart must never throw and
 * never write NaN, Infinity or undefined into the SVG; it draws what it can.
 * Seeded; FUZZ_ITERATIONS and FUZZ_SEED dig deeper locally.
 */
const ITERATIONS = Number(process.env.FUZZ_ITERATIONS ?? 300)
let seed = Number(process.env.FUZZ_SEED ?? 20261004)
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)] as T
const chance = (p: number) => rnd() < p

/** Values that are not finite numbers, or numbers at the edge. */
const JUNK: (() => unknown)[] = [
  () => null,
  () => undefined,
  () => Number.NaN,
  () => Number.POSITIVE_INFINITY,
  () => Number.NEGATIVE_INFINITY,
  () => -0,
  () => '42',
  () => 'abc',
  () => '',
  () => true,
  () => ({}),
  () => [],
  () => [3],
  () => 1e308,
  () => -1e308,
  () => 5e-324,
  () => new Date(0),
  () => Number.MAX_SAFE_INTEGER,
]
const junk = () => pick(JUNK)()
const num = () => (chance(0.35) ? junk() : Math.round((rnd() - 0.4) * 1000) / 10)
const text = () => (chance(0.3) ? junk() : pick(['A', 'B', 'A', 'Long name '.repeat(5), '']))
const list = <T>(make: () => T): unknown =>
  chance(0.1) ? junk() : Array.from({ length: pick([0, 1, 2, 5, 12]) }, make)
const color = () => (chance(0.5) ? undefined : chance(0.5) ? junk() : pick(['red', '#0f0', 'nope']))

const series = (): unknown =>
  chance(0.08)
    ? junk()
    : {
        name: text(),
        values: list(num),
        color: color(),
        ...(chance(0.1) ? { hidden: junk() } : {}),
      }
const seriesData = (): unknown =>
  chance(0.08) ? junk() : { labels: chance(0.15) ? junk() : list(text), series: list(series) }

const TYPES: [string, ChartType<object>, () => unknown][] = [
  ['line', line as ChartType<object>, seriesData],
  ['area', area as ChartType<object>, seriesData],
  ['bar', bar as ChartType<object>, seriesData],
  ['heatmap', heatmap as ChartType<object>, seriesData],
  ['radar', radar as ChartType<object>, seriesData],
  [
    'pie',
    pie as ChartType<object>,
    () => list(() => (chance(0.1) ? junk() : { name: text(), value: num(), color: color() })),
  ],
  [
    'donut',
    donut as ChartType<object>,
    () => list(() => (chance(0.1) ? junk() : { name: text(), value: num() })),
  ],
  [
    'gauge',
    gauge as ChartType<object>,
    () => {
      const one = () =>
        chance(0.1)
          ? junk()
          : { name: text(), value: num(), max: num(), min: chance(0.3) ? num() : undefined }
      return chance(0.3) ? list(one) : one()
    },
  ],
  [
    'scatter',
    scatter as ChartType<object>,
    () =>
      chance(0.08)
        ? junk()
        : {
            series: list(() =>
              chance(0.08)
                ? junk()
                : {
                    name: text(),
                    points: list(() =>
                      chance(0.1)
                        ? junk()
                        : { x: num(), y: num(), r: chance(0.3) ? num() : undefined },
                    ),
                  },
            ),
          },
  ],
  [
    'candlestick',
    candlestick as ChartType<object>,
    () =>
      list(() =>
        chance(0.1)
          ? junk()
          : {
              x: chance(0.3) ? junk() : pick(['2026-01-01', '2026-01-02', 'not a date']),
              open: num(),
              high: num(),
              low: num(),
              close: num(),
            },
      ),
  ],
  ['sparkline', sparkline as ChartType<object>, () => list(num)],
]

/** Options that change how data is read. */
const options = (name: string): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  if (name === 'bar' || name === 'line' || name === 'area') {
    if (chance(0.3)) out.stacked = pick([true, 'percent'])
    if (chance(0.2) && name === 'bar') out.orientation = 'horizontal'
  }
  if (chance(0.15)) out.y = { scale: 'log' }
  if (chance(0.25)) out.valueLabels = pick([true, { points: 'all' }, { format: junk() }])
  // Junk in the options that bound the axes, and in annotations.
  if (chance(0.15)) out.y = { ...(out.y as object), min: junk(), max: num(), ticks: junk() }
  if (chance(0.15)) {
    out.annotations = list(() =>
      chance(0.1)
        ? junk()
        : {
            y: chance(0.5) ? num() : [num(), num()],
            x: chance(0.5) ? text() : undefined,
            label: text(),
            color: color(),
          },
    )
  }
  if (chance(0.15) && name !== 'candlestick') out.x = { type: 'time' }
  return out
}

const BAD = /NaN|Infinity|undefined|\[object/

function badAttributes(svg: string): string[] {
  const out: string[] = []
  for (const [, name, value] of svg.matchAll(/ ([\w:-]+)="([^"]*)"/g)) {
    if (name !== 'aria-label' && BAD.test(value as string))
      out.push(`${name}="${(value as string).slice(0, 50)}"`)
  }
  return out
}

test('junk data never throws nor writes NaN into the svg', () => {
  const failures = new Map<string, string>()
  // With an update to other junk and a hover.
  const el = document.createElement('div')
  document.body.append(el)
  const note = (key: string, detail: string) => {
    if (!failures.has(key)) failures.set(key, detail)
  }
  for (let i = 0; i < ITERATIONS; i++) {
    for (const [name, type, make] of TYPES) {
      const data = make()
      const config = { type, data, locale: 'en-US', ...options(name) } as ChartConfig<object>
      const show = (value: unknown) =>
        JSON.stringify(value, (_, v) =>
          typeof v === 'number' && !Number.isFinite(v) ? String(v) : v,
        )?.slice(0, 300)
      const { type: _, ...rest } = config as Record<string, unknown>
      let shown = show(rest)
      let svg = ''
      try {
        svg = chartToString(config, { width: 300, height: 150 })
      } catch (error) {
        note(`${name} ssr throws ${(error as Error).message}`, shown ?? String(data))
        continue
      }
      for (const attr of badAttributes(svg))
        note(`${name} ${attr.split('=')[0]}`, `${attr} ← ${shown}`)
      // The browser path, every fourth time: happy-dom holds on to memory of
      // destroyed charts with a legend or table (Chromium does not, measured),
      // which adds up to gigabytes over thousands of charts.
      if (i % 4) continue
      el.textContent = ''
      try {
        const chart = new Chart(el, { ...config, width: 300, height: 150 })
        flush()
        const next = make()
        shown += ` → update ${show(next)}`
        chart.update({ data: next } as Partial<ChartConfig<object>>)
        flush()
        chart.highlightAt?.(150, 75)
        flush()
        for (const attr of badAttributes(el.innerHTML))
          note(`${name} dom ${attr.split('=')[0]}`, `${attr} ← ${shown}`)
        // Text: labels, the tooltip, the legend and the table.
        const words = el.textContent?.match(/NaN|Infinity|undefined|null|\[object \w+\]/)
        if (words)
          note(
            `${name} text ${words[0]}`,
            `…${el.textContent?.slice(Math.max(0, (words.index ?? 0) - 40), (words.index ?? 0) + 40)}… ← ${shown}`,
          )
        chart.destroy()
      } catch (error) {
        const at = (error as Error).stack
          ?.split('\n')
          .find((l) => l.includes('/src/'))
          ?.trim()
        note(`${name} dom throws ${(error as Error).message}`, `${at}\n    ${shown}`)
      }
    }
  }
  const report = [...failures].map(([key, detail]) => `${key}\n    ${detail}`)
  expect(report.join('\n'), `${failures.size} kinds of failure`).toBe('')
}, 300_000)
