import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import '../log.ts'
import { candlestick } from '../candlestick.ts'
import { findByClass } from '../test-utils.ts'
import type { CandlestickOptions } from './candlestick.ts'

const size = { width: 400, height: 200 }
const base: ChartConfig<CandlestickOptions> = {
  type: candlestick,
  id: 'c',
  locale: 'en-US',
  data: [
    { x: 'Mon', open: 100, high: 120, low: 90, close: 110 },
    { x: 'Tue', open: 110, high: 115, low: 95, close: 100 },
    { x: 'Wed', open: 100, high: 100, low: 100, close: 100 },
  ],
}

const render = (config: Partial<ChartConfig<CandlestickOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'c')

function interactionOf(config: Partial<ChartConfig<CandlestickOptions>> = {}): Interaction {
  let found: Interaction | undefined
  buildChart({ ...base, ...config }, size, 'c', (i) => {
    found = i
  })
  if (!found) throw new Error('no interaction')
  return found
}

const num = (v: unknown) => Number(v)

describe('candlestick', () => {
  test('draws a keyed wick and body per period, colored by direction', () => {
    const node = render()
    expect(node.attrs.class).toBe('tc-chart tc-chart-candlestick')
    const candles = findByClass(node, 'tc-candle')
    expect(candles.map((c) => c.key)).toEqual(['Mon', 'Tue', 'Wed'])
    expect(candles.map((c) => c.attrs.class)).toEqual([
      'tc-candle tc-candle-up',
      'tc-candle tc-candle-down',
      'tc-candle tc-candle-up',
    ])
  })

  test('the wick spans low to high and the body open to close', () => {
    const node = render()
    const [wick] = findByClass(node, 'tc-candle-wick')
    const [body] = findByClass(node, 'tc-candle-body')
    const [, x, top, bottom] = String(wick?.attrs.d).match(/^M([\d.]+),([\d.]+)V([\d.]+)$/) ?? []
    // Higher prices are further up: the wick runs from high (top) down to low.
    expect(num(top)).toBeLessThan(num(body?.attrs.y))
    expect(num(bottom)).toBeGreaterThan(num(body?.attrs.y) + num(body?.attrs.height))
    // The wick runs through the middle of the body.
    expect(num(x)).toBeCloseTo(num(body?.attrs.x) + num(body?.attrs.width) / 2, 1)
    expect(num(body?.attrs.width)).toBeLessThanOrEqual(16)
  })

  test('a flat period keeps a 1px body', () => {
    const body = findByClass(render(), 'tc-candle-body')[2]
    expect(num(body?.attrs.height)).toBe(1)
  })

  test('the value axis covers every low and high', () => {
    const ticks = findByClass(findByClass(render(), 'tc-axis-y')[0] ?? render(), 'tc-tick-label')
      .map((t) => Number(t.children.join('')))
      .filter(Number.isFinite)
    expect(Math.min(...ticks)).toBeLessThanOrEqual(90)
    expect(Math.max(...ticks)).toBeGreaterThanOrEqual(120)
  })

  test('the tooltip lists open, high, low and close in the candle color', () => {
    const hit = interactionOf().hitIndex(1)
    expect(hit?.title).toBe('Tue')
    expect(hit?.items.map((i) => [i.name, i.text])).toEqual([
      ['Open', '110'],
      ['High', '115'],
      ['Low', '95'],
      ['Close', '100'],
    ])
    expect(new Set(hit?.items.map((i) => i.color))).toEqual(
      new Set(['var(--tc-negative-color,var(--tc-color-8))']),
    )
  })

  test('skips candles that cannot be placed and never renders NaN', () => {
    const svg = chartToString(
      {
        ...base,
        data: [
          { x: 'a', open: Number.NaN, high: 2, low: 1, close: 1 },
          { x: 'b', open: -1, high: 3, low: -2, close: 2 },
          { x: 'c', open: 1, high: 3, low: 1, close: 2 },
        ],
        y: { scale: 'log' },
      },
      size,
    )
    expect(svg).not.toContain('NaN')
    expect(svg.match(/class="tc-candle-body"/g)).toHaveLength(1)
    expect(chartToString({ ...base, data: [] }, size)).not.toContain('NaN')
  })

  test('formats dates with a time axis and lists them in the table', () => {
    const data = [
      { x: Date.UTC(2026, 0, 1), open: 1, high: 2, low: 0.5, close: 1.5 },
      { x: Date.UTC(2026, 1, 1), open: 1.5, high: 2, low: 1, close: 1.2 },
    ]
    const hit = interactionOf({ data, x: { type: 'time', utc: true } }).hitIndex(0)
    expect(hit?.title).toBe('Jan 1, 2026')
    const table = candlestick.table?.(
      { data },
      {
        width: 400,
        height: 200,
        fontSize: 12,
        locale: 'en-US',
        id: 'c',
        onHitTest() {},
        hidden: new Set(),
      },
      100,
    )
    expect(table?.columns).toEqual(['', 'Open', 'High', 'Low', 'Close'])
  })
})
