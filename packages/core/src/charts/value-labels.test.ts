import { describe, expect, test } from 'vitest'
import { type ChartConfig, chartToString } from '../chart.ts'
import { features } from '../features.ts'
import '../value-labels.ts'
import { bar } from './bar.ts'
import { heatmap } from './heatmap.ts'
import { line } from './line.ts'
import { donut, pie } from './pie.ts'
import { scatter } from './scatter.ts'

const size = { width: 480, height: 240 }
const labels = ['Q1', 'Q2', 'Q3', 'Q4']
const series = (n: number, f = (s: number, i: number) => 20 + ((s * 7 + i * 13) % 30)) =>
  Array.from({ length: n }, (_, s) => ({ name: `S${s}`, values: labels.map((_, i) => f(s, i)) }))

interface Label {
  text: string
  x: number
  y: number
}

/** The value labels of an svg string, with their positions. */
function valueLabels(svg: string): Label[] {
  return [
    ...svg.matchAll(
      /class="tc-value-label[^"]*" style="transform:translate\(([-\d.]+)px,([-\d.]+)px\)"[^>]*>([^<]*)</g,
    ),
  ].map(([, x, y, text]) => ({ text: text as string, x: Number(x), y: Number(y) }))
}

const render = (config: Record<string, unknown>) =>
  chartToString(
    { locale: 'en-US', id: 'v', valueLabels: true, ...config } as ChartConfig<object>,
    size,
  )

describe('value labels', () => {
  test('bars get their value at their end, negative ones below it', () => {
    const svg = render({
      type: bar,
      data: { labels, series: series(1, (_, i) => (i === 2 ? -15 : 10 + i * 10)) },
      y: { format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } },
    })
    const found = valueLabels(svg)
    expect(found.map((l) => l.text)).toEqual(['$10', '$20', '-$15', '$40'])
    // Bars start at the baseline (zero): positive labels sit above it, the negative one below.
    const baseline = Number(/class="tc-bar" d="M[\d.]+,([\d.]+)/.exec(svg)?.[1])
    const [first, , negative] = found as Label[]
    expect(first?.y).toBeLessThan(baseline)
    expect(negative?.y).toBeGreaterThan(baseline)
  })

  test('stacked segments get their value inside, when it fits', () => {
    const svg = render({
      type: bar,
      stacked: true,
      data: { labels, series: [...series(2), { name: 'tiny', values: [0.5, 0.5, 0.5, 0.5] }] },
    })
    const found = valueLabels(svg)
    // Two segments per column fit their value; the tiny ones are left out.
    expect(found).toHaveLength(8)
    expect(svg.match(/tc-value-label-inside/g)).toHaveLength(8)
  })

  test('lines label their last point by default, every point with points: all', () => {
    expect(valueLabels(render({ type: line, data: { labels, series: series(2) } }))).toHaveLength(2)
    expect(
      valueLabels(
        render({ type: line, data: { labels, series: series(1) }, valueLabels: { points: 'all' } }),
      ),
    ).toHaveLength(4)
  })

  test('slices show their share, where it fits', () => {
    const data = [
      { name: 'A', value: 70 },
      { name: 'B', value: 29 },
      { name: 'C', value: 1 },
    ]
    for (const type of [pie, donut]) {
      expect(valueLabels(render({ type, data })).map((l) => l.text)).toEqual(['70%', '29%'])
    }
  })

  test('heatmap cells and scatter points take their own formats', () => {
    const cells = valueLabels(
      render({ type: heatmap, data: { labels, series: series(2) }, format: { style: 'percent' } }),
    )
    expect(cells).toHaveLength(8)
    expect(cells[0]?.text).toBe('2,000%')
    const points = valueLabels(
      render({
        type: scatter,
        data: {
          series: [
            {
              name: 'A',
              points: [
                { x: 1, y: 3 },
                { x: 4, y: 8 },
              ],
            },
          ],
        },
        valueLabels: { points: 'all' },
      }),
    )
    expect(points.map((l) => l.text)).toEqual(['3', '8'])
  })

  test('labels never overlap, stay in the chart and keep off other marks', () => {
    let seed = 7
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    for (let n = 0; n < 120; n++) {
      const count = 1 + Math.floor(rnd() * 4)
      const cats = 2 + Math.floor(rnd() * 10)
      const data = {
        labels: Array.from({ length: cats }, (_, i) => `C${i}`),
        series: Array.from({ length: count }, (_, s) => ({
          name: `S${s}`,
          values: Array.from({ length: cats }, () => Math.round((rnd() - 0.2) * 1000)),
        })),
      }
      const type = [bar, line][n % 2]
      const options = {
        stacked: rnd() < 0.3,
        orientation: rnd() < 0.3 ? 'horizontal' : 'vertical',
        valueLabels: { points: 'all' },
      }
      const svg = render({ type, data, ...options })
      const found = valueLabels(svg)
      const boxes = found.map((l) => ({ ...l, w: l.text.length * 7, h: 12 }))
      boxes.forEach((a, i) => {
        expect(a.x, `${n}: ${a.text} inside`).toBeGreaterThanOrEqual(0)
        expect(a.x, `${n}: ${a.text} inside`).toBeLessThanOrEqual(size.width)
        expect(a.y).toBeGreaterThanOrEqual(0)
        expect(a.y).toBeLessThanOrEqual(size.height)
        for (const b of boxes.slice(i + 1)) {
          const apart = Math.abs(a.x - b.x) >= (a.w + b.w) / 2 - 6 || Math.abs(a.y - b.y) >= 11
          expect(apart, `${n}: ${a.text} over ${b.text}`).toBe(true)
        }
      })
    }
  })

  test('a chart type of your own says how its values are labelled', () => {
    // A heatmap under another name: nothing depends on what a type is called.
    const grid = { ...heatmap, name: 'grid' }
    const data = { labels: ['a', 'b'], series: [{ name: 'r', values: [1200, 3400] }] }
    const format = { minimumFractionDigits: 1 }
    const texts = (type: object) => valueLabels(render({ type, data, format })).map((l) => l.text)
    expect(texts(grid)).toEqual(['1,200.0', '3,400.0'])
    expect(texts(grid)).toEqual(texts(heatmap))
    // Without the word of the type, a label shows what the tooltip does.
    const { valueLabels: _, ...plain } = grid
    expect(texts(plain)).toEqual(['1,200.0', '3,400.0'])
    expect(texts({ ...plain, valueLabels: { marks: 'cell', format: () => ({}) } })).toEqual([
      '1,200',
      '3,400',
    ])
  })

  test('off by default and with false; on the core, only with its import', () => {
    const data = { labels, series: series(2) }
    expect(render({ type: bar, data, valueLabels: false })).not.toContain('tc-value-label')
    expect(chartToString({ type: bar, data } as ChartConfig<object>, size)).not.toContain(
      'tc-value-label',
    )
    const saved = features.post
    delete features.post
    try {
      expect(render({ type: bar, data })).not.toContain('tc-value-label')
    } finally {
      features.post = saved
    }
  })
})
