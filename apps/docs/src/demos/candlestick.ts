import { type Candle, Chart, candlestick } from '@tabler/charts'
import type { Demo } from '../demo.ts'

/** A random walk of daily candles ending today. */
function randomCandles(days: number): Candle[] {
  const start = Date.UTC(2026, 8, 30) - (days - 1) * 86_400_000
  let price = 96_000
  return Array.from({ length: days }, (_, i) => {
    const open = price
    const close = Math.max(1000, open + (Math.random() - 0.48) * 4000)
    const high = Math.max(open, close) + Math.random() * 2000
    const low = Math.min(open, close) - Math.random() * 2000
    price = close
    const round = (v: number) => Math.round(v * 100) / 100
    return {
      x: start + i * 86_400_000,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
    }
  })
}

export const candlestickDemo: Demo = {
  id: 'candlestick',
  title: 'Candlestick',
  description:
    'Open, high, low and close per period: a wick from low to high and a body from open to close, green when the period closed higher and red when lower. Shares the axes, grid, time formatting, tooltip and table with the other cartesian charts.',
  mount(el, controls) {
    let days = 30
    const chart = new Chart(el, {
      type: candlestick,
      data: randomCandles(days),
      x: { type: 'time', utc: true },
      y: { format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } },
      locale: 'en-US',
      aspectRatio: 2.5,
      title: 'BTC/USD, daily',
    })

    controls.button('Shuffle data', () => chart.setData(randomCandles(days)))
    controls.select('Days', ['30', '60', '120'] as const, '30', (value) => {
      days = Number(value)
      chart.setData(randomCandles(days))
    })
    controls.range('Max width', { min: 2, max: 32, step: 1, value: 16 }, (maxCandleWidth) =>
      chart.update({ maxCandleWidth }),
    )
  },
}
