import { bar, candlestick } from '@tabler/charts'
import { chart, el } from '../dom.ts'
import { C, definePage } from '../page.ts'
import { seeded } from '../random.ts'

// Sixty trading days of a made-up share: the candles above, the volume
// below, in one sync group so both follow the same day.
const random = seeded(17)
const DAYS: number[] = []
for (let day = Date.UTC(2026, 2, 2); DAYS.length < 60; day += 86_400_000) {
  const weekday = new Date(day).getUTCDay()
  if (weekday !== 0 && weekday !== 6) DAYS.push(day)
}
let price = 84
const candles = DAYS.map((x, i) => {
  const open = price
  // A slow climb, a sell-off after results on day 31, then a recovery.
  const trend = i === 31 ? -7.5 : i > 31 && i < 36 ? -0.9 : 0.28
  const close = Math.max(60, open + trend + (random() - 0.5) * 3.4)
  price = close
  return {
    x,
    open: Math.round(open * 100) / 100,
    close: Math.round(close * 100) / 100,
    high: Math.round((Math.max(open, close) + random() * 1.6) * 100) / 100,
    low: Math.round((Math.min(open, close) - random() * 1.6) * 100) / 100,
  }
})
const volume = candles.map(
  (candle, i) =>
    Math.round(
      (1.1 + Math.abs(candle.close - candle.open) * 0.9 + random() * 0.8 + (i === 31 ? 4 : 0)) *
        100,
    ) / 100,
)

export default definePage({
  title: 'Price and volume',
  subtitle: 'Daily candles with the volume below, sharing one cursor',
  width: 720,
  hover: { x: 0.58, y: 0.35 },
  render(body) {
    body.append(el('div', 'stack-title', 'Share price, dollars'))
    chart(body, {
      type: candlestick,
      title: 'Share price',
      data: candles,
      sync: 'trading',
      x: { type: 'time', utc: true, show: false },
      y: { format: { style: 'currency', currency: 'USD', maximumFractionDigits: 2 } },
      annotations: [
        { y: [80, 84], label: 'Support', position: 'start' },
        { x: DAYS[31] as number, label: 'Results', color: C.coral },
      ],
      aspectRatio: 2.9,
    })
    body.append(el('div', 'stack-title', 'Volume, millions of shares'))
    chart(body, {
      type: bar,
      title: 'Volume',
      data: {
        labels: DAYS,
        series: [{ name: 'Volume', values: volume, color: C.slate }],
      },
      sync: 'trading',
      x: {
        format: (label: string | number | Date) =>
          new Date(label).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          }),
      },
      y: { ticks: 3, format: (value: number) => `${value}M` },
      legend: false,
      gap: 1,
      radius: 1,
      aspectRatio: 6,
    })
  },
})
